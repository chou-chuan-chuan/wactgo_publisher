import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { handleRequest } from "../src/index.js";

const schema = readFileSync(new URL("../schema.sql", import.meta.url), "utf8");
const origin = "http://localhost:8000";

class D1StatementAdapter {
  constructor(database, sql, parameters = []) {
    this.database = database;
    this.sql = sql;
    this.parameters = parameters;
  }

  bind(...parameters) {
    return new D1StatementAdapter(this.database, this.sql, parameters);
  }

  async first() {
    return this.database.prepare(this.sql).get(...this.parameters) || null;
  }

  async all() {
    return { results: this.database.prepare(this.sql).all(...this.parameters) };
  }

  async run() {
    const result = this.database.prepare(this.sql).run(...this.parameters);
    return { success: true, meta: { changes: Number(result.changes) } };
  }
}

function createEnvironment() {
  const database = new DatabaseSync(":memory:");
  database.exec(schema);
  return {
    database,
    env: {
      DB: {
        prepare(sql) {
          return new D1StatementAdapter(database, sql);
        }
      }
    }
  };
}

function get(path) {
  return new Request(`https://leaderboard.test${path}`, { headers: { Origin: origin } });
}

function post(body, requestOrigin = origin) {
  return new Request("https://leaderboard.test/api/scores", {
    method: "POST",
    headers: { Origin: requestOrigin, "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

async function jsonResponse(request, env) {
  const response = await handleRequest(request, env);
  return { response, body: await response.json() };
}

test("GET returns an empty leaderboard", async () => {
  const { env, database } = createEnvironment();
  const { response, body } = await jsonResponse(get("/api/leaderboard?game=snake&limit=10"), env);
  assert.equal(response.status, 200);
  assert.deepEqual(body, { game: "snake", scores: [] });
  database.close();
});

test("POST stores only a player's higher personal best per game", async () => {
  const { env, database } = createEnvironment();
  const first = await jsonResponse(post({ game: "snake", playerId: "player-1", name: "Hannah 1", score: 8 }), env);
  assert.deepEqual(first.body, { success: true, personalBest: 8, isNewBest: true, rank: 1 });

  const higher = await jsonResponse(post({ game: "snake", playerId: "player-1", name: "Hannah 1", score: 15 }), env);
  assert.equal(higher.body.personalBest, 15);
  assert.equal(higher.body.isNewBest, true);

  const lower = await jsonResponse(post({ game: "snake", playerId: "player-1", name: "Changed Name", score: 10 }), env);
  assert.equal(lower.body.personalBest, 15);
  assert.equal(lower.body.isNewBest, false);
  assert.equal(database.prepare("SELECT display_name FROM scores").get().display_name, "Hannah 1");

  const tetris = await jsonResponse(post({ game: "tetris", playerId: "player-1", name: "Hannah 1", score: 100 }), env);
  assert.equal(tetris.body.personalBest, 100);
  assert.equal(database.prepare("SELECT COUNT(*) AS count FROM scores").get().count, 2);
  database.close();
});

test("GET sorts descending, shares tie ranks, and respects limit", async () => {
  const { env, database } = createEnvironment();
  const entries = [
    ["a", "Hannah", 100],
    ["b", "Samuel", 80],
    ["c", "Serena", 80],
    ["d", "Charlie", 60]
  ];
  for (const [playerId, name, score] of entries) {
    await handleRequest(post({ game: "snake", playerId, name, score }), env);
  }

  const { body } = await jsonResponse(get("/api/leaderboard?game=snake&limit=3"), env);
  assert.deepEqual(body.scores.map(row => [row.rank, row.name, row.score]), [
    [1, "Hannah", 100],
    [2, "Samuel", 80],
    [2, "Serena", 80]
  ]);
  database.close();
});

test("GET rejects invalid game and invalid limits", async () => {
  const { env, database } = createEnvironment();
  assert.equal((await handleRequest(get("/api/leaderboard?game=chess"), env)).status, 400);
  assert.equal((await handleRequest(get("/api/leaderboard?game=snake&limit=0"), env)).status, 400);
  assert.equal((await handleRequest(get("/api/leaderboard?game=snake&limit=abc"), env)).status, 400);
  database.close();
});

test("POST validates all user-controlled fields", async () => {
  const { env, database } = createEnvironment();
  const valid = { game: "snake", playerId: "player-1", name: "玩家123", score: 5 };
  const invalidBodies = [
    { ...valid, game: "chess" },
    { ...valid, playerId: "" },
    { ...valid, playerId: undefined },
    { ...valid, name: "   " },
    { ...valid, name: "a".repeat(21) },
    { ...valid, name: "bad\u0000name" },
    { ...valid, score: -1 },
    { ...valid, score: 1.5 },
    { ...valid, score: "5" },
    { ...valid, score: Number.NaN },
    { ...valid, score: 1_000_001 }
  ];

  for (const body of invalidBodies) {
    const response = await handleRequest(post(body), env);
    assert.equal(response.status, 400, JSON.stringify(body));
  }
  database.close();
});

test("CORS allows configured origins and rejects other browser origins", async () => {
  const { env, database } = createEnvironment();
  const allowed = await handleRequest(get("/api/leaderboard?game=snake"), env);
  assert.equal(allowed.headers.get("Access-Control-Allow-Origin"), origin);

  const rejected = await handleRequest(post({ game: "snake", playerId: "x", name: "X", score: 1 }, "https://evil.example"), env);
  assert.equal(rejected.status, 403);
  assert.equal(rejected.headers.get("Access-Control-Allow-Origin"), null);
  database.close();
});

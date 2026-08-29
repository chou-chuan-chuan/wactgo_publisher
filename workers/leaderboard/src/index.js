const ALLOWED_ORIGINS = new Set([
  "https://chou-chuan-chuan.github.io",
  "http://localhost:8000",
  "http://127.0.0.1:8000"
]);
const VALID_GAMES = new Set(["snake", "tetris"]);
const MAX_SCORES = Object.freeze({ snake: 1_000_000, tetris: 100_000_000 });

function corsHeaders(origin) {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    Vary: "Origin"
  };
  if (origin && ALLOWED_ORIGINS.has(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

function json(payload, status, origin) {
  return new Response(JSON.stringify(payload), { status, headers: corsHeaders(origin) });
}

function validateOrigin(request) {
  const origin = request.headers.get("Origin");
  return { origin, allowed: !origin || ALLOWED_ORIGINS.has(origin) };
}

function validateGame(game) {
  return typeof game === "string" && VALID_GAMES.has(game);
}

function validateName(value) {
  if (typeof value !== "string") return null;
  const name = value.trim();
  const length = Array.from(name).length;
  if (length < 1 || length > 20 || /[\u0000-\u001f\u007f-\u009f]/u.test(name)) return null;
  return name;
}

function validatePlayerId(value) {
  if (typeof value !== "string") return null;
  const playerId = value.trim();
  if (playerId.length < 1 || playerId.length > 100) return null;
  if (/[\u0000-\u001f\u007f-\u009f]/u.test(playerId)) return null;
  return playerId;
}

async function getLeaderboard(request, env, url, origin) {
  const game = url.searchParams.get("game");
  const rawLimit = url.searchParams.get("limit") || "10";
  if (!validateGame(game)) return json({ error: "Invalid game." }, 400, origin);
  if (!/^\d+$/.test(rawLimit)) return json({ error: "Invalid limit." }, 400, origin);

  const limit = Number(rawLimit);
  if (limit < 1 || limit > 50) return json({ error: "Limit must be between 1 and 50." }, 400, origin);

  const result = await env.DB.prepare(`
    SELECT
      1 + (
        SELECT COUNT(*)
        FROM scores AS higher
        WHERE higher.game = current.game AND higher.score > current.score
      ) AS rank,
      current.display_name AS name,
      current.score AS score
    FROM scores AS current
    WHERE current.game = ?
    ORDER BY current.score DESC, current.updated_at ASC, current.id ASC
    LIMIT ?
  `).bind(game, limit).all();

  return json({ game, scores: result.results || [] }, 200, origin);
}

async function postScore(request, env, origin) {
  const contentLength = Number(request.headers.get("Content-Length") || 0);
  if (contentLength > 4096) return json({ error: "Request body is too large." }, 413, origin);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body." }, 400, origin);
  }

  const game = body?.game;
  const playerId = validatePlayerId(body?.playerId);
  const name = validateName(body?.name);
  const score = body?.score;

  if (!validateGame(game)) return json({ error: "Invalid game." }, 400, origin);
  if (!playerId) return json({ error: "Invalid playerId." }, 400, origin);
  if (!name) return json({ error: "Name must contain 1 to 20 characters without control characters." }, 400, origin);
  if (!Number.isInteger(score) || score < 0 || score > MAX_SCORES[game]) {
    return json({ error: "Invalid score." }, 400, origin);
  }

  const previous = await env.DB.prepare(
    "SELECT score FROM scores WHERE game = ? AND player_id = ?"
  ).bind(game, playerId).first();

  await env.DB.prepare(`
    INSERT INTO scores (game, player_id, display_name, score)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(game, player_id) DO UPDATE SET
      display_name = excluded.display_name,
      score = excluded.score,
      updated_at = CURRENT_TIMESTAMP
    WHERE excluded.score > scores.score
  `).bind(game, playerId, name, score).run();

  const saved = await env.DB.prepare(
    "SELECT score FROM scores WHERE game = ? AND player_id = ?"
  ).bind(game, playerId).first();
  const rankRow = await env.DB.prepare(
    "SELECT COUNT(*) + 1 AS rank FROM scores WHERE game = ? AND score > ?"
  ).bind(game, saved.score).first();

  return json({
    success: true,
    personalBest: saved.score,
    isNewBest: !previous || score > previous.score,
    rank: rankRow.rank
  }, 200, origin);
}

export async function handleRequest(request, env) {
  const { origin, allowed } = validateOrigin(request);
  if (!allowed) return json({ error: "Origin is not allowed." }, 403, origin);

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        ...corsHeaders(origin),
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "86400"
      }
    });
  }

  const url = new URL(request.url);
  try {
    if (request.method === "GET" && url.pathname === "/api/leaderboard") {
      return await getLeaderboard(request, env, url, origin);
    }
    if (request.method === "POST" && url.pathname === "/api/scores") {
      return await postScore(request, env, origin);
    }
    return json({ error: "Not found." }, 404, origin);
  } catch (error) {
    console.error("Leaderboard request failed", error);
    return json({ error: "Internal server error." }, 500, origin);
  }
}

export default {
  fetch: handleRequest
};

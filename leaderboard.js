(() => {
  "use strict";

  const PLAYER_ID_KEY = "wactgo_player_id";
  const PLAYER_NAME_KEY = "wactgo_player_name";
  const VALID_GAMES = new Set(["snake", "tetris"]);
  const API_BASE_URL = (document.querySelector('meta[name="wactgo-leaderboard-api"]')?.content || "")
    .trim()
    .replace(/\/$/, "");

  const submissionState = {
    snake: { score: 0, submitted: false, submitting: false },
    tetris: { score: 0, submitted: false, submitting: false }
  };
  let activeLeaderboardGame = "snake";

  function readStorage(key) {
    try {
      return localStorage.getItem(key) || "";
    } catch {
      return "";
    }
  }

  function writeStorage(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      // The leaderboard still works for this page when storage is unavailable.
    }
  }

  function createPlayerId() {
    if (crypto.randomUUID) return crypto.randomUUID();
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    return Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
  }

  function getPlayerId() {
    const savedId = readStorage(PLAYER_ID_KEY);
    if (savedId) return savedId;
    const playerId = createPlayerId();
    writeStorage(PLAYER_ID_KEY, playerId);
    return playerId;
  }

  function normalizeName(value) {
    const name = String(value ?? "").trim();
    const length = Array.from(name).length;
    if (length < 1 || length > 20) throw new Error("名字請輸入 1–20 個字元。");
    if (/[\u0000-\u001f\u007f-\u009f]/u.test(name)) throw new Error("名字包含無法使用的字元。");
    return name;
  }

  function assertGame(game) {
    if (!VALID_GAMES.has(game)) throw new Error("不支援的遊戲。");
  }

  async function apiRequest(path, options = {}) {
    if (!API_BASE_URL) throw new Error("Leaderboard API is not configured.");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers: {
          Accept: "application/json",
          ...(options.body ? { "Content-Type": "application/json" } : {}),
          ...options.headers
        },
        signal: controller.signal
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Leaderboard request failed.");
      return payload;
    } finally {
      clearTimeout(timeout);
    }
  }

  async function getLeaderboard(game, limit = 10) {
    assertGame(game);
    return apiRequest(`/api/leaderboard?game=${encodeURIComponent(game)}&limit=${limit}`);
  }

  async function submitScore(game, score, name) {
    assertGame(game);
    const displayName = normalizeName(name);
    if (!Number.isInteger(score) || score < 0) throw new Error("分數格式不正確。");

    return apiRequest("/api/scores", {
      method: "POST",
      body: JSON.stringify({
        game,
        playerId: getPlayerId(),
        name: displayName,
        score
      })
    });
  }

  function getSubmission(game) {
    return document.querySelector(`[data-score-submission="${game}"]`);
  }

  function showScoreSubmission(game, score) {
    assertGame(game);
    const section = getSubmission(game);
    if (!section) return;

    submissionState[game] = { score, submitted: false, submitting: false };
    section.hidden = false;
    section.querySelector("[data-final-score]").textContent = score.toLocaleString("zh-TW");
    const input = section.querySelector('input[name="displayName"]');
    input.value = readStorage(PLAYER_NAME_KEY);
    const button = section.querySelector('button[type="submit"]');
    button.disabled = false;
    button.textContent = "送出分數";
    section.querySelector("[data-submit-status]").textContent = "";
  }

  function hideScoreSubmission(game) {
    const section = getSubmission(game);
    if (!section) return;
    section.hidden = true;
    submissionState[game] = { score: 0, submitted: false, submitting: false };
  }

  function setLeaderboardGame(game) {
    assertGame(game);
    activeLeaderboardGame = game;
    document.querySelectorAll("[data-leaderboard-game]").forEach(button => {
      button.setAttribute("aria-pressed", String(button.dataset.leaderboardGame === game));
    });
  }

  function renderScores(scores) {
    const table = document.getElementById("leaderboardTable");
    const rows = document.getElementById("leaderboardRows");
    const status = document.getElementById("leaderboardState");
    rows.replaceChildren();

    scores.forEach(entry => {
      const row = document.createElement("tr");
      const rank = document.createElement("td");
      const name = document.createElement("td");
      const score = document.createElement("td");

      rank.textContent = String(entry.rank);
      name.textContent = String(entry.name);
      name.className = "leaderboard-player";
      name.title = String(entry.name);
      score.textContent = Number(entry.score).toLocaleString("zh-TW");
      row.append(rank, name, score);
      rows.append(row);
    });

    status.textContent = "";
    table.hidden = false;
  }

  async function loadLeaderboard(game = activeLeaderboardGame) {
    setLeaderboardGame(game);
    const table = document.getElementById("leaderboardTable");
    const status = document.getElementById("leaderboardState");
    if (!table || !status) return;

    table.hidden = true;
    status.textContent = "讀取排行榜中...";
    try {
      const payload = await getLeaderboard(game, 10);
      if (game !== activeLeaderboardGame) return;
      if (!Array.isArray(payload.scores) || payload.scores.length === 0) {
        status.textContent = "還沒有人留下紀錄。\n成為第一個上榜的人吧。";
        return;
      }
      renderScores(payload.scores);
    } catch {
      if (game === activeLeaderboardGame) status.textContent = "暫時無法讀取排行榜。";
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const section = form.closest("[data-score-submission]");
    const game = section.dataset.scoreSubmission;
    const state = submissionState[game];
    const status = section.querySelector("[data-submit-status]");
    const button = form.querySelector('button[type="submit"]');
    if (!state || state.submitting || state.submitted) return;

    let name;
    try {
      name = normalizeName(form.elements.displayName.value);
    } catch (error) {
      status.textContent = error.message;
      form.elements.displayName.focus();
      return;
    }

    state.submitting = true;
    button.disabled = true;
    button.textContent = "正在送出...";
    status.textContent = "正在送出...";

    try {
      const result = await submitScore(game, state.score, name);
      state.submitted = true;
      writeStorage(PLAYER_NAME_KEY, name);
      button.textContent = "已送出";
      if (result.isNewBest) {
        status.textContent = `新的最高紀錄！目前排名第 ${result.rank} 名`;
      } else {
        status.textContent = `已保留你的最高紀錄 ${Number(result.personalBest).toLocaleString("zh-TW")} 分`;
      }
      await loadLeaderboard(game);
    } catch {
      state.submitting = false;
      button.disabled = false;
      button.textContent = "送出分數";
      status.textContent = "目前無法送出分數，請稍後再試。";
    }
  }

  document.querySelectorAll("[data-score-form]").forEach(form => {
    form.addEventListener("submit", handleSubmit);
  });

  document.querySelectorAll("[data-leaderboard-game]").forEach(button => {
    button.addEventListener("click", () => loadLeaderboard(button.dataset.leaderboardGame));
  });

  window.WactgoLeaderboard = Object.freeze({
    getLeaderboard,
    submitScore,
    showScoreSubmission,
    hideScoreSubmission,
    refresh: loadLeaderboard
  });

  loadLeaderboard();
})();

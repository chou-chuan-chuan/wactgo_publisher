CREATE TABLE IF NOT EXISTS scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game TEXT NOT NULL CHECK (game IN ('snake', 'tetris')),
    player_id TEXT NOT NULL,
    display_name TEXT NOT NULL,
    score INTEGER NOT NULL CHECK (score >= 0),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(game, player_id)
);

CREATE INDEX IF NOT EXISTS idx_scores_game_score
ON scores(game, score DESC);

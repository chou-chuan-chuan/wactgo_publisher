# WACTGO Leaderboard Worker

This Cloudflare Worker stores the shared Snake and Tetris leaderboards in D1. The GitHub Pages frontend keeps only an anonymous player ID and the last submitted display name in `localStorage`; names, scores, personal bests, and ranks live in D1.

## Production resources

- Worker: <https://wactgo-leaderboard.ycchou.workers.dev>
- D1 database: `wactgo-leaderboard`
- D1 binding: `DB`

The D1 database ID in `wrangler.jsonc` is a resource identifier, not a credential, and is intentionally version-controlled. API tokens, account tokens, passwords, and other credentials must never be committed.

## Deploy

Run Worker commands from the normalized directory:

```bash
cd workers/leaderboard
```

1. Install or run Wrangler and authenticate:

   ```bash
   npx wrangler whoami
   npx wrangler login
   ```

2. Apply the schema and deploy when an authorized production change is intended:

   ```bash
   npx wrangler d1 execute wactgo-leaderboard --remote --file=schema.sql
   npx wrangler deploy
   ```

3. The deployed Worker origin is configured in the single frontend configuration point in `team.html`:

   ```html
   <meta name="wactgo-leaderboard-api" content="https://wactgo-leaderboard.ycchou.workers.dev">
   ```

If that endpoint is missing or unavailable, the frontend intentionally shows `暫時無法讀取排行榜。` and does not store scores locally.

## Test

The API test suite uses Node's built-in test runner and SQLite adapter; it does not require a remote D1 database:

```bash
npm test
```

## Security scope

This is a **casual public leaderboard**. The Worker validates origins, payload types, lengths, allowed games, and reasonable score bounds. It uses prepared statements and never stores raw IP addresses. Because the game simulation runs in visitor-controlled frontend JavaScript, a user familiar with browser developer tools can still fabricate an otherwise valid score. This design is not cheat-proof; making the games server-authoritative is outside this project's scope.

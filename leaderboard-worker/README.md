# WACTGO Leaderboard Worker

This Cloudflare Worker stores the shared Snake and Tetris leaderboards in D1. The GitHub Pages frontend keeps only an anonymous player ID and the last submitted display name in `localStorage`; names, scores, personal bests, and ranks live in D1.

## Deploy

1. Install or run Wrangler and authenticate:

   ```bash
   npx wrangler whoami
   npx wrangler login
   ```

2. Create the database from this directory:

   ```bash
   npx wrangler d1 create wactgo-leaderboard
   ```

3. Replace `REPLACE_WITH_D1_DATABASE_ID` in `wrangler.jsonc` with the returned database ID.

4. Apply the schema and deploy:

   ```bash
   npx wrangler d1 execute wactgo-leaderboard --remote --file=schema.sql
   npx wrangler deploy
   ```

5. Put the deployed Worker origin in the single frontend configuration point in `team.html`:

   ```html
   <meta name="wactgo-leaderboard-api" content="https://wactgo-leaderboard.YOUR-SUBDOMAIN.workers.dev">
   ```

Until that URL is configured, the frontend intentionally shows `暫時無法讀取排行榜。` and does not store scores locally.

## Test

The API test suite uses Node's built-in test runner and SQLite adapter; it does not require a remote D1 database:

```bash
npm test
```

## Security scope

This is a **casual public leaderboard**. The Worker validates origins, payload types, lengths, allowed games, and reasonable score bounds. It uses prepared statements and never stores raw IP addresses. Because the game simulation runs in visitor-controlled frontend JavaScript, a user familiar with browser developer tools can still fabricate an otherwise valid score. This design is not cheat-proof; making the games server-authoritative is outside this project's scope.

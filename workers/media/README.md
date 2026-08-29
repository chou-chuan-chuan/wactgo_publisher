# WACTGO Media Worker

This Cloudflare Worker serves approved public media from the private `wactgo-media` R2 bucket. It exposes only objects under the `periodicals/` prefix and supports `GET` and `HEAD` requests.

## Production resources

- Worker: <https://wactgo-media.ycchou.workers.dev>
- R2 bucket: `wactgo-media` (private)
- R2 binding: `MEDIA`
- Public prefix: `periodicals/`

The Worker source and non-secret resource identifiers are version-controlled. API tokens, account credentials, passwords, `.dev.vars`, and production secrets must never be committed.

## Test

From the repository root:

```bash
cd workers/media
npm test
```

The tests use a mock `MEDIA` binding and never connect to production R2.

## Deployment

Deployment is intentionally separate from repository source changes. Only deploy from `workers/media/` when an authorized Cloudflare production change is intended:

```bash
cd workers/media
npx wrangler deploy
```

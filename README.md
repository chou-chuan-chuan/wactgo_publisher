# WACTGO Publisher

WACTGO Publisher is a static publishing website built with HTML, CSS, and Vanilla JavaScript and hosted on GitHub Pages.

Production site: <https://chou-chuan-chuan.github.io/wactgo_publisher/>

## Architecture

- Frontend: GitHub Pages, HTML, CSS, and Vanilla JavaScript
- Leaderboard: Cloudflare Worker with Cloudflare D1
- Media: Cloudflare Worker backed by a private Cloudflare R2 bucket

Periodicals source JPG files do not belong in the repository current tree. Production Periodicals media is served from <https://wactgo-media.ycchou.workers.dev/periodicals/>. Do not add those JPG files back to the repository.

## Repository layout

```text
/
├── HTML pages
├── frontend assets (currently at the repository root)
├── workers/
│   ├── leaderboard/
│   └── media/
├── .github/
└── README.md
```

Frontend assets have not been restructured in this phase. Any asset relocation will be handled in separate future pull requests.

## Local development

From the repository root:

```bash
python -m http.server 8000
```

Then open <http://localhost:8000/>.

## Worker development

- [Leaderboard Worker](workers/leaderboard/README.md)
- [Media Worker](workers/media/README.md)

## Security

Never commit API tokens, credentials, `.dev.vars`, environment secrets, or production secrets. Wrangler configuration may contain non-secret resource identifiers such as Worker names, binding names, D1 database IDs, and R2 bucket names.

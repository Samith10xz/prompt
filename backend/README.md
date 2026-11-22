# Graphix Prompt Studio — backend

A small Node.js server (Node 20+, no dependencies) that lets the Studio refine prompts with **Gemini** or **Claude** and fetch a web page for research. API keys stay on the server; the browser never sees them.

## Endpoints

| Method | Path | Body / query | Returns |
| --- | --- | --- | --- |
| `GET` | `/api/health` | | `{ ok, providers: { gemini, claude } }` (true when that key is set) |
| `POST` | `/api/refine` | `{ prompt, provider?, reference?, researchUrl?, researchText? }` | `{ text, provider }` |
| `GET` | `/api/research` | `?url=https://…` | `{ research: { url, title, description, text } }` |

- **Refine** uses the provider the visitor picked (`claude`/`anthropic` → Claude first), otherwise Gemini first, and falls back to the other one if the first fails.
- **Research** only fetches public `http`/`https` pages on ports 80/443, refuses private and local addresses (also after redirects), reads at most 1.5 MB and times out after 12 s.
- Requests are only accepted from the origins in `ALLOWED_ORIGINS`, and each IP is limited to 30 requests per 10 minutes.

## Environment variables

See `.env.example`. Set them in the host's settings, never in a committed file.

| Variable | Needed | Default |
| --- | --- | --- |
| `GEMINI_API_KEY` | one of the two keys | |
| `ANTHROPIC_API_KEY` | one of the two keys | |
| `GEMINI_MODEL` | no | `gemini-3.6-flash` |
| `ANTHROPIC_MODEL` | no | `claude-sonnet-5-5` |
| `ALLOWED_ORIGINS` | no | `https://prompt.graphixdesign.agency` (comma-separated) |
| `PORT` | no | `3000` |

## Run locally

```bash
cd backend
GEMINI_API_KEY=... ALLOWED_ORIGINS=http://localhost:8000 node server.js
```

Then in the Studio's **Connect AI** box set the backend URL to `http://localhost:3000`.

## Deploy on Hostinger

1. hPanel → Websites → add a **Node.js app** (for example `api.prompt.graphixdesign.agency`), connected to this GitHub repo, branch `main`, root directory `backend`, entry file `server.js`.
2. Add the environment variables above in the app's settings (at least one API key).
3. After it deploys, open `https://<backend>/api/health` — the provider you set should show `true`.
4. Put that URL in `config.js` (`window.GPS_BACKEND_URL = 'https://…'`) and push to `main`.

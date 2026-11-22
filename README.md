# Graphix Prompt Studio

A standalone, static prompt-generating system for Graphix Design Agency.

**Live home (once deployed):** https://prompt.graphixdesign.agency/

## What it is

Describe the job in one sentence. Direct it with clicks. Get a prompt built to spec.

- Six kinds of work: **Image, Video & UGC, Social Copy, SEO & Content, Brand & Logo, Chat Prompt**
- Target-tool selection (Midjourney, Runway / Veo / Kling, ChatGPT / Claude, and more)
- Style / format / mood / language chips and a live brief preview
- Six starter templates from real Graphix workflows, including:
  - **Parcel LK** social post
  - **Tamil Maharaja UGC video** — Jeewa, packet-only, iPhone selfie framing,
    says in Tamil “Maharaja varuththa sivappu arisi maa”, dinner will be pittu
    and how it tastes, 3 seamless clips
  - **SEO service-page brief** for Graphix in Colombo
- **Generate** produces a polished prompt plus a negative prompt, 3 variations and tips
- **Improve** sharpens a rough prompt you paste in
- **Library** — searchable, with favourites (stored in the browser)
- **History** — the last 30 generations, automatically (stored in the browser)
- Everything is copy-ready and saveable. Design: black, warm cream, hot orange —
  matching https://graphixdesign.agency/

No server, database or API key is needed. Saved prompts and history live in the
browser's `localStorage`, so nothing leaves the user's device.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | The whole app page |
| `style.css` | Black / cream / hot-orange styling |
| `app.js` | Templates, generation, Library & History |
| `README.md` | This file |

## Run it locally

```bash
cd prompt-studio
python3 -m http.server 8000
# open http://localhost:8000/
```

Or simply open `index.html` in a browser — it works from a file too.

## Deploy to prompt.graphixdesign.agency (Hostinger)

The subdomain already exists in Hostinger hPanel. Its document root is:

```
/home/u379874453/domains/graphixdesign.agency/public_html/prompt
```

1. In hPanel, open **File Manager** for `graphixdesign.agency`.
2. Go to `domains/graphixdesign.agency/public_html/prompt`.
3. Upload `index.html`, `style.css` and `app.js` into that folder
   (or upload a zip of this folder and extract it there).
4. Visit https://prompt.graphixdesign.agency/ — the app should load.
   DNS / SSL for a new subdomain can take a few minutes to settle; if the
   page does not load yet, wait and retry.

Alternative: upload the same three files by FTP/SFTP to the same folder,
or deploy from this GitHub repo with Hostinger's Git deployment, pointing
the repository at that folder.

## Deploy from GitHub

Source of truth: https://github.com/Samith10xz/prompt (branch `main`).

```bash
git clone https://github.com/Samith10xz/prompt.git
cd prompt
# upload/copy the files to the Hostinger folder above
```

## Notes

- The Hostinger **API** is not used for deployment — it returns 403 Forbidden
  for this account's token, so deployment is via hPanel File Manager / FTP / Git.
- No credentials or tokens are stored in this repo.

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

## What's new in v1.4 (2026-11-23) — fix mobile animation (home page)

Dorothy reported an animation issue on the home page on her phone. Headless mobile checks (360/390/768px, touch emulation, screenshots + canvas pixel probes) found three home-page faults:
1. **The home hero fish was missing most of the time.** Its loop ran from off-screen right to x=180 and teleported back while still fully visible, so on a 360px phone it was off-screen ~60% of its 45s cycle — screenshots at 1.5s and 5.5s both showed no fish. The loop now travels edge to edge (off-screen right to off-screen left), so the fish is on screen ~93% of the cycle.
2. **The fish was too faint to see on phones.** Canvas opacity 0.14 × body wash 0.10 came out at ~1–3% on screen (pixel probe: max alpha 71/255 in the canvas, ~10/255 on screen). Phone canvas opacity is now 0.30 and the washes are boosted ×1.9 on narrow canvases (max alpha 126/255) — still subtle and behind the text, but actually visible.
3. **The orange marquee was wider than the phone screen** (16px, from −8px side margins plus the −1.2° rotation), held back only by `overflow-x:clip`, which older iOS Safari does not support — the page could be dragged sideways. The marquee is now exactly viewport-wide on phones (x=0, right=innerWidth in the checks), and `overflow-x:hidden` is set as a fallback before `clip`.
Also fixed the same cause on the other pages: on every content page the fish canvas sat **in the page flow** as a 300px-tall blank black block above the hero text (`.page>*` overrode its absolute positioning). A higher-specificity rule now keeps it a background layer behind the text on all 7 pages — the empty band above "About Us" etc. is gone. And `fish.js` only reallocates the canvas when its size really changes, so scrolling on a phone (toolbar show/hide fires resize) no longer flickers it. Desktop behaviour is unchanged. Verified at 360/390/768px: no horizontal overflow, no console errors, fish visible in screenshots at 12s and 20s on the home hero at 390px.

## What's new in v1.3 (2026-11-23) — full mobile responsiveness

1. **Hamburger menu on phones** — up to 768px the 5-item top nav collapses into a clean Menu button (44px, `aria-expanded`, X icon when open). The menu is a slide-down panel; it closes when a link is chosen, on Escape, on a tap outside, or when the viewport grows back to desktop. Same 5 items; About/Contact/Library/History stay in the footer.
2. **Builder stacks in phone order** — up to 768px the 3-column Builder becomes a single column: brief first, then kinds/templates, then the compiled prompt. Verified in a headless browser at 360px, 390px and 768px on all 7 pages: no horizontal overflow anywhere (`scrollWidth == innerWidth`), no page errors.
3. **Hero scales down** — headline clamps to ~30px on small phones, buttons stack full-width, the background fish is dimmed to ~14–18% opacity on phones so it never overlaps text, and the orange marquee stays seamless.
4. **Touch-friendly** — buttons, chips, tabs, nav links and inputs are at least 44px tall on touch widths; every input is 16px so iOS does not zoom on focus; member reference previews grid down to 2 columns and all images/videos fit the screen.
5. **Bug fix found by the mobile check** — `app.js` referenced a `savedCount` pill that was removed in the v1.2 slim menu, so `renderLibrary()` threw on load and Library/History never rendered. Guarded now; Generate (401 words in the test) and History render correctly again.

## What's new in v1.2 (2026-11-23)

1. **Slim menu** — the top nav keeps only 5 items: Builder, Video Prompts, Image Prompts, News, Member Area. Everything else (About Us, Contact, Library, History, graphixdesign.agency) moved to the footer on every page.
2. **Every page interactive** — home already had the Builder; now About has tabs + a FAQ accordion, Video and Image pages have direction chips with a live preview that sends the brief to the Builder, News has category filters, Contact has a validated form with a character count, and the Member Area has reference uploads + research.
3. **Hero fish, redone** — Dorothy did not like the v1.1 fish: too cartoon, and she did not want a framed canvas. v1.2 removes the frame, border and caption entirely. The fish is now a soft, semi-transparent silhouette gliding slowly as a **background** on the right of the hero — low opacity, no eye/mouth/cartoon details, gentle flow lines — behind the hero content, on **every** page's hero, respecting `prefers-reduced-motion`.
4. **Member Area reference upload + style match** — a member can upload reference images (up to 6) and a short reference video, preview them, describe the reference (subject, product, colours, lighting, camera, mood), and build a "match this reference" block that locks the reference in: same person/product/location, no redesign, no added effects, people or actions (the reference-fidelity rules). Files are previewed in this browser only and never uploaded anywhere.
5. **Research URL** — a member can paste a URL to research. A static page cannot fetch an arbitrary URL from the browser (CORS), so the backend fetches it server-side and fills in the title/description; without a backend the page says so honestly and the member pastes the title/description, which are then used as research context in the prompt.
6. **Backend — Gemini (Google AI Studio) + Claude** — new `backend/` folder: a small Node.js server (plain Node, no dependencies) with `POST /api/refine`, `GET /api/research` and `GET /api/health`. API keys live only in the server environment (`GEMINI_API_KEY`, `ANTHROPIC_API_KEY`), never in the browser. The frontend tries the backend first when a backend URL is set (in `config.js` or the Connect AI box), then falls back to the browser key, then to the built-in generator — and says which one it used. Claude only works through the backend (its API does not allow direct browser calls). Full details, sources and deployment steps are in `backend/README.md`. The backend is **not** deployed — it needs a real API key from Dorothy first (see below).
7. **SEO** — unchanged from v1.1 (per-page meta, canonical, sitemap, robots.txt, JSON-LD).

## What's new in v1.1 (2026-11-22)

1. **Hero fish** — a JavaScript canvas fish (cream body, orange fins) swims on the right of the hero, in the style of the fish / "Scroll to swim" flow on graphixdesign.agency. It loops continuously with no jump at the loop point, and respects `prefers-reduced-motion` (one still frame).
2. **Seamless orange banner** — the marquee track is exactly two identical halves translating −50%, so there is no gap in the loop.
3. **Full detailed prompts** — Generate now produces a complete prompt with Role, Subject, Company, Audience, Hook, Opening, Goal, Style, Camera, Lighting, Duration, Format, Language, Target Tool, Direction, Continuity/Quality, Product Rules and Output Spec, plus negative prompt, 3 variations and tips.
4. **Connect AI (optional, your own key)** — section (10) on the home page. Link an OpenAI, Gemini or Claude key; it is stored only in the visitor's browser localStorage, never sent to Graphix. Without a key the built-in detailed generator works fully. With a key, the studio tries a live refine from the browser: Gemini usually works, OpenAI often works, **Claude does not allow direct browser calls, so it honestly falls back to the built-in generator**. No key is hard-coded, and there is no backend.
5. **Member Area** (`member.html`) — local demo only: sign in with a name/email stored in the browser, clearly labelled as not a real account system. A member can take the last generated prompt and check it as an image: with a linked OpenAI image key it calls the provider; without a key it shows the prompt ready to copy plus links to open it in ChatGPT/DALL·E, Gemini or Firefly. **No image is ever faked.**
6. **Supporting pages** — About, Video Prompts, Image Prompts, News (3 sample posts), Contact and Member Area, all in the same design and linked from the top nav and footer on every page.
7. **SEO** — unique title + description per page, Open Graph / Twitter tags, canonical links, semantic headings, alt text on the fish canvas, `sitemap.xml`, `robots.txt`, and JSON-LD (Organization + WebSite) on the home page.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | The whole app page (Builder) |
| `style.css` | Black / cream / hot-orange styling |
| `app.js` | Templates, generation, Library & History, Connect AI, backend-first refine |
| `config.js` | One place to set the backend URL (`window.GPS_BACKEND_URL`, empty = no backend) |
| `fish.js` | Subtle background fish silhouette on every hero (v1.2) |
| `nav.js` | Mobile hamburger menu (v1.3): toggle, close on link/Escape/outside click |
| `pages.js` | Shared interactivity for the supporting pages (tabs, accordions, filters, direction builders, contact form) |
| `member.js` | Member Area sign-in + image check + reference upload + research URL |
| `backend/server.js` | Node backend: Gemini + Claude refine, server-side research fetch |
| `backend/package.json` | Backend package (no dependencies) |
| `backend/.env.example` | Backend env vars to copy to `.env` (never commit `.env`) |
| `backend/README.md` | Backend docs: endpoints, sources, how to deploy on Hostinger/a Node host |
| `about.html` | About Us (supporting page) |
| `video-prompts.html` | Video Prompt Generator (supporting page) |
| `image-prompts.html` | Image Prompt Generator (supporting page) |
| `news.html` | News / Blog with 3 sample posts |
| `contact.html` | Contact (supporting page) |
| `member.html` | Member Area (local demo) |
| `sitemap.xml` | SEO sitemap |
| `robots.txt` | SEO robots file |
| `README.md` | This file |

## Pages & SEO

| Page | URL | SEO title | Meta description |
| --- | --- | --- | --- |
| Home / Builder | https://prompt.graphixdesign.agency/ | Graphix Prompt Studio — AI Prompt Generator for Image, Video & UGC | Graphix Prompt Studio: describe the job in one sentence, direct it with clicks, and get a full, detailed prompt built to spec — for image, video & UGC, social copy, SEO, brand and chat. Free, by Graphix Design Agency, Colombo. |
| About Us | https://prompt.graphixdesign.agency/about.html | About Us — Graphix Prompt Studio \| Graphix Design Agency, Colombo | About Graphix Prompt Studio: the prompt generator built by Graphix Design Agency in Colombo, so creators, marketers and designers can turn one sentence into a full, detailed prompt. |
| Video Prompts | https://prompt.graphixdesign.agency/video-prompts.html | Video Prompt Generator — UGC, Reels & Video Ads \| Graphix Prompt Studio | Generate detailed video prompts for UGC ads, Reels and video demos — hook, camera, lighting, duration and seamless multi-clip continuity, tuned for Runway, Veo, Kling, Pika and Sora. |
| Image Prompts | https://prompt.graphixdesign.agency/image-prompts.html | Image Prompt Generator — Product Shots, Ads & Lifestyle Photos \| Graphix Prompt Studio | Generate detailed image prompts for product hero shots, ads and lifestyle photos — style, format, mood and lighting named, tuned for Midjourney, DALL·E, Firefly and Imagen. |
| News | https://prompt.graphixdesign.agency/news.html | News — Prompt Tips & Studio Updates \| Graphix Prompt Studio | News from Graphix Prompt Studio: how to write better UGC video prompts, image prompts that look shot not generated, and studio updates from Graphix Design Agency, Colombo. |
| Member Area | https://prompt.graphixdesign.agency/member.html | Member Area — Check Your Prompt as an Image \| Graphix Prompt Studio | Member Area for Graphix Prompt Studio: sign in locally, take a generated prompt and check the result as an image — with your own linked image API key, or by pasting it into your image tool. |
| Contact | https://prompt.graphixdesign.agency/contact.html | Contact — Graphix Prompt Studio \| Graphix Design Agency, Colombo | Contact Graphix Prompt Studio and Graphix Design Agency in Colombo — hello@graphixdesign.agency. Ask about a prompt, a project, or the Studio itself. |

Member Area is `noindex` + disallowed in robots.txt (it is a local demo, not a public landing page).

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
3. Upload all the site files into that folder: `index.html`, `style.css`,
   `app.js`, `config.js`, `fish.js`, `pages.js`, `member.js`, `about.html`, `video-prompts.html`,
   `image-prompts.html`, `news.html`, `contact.html`, `member.html`,
   `sitemap.xml`, `robots.txt` (and `README.md` if you want it on the server)
   — or upload a zip of this folder and extract it there. With Hostinger
   Git auto-deployment connected (Samith10xz/prompt, branch `main`, root
   `public_html`), pushing to `main` deploys automatically instead.
   **Do not upload `backend/` to the static site folder** — it is a
   separate Node server (see `backend/README.md`); it needs its own
   Node host, and it needs a real Gemini and/or Claude API key in its
   environment before it can refine anything. Until then the site works
   fully with its built-in generator.
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

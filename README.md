# SCI — Smart Content Intelligence

SCI is an on-demand business research MVP. Enter a topic and public website or RSS/Atom URLs to collect a small batch of accessible content and see topic matches and frequent terms. You can optionally connect an Instagram Business or Creator account and include its media, subject to Meta's permissions and app mode.

## What this MVP does

- Fetches up to five public HTTP(S) pages or RSS/Atom feeds when you run research.
- Optionally reads recent media from the Instagram professional account that explicitly authorizes this app.
- Ranks collected records against topic words and reports frequent terms in matching records.
- Displays source links so findings can be checked against the originals.
- Keeps no research history or source database. Report results exist only in the open page.

This is not an AI report, search engine, continuous monitor, or username lookup service. It does not retrieve arbitrary Instagram/Facebook/Threads accounts or private data. Instagram Login only grants access to the professional account that authorized the app; Facebook and Threads integrations are not included yet. Add more platforms only through their official APIs and the required permissions/review.

## Run locally

Requirements: Node.js 20.9 or later.

```powershell
Copy-Item .env.example .env
npm install
```

Set `SCI_SECRET_KEY` in `.env` to 64 hexadecimal characters (32 random bytes). For example, generate one with:

```bash
openssl rand -hex 32
```

Then run:

```powershell
npm run dev
```

Open http://localhost:3000. You can research public website/feed URLs without configuring Meta.

## Instagram Login setup

1. In the [Meta app dashboard](https://developers.facebook.com/apps/), add **Instagram API with Instagram Login** and complete **Set up business login**.
2. In **Instagram → API setup with Instagram Login → Business login settings**, add the exact OAuth redirect URI:
   - Local: `http://localhost:3000/api/integrations/instagram/callback`
   - Vercel: `https://YOUR-APP.vercel.app/api/integrations/instagram/callback`
3. Use the **Instagram App ID** and **Instagram App Secret** from that Instagram setup, not the Facebook app credentials.
4. Configure the environment variables for the environment you are running:
   - `META_INSTAGRAM_APP_ID`
   - `META_INSTAGRAM_APP_SECRET`
   - `META_INSTAGRAM_REDIRECT_URI` — must exactly match the URI registered in Meta
   - `META_INSTAGRAM_SCOPES=instagram_business_basic`
   - `SCI_SECRET_KEY` — the same stable secret for the lifetime of the connected session
5. Leave `META_INSTAGRAM_LOGIN_URL` blank; SCI creates the documented `https://www.instagram.com/oauth/authorize` URL and adds a one-time state value.
6. If the Meta app is in Development mode, add your account as an Instagram tester and accept the invitation. Test with an Instagram Business or Creator account.

For Vercel, add these values under **Project → Settings → Environment Variables**, choose the correct deployment environment, then redeploy. The callback value in Vercel and the URI in Meta must match exactly.

OAuth state is held in a short-lived HttpOnly cookie and the encrypted Instagram access token is kept in an HttpOnly, secure-in-production cookie. This avoids SQLite and Vercel filesystem persistence. Clearing browser cookies disconnects the account; rotating `SCI_SECRET_KEY` invalidates the stored token cookie. Tokens and collected content are not written to a database.

## Deployment and limitations

- Research runs are on demand and limited to five web URLs per request; each source has a 2 MB response limit and redirects are not followed.
- Website/feed hosts are resolved and checked for public addresses, then the request is pinned to a checked IP. Add only sources you are authorized to monitor and respect source terms, robots guidance, privacy, and copyright requirements.
- This single-user MVP has no application login, persistent storage, scheduled collection, historical comparisons, or multi-user isolation. Keep the Vercel deployment private/protected while it has no user authentication; add authentication, rate limiting, managed storage, and operational monitoring before making it a public service.
- The report uses deterministic word matching and frequency counts, not an AI model. It only summarizes the records collected in the current request and may miss context or synonyms.
- Instagram API access depends on Meta configuration, account eligibility, granted permissions, and any access review Meta requires.

## Checks

```powershell
npm run lint
npm run build
```

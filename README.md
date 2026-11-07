# SCI — Next.js + TypeScript

A full-stack Next.js migration of SCI v1 Connectors. Includes a dashboard, SQLite persistence, public website/RSS ingestion, and Instagram Login for eligible professional accounts using Meta's official API.

## Requirements
- Node.js 20.9+
- Meta developer app configured for Instagram API with Instagram Login (only needed for Instagram connection)

## Run locally
```bash
cp .env.example .env
# Set SCI_SECRET_KEY to 64 hex characters (32 random bytes)
npm install
npm run dev
```
Open http://localhost:3000.

## Vercel demo deployment
- Set `SCI_SECRET_KEY` and the Instagram variables in the Vercel project settings. Set `META_INSTAGRAM_REDIRECT_URI` to the exact HTTPS callback URL registered in Meta.
- The app uses `/tmp/sci.db` on Vercel when `DATABASE_PATH` is unset or relative, avoiding writes to Vercel's read-only application directory. An absolute `DATABASE_PATH` is used as configured.
- This SQLite setup is only for a temporary demo: `/tmp` data can disappear when an instance is recycled and is not shared reliably between serverless instances. For dependable data and Instagram OAuth state, migrate to a managed database before relying on the deployment.

Generate a secret:
```bash
openssl rand -hex 32
```

In **Meta App Dashboard → Instagram → API setup with Instagram Login → Business login settings**:
- Copy the **Instagram App ID** and **Instagram App Secret** (not the Facebook App ID/secret).
- Add this exact callback URL under **OAuth Redirect URIs**:
`http://localhost:3000/api/integrations/instagram/callback`
- Copy the generated **Embed URL** to `META_INSTAGRAM_LOGIN_URL` in `.env`. It must contain the same Instagram App ID and callback URL configured above. The app adds OAuth state to this URL before redirecting.

If `META_INSTAGRAM_LOGIN_URL` is blank, the app constructs the authorization URL from the other Instagram settings.

## Features
- Dashboard overview and content feed
- Add public website, RSS, or Atom sources
- Sync a source manually
- Connect the user's own eligible Instagram Business/Creator account via Instagram Login
- AES-256-GCM encrypted OAuth token storage
- SQLite database and deduplicated content upserts

## API
- `GET /api/sources`
- `POST /api/sources/websites` with `{ "label": "...", "url": "https://..." }`
- `POST /api/sources/:id/sync`
- `GET /api/content?limit=100`
- `GET /api/integrations/instagram/login`
- `GET /api/integrations/instagram/callback` (Meta OAuth callback)

## Security and scope
- No scraping of Instagram or access to arbitrary/personal accounts. Instagram access is limited to the professional account that authorizes SCI, subject to Meta permissions and app review.
- Website sources are restricted to public HTTP(S), reject credentials and non-public DNS resolutions, and do not follow redirects. For production, deploy the fetcher in a network-isolated worker with egress controls to mitigate DNS rebinding and enforce your organization's source authorization, robots, terms, privacy, and copyright requirements.
- OAuth tokens are encrypted at rest. Set a strong `SCI_SECRET_KEY`; losing it makes stored tokens unrecoverable.
- OAuth state is stored in SQLite with a 10-minute expiry. Add CSRF protection, user authentication, tenant isolation, rate limiting, audit logs, backups, and managed secrets before exposing this app publicly.
- This is a development baseline, not a production security review.

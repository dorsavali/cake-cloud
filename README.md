# Cake Cloud

Cake Cloud is organized as an npm workspaces monorepo:

- `website`: the Next.js frontend
- `api`: the TypeScript backend API

## Getting started

Install all workspace dependencies from the repository root:

```bash
npm install
```

Run either application in development:

```bash
npm run dev:website
npm run dev:api
```

The website and API run together in Cloudflare Workers. API routes live under `/api/*`, with a health check at `GET /api/health`.

Build both workspaces from the repository root:

```bash
npm run build
```

Deploy the static website to Cloudflare Workers:

```bash
npm run deploy
```

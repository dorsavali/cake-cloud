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

The website runs on [http://localhost:3000](http://localhost:3000). The API runs on [http://localhost:3001](http://localhost:3001), with a health check at `GET /health`.

Build both workspaces from the repository root:

```bash
npm run build
```

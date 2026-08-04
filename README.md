# BucketBook

BucketBook is a small finance app for planning monthly spending buckets and tracking purchases against them. This feature branch adds account-based storage with Better Auth and MongoDB Atlas.

## Features

- Create and delete spending buckets
- Add dated purchases to each bucket
- See bucket progress, including over-budget amounts
- Filter buckets by status
- Move between monthly periods
- Export all account data to an Excel-compatible file
- Empty a month’s purchases while preserving its buckets
- Sign up and sign in with email and password
- Store users, sessions, buckets, and purchases in MongoDB

New accounts start with no buckets. Bucket data is scoped to the authenticated user and is no longer stored in `localStorage`.

## Development

Requires Node.js 22 or newer.

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Set these values in `.env.local` for local development and in the hosting provider's encrypted secret store for production:

- `MONGODB_URI`: MongoDB Atlas connection string
- `MONGODB_DB`: database name (defaults to `bucketbook`)
- `BETTER_AUTH_SECRET`: a high-entropy secret of at least 32 characters
- `BETTER_AUTH_URL`: the canonical application URL

`.env.local` and all other `.env*` files are ignored by Git. `.env.example` contains placeholders only and is safe to commit. Never prefix database or authentication secrets with `NEXT_PUBLIC_`.

## Deployment

The authenticated application requires a Node.js server runtime and cannot run on GitHub Pages. Deploy this branch to a server-capable platform and configure the environment variables there. The v0.0.2 static release remains on `main` and GitHub Pages.

## Version

Base release: **0.0.2**

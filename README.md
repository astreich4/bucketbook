# BucketBook

BucketBook is a small, local-first finance app for planning monthly spending buckets and tracking purchases against them.

## Features

- Create and delete spending buckets
- Add dated purchases to each bucket
- See bucket progress, including over-budget amounts
- Filter buckets by status
- Move between monthly periods
- Export all local data to an Excel-compatible file
- Empty a month’s purchases while preserving its buckets

All data stays in your browser using local storage. There are no accounts, profiles, or remote databases.

## Development

Requires Node.js 22 or newer.

```bash
pnpm install
pnpm dev
```

## Deployment

Pushes to `main` automatically build and deploy the static app to GitHub Pages.

## Version

Current release: **0.0.2**

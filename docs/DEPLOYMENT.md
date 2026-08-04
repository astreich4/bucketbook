# Authenticated deployment plan

The `feature/user-auth-mongodb` branch requires a persistent Node.js server. GitHub Pages can only serve the static v0.0.2 application on `main`; it cannot run the authentication or database routes in this branch.

## Recommended shape

1. Create a MongoDB Atlas project and cluster.
2. Create a least-privilege database user dedicated to BucketBook.
3. Restrict Atlas network access to the deployment provider's egress path whenever the provider supports stable egress or private networking.
4. Deploy the Next.js application to a server-capable provider such as Vercel, Render, Fly.io, or a small container host.
5. Add `MONGODB_URI`, `MONGODB_DB`, `BETTER_AUTH_SECRET`, and `BETTER_AUTH_URL` in that provider's encrypted environment-variable settings.
6. Build with `pnpm build` and run with `pnpm start` (or use the provider's native Next.js runtime).

The real values must never be copied into `.env.example`, a workflow file, a Dockerfile, a build argument, browser code, or a GitHub issue. For local work, place them only in `.env.local`, which Git ignores.

Generate the authentication secret locally:

```bash
openssl rand -base64 32
```

Set `BETTER_AUTH_URL` to the exact HTTPS production origin, for example `https://budget.example.com`. Do not prefix any of these variables with `NEXT_PUBLIC_`.

## Before public production use

- Add an outbound email provider, email verification, and a password-reset flow.
- Configure monitoring and database backups.
- Confirm secure cookies over HTTPS and test sign-in, sign-out, account isolation, and session expiry.
- Add a staging environment with a separate Atlas database and separate authentication secret.
- Rotate any secret immediately if it is ever printed, committed, or pasted into a public system.

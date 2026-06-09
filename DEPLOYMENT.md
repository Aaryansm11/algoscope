# Deployment & Git

- **GitHub:** https://github.com/Aaryansm11/algoscope (branch `main`)
- **Live:** https://algoscope-beta.vercel.app — Vercel project `algoscope`
  (team `aaryan-s-maralihallis-projects`, framework **vite**, static, deployment protection **off**).

## Manual deploy (CLI)

```bash
npm run build
npx vercel deploy --prod --yes \
  --scope aaryan-s-maralihallis-projects --token <VERCEL_TOKEN>
```

## Auto-deploy on every push (recommended — token-free)

1. Vercel dashboard → project **algoscope** → **Settings → Git**.
2. **Connect Git Repository** → choose **Aaryansm11/algoscope** → authorize the Vercel GitHub app
   (grant it access to the repo) if prompted.
3. Done — every `git push` to `main` now auto-builds and deploys. No tokens to manage.

> The CLI `vercel git connect` only works once the Vercel GitHub app has been authorized for the
> repo; the dashboard step above does that authorization.

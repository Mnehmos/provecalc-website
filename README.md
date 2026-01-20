# ProveCalc Website

Marketing website for ProveCalc - engineering calculation software with full audit trails.

## Live Site

https://provecalc.com (pending DNS setup)

## Local Development

Just open `index.html` in a browser. No build step required.

## Deployment

This site is designed for GitHub Pages:

1. Push to `main` branch
2. Enable GitHub Pages in repo settings (Settings → Pages → Source: Deploy from branch → main)
3. Add custom domain `provecalc.com` in GitHub Pages settings
4. Configure DNS at Namecheap:
   - A record: `@` → `185.199.108.153`
   - A record: `@` → `185.199.109.153`
   - A record: `@` → `185.199.110.153`
   - A record: `@` → `185.199.111.153`
   - CNAME record: `www` → `your-username.github.io`

## Stack

- Pure HTML/CSS/JS
- Tailwind CSS (via CDN)
- No build tools required

## License

Copyright © 2026 ProveCalc. All rights reserved.

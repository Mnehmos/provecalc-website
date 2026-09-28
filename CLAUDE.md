# ProveCalc Website: Agent Notes

## What This Is

The Next.js 15 (App Router) site for ProveCalc: marketing pages
(`src/app/(marketing)`), Clerk sign-in, Stripe checkout for the desktop
license, license issuance, a contact form, and a browser demo of the
worksheet at `/app`.

Related repositories:
- `Mnehmos/mnehmos.worksheet.app`: the desktop app and the public compute
  sidecar. Its `AGENT_WORKFLOW.md` describes all three repositories.
- `Mnehmos/provecalc-releases`: the installers that `/download` links to.

## Commands

```bash
npm ci
npx tsc --noEmit        # type check
npm run build           # next build; must pass before every push
npm audit --omit=dev    # production advisories
```

This repository has no tests and no CI, so nothing but you catches a broken
build before it deploys. `npm run lint` (`next lint`) is not configured: it
opens a setup prompt and exits 1. That failure is not a code problem.

## Money and License Paths

Read this before touching `src/app/api/checkout/route.ts`,
`src/app/api/webhooks/stripe/route.ts`, `src/utils/licenseCheckout.ts`, or
`src/app/(marketing)/success/page.tsx`.

- A license key is base64 JSON `{email, issued, tier, signature}`. The
  signature is Ed25519 over the JSON of `{email, issued, tier}`, made with
  `LICENSE_PRIVATE_KEY`. The desktop app verifies it with the public key
  embedded in `src-tauri/src/api/license.rs` (camelCase fields). Changing
  the format on either side breaks activation for every customer.
- Keys work offline and cannot be revoked. Treat every issued key as
  permanent, and never issue one for an unpaid or test checkout.
- Never log a license key, the signing key, Stripe secrets, or email bodies.
  Log Clerk user IDs and Stripe session IDs.
- The $1 test price (`TEST_LICENSE_PRICE_CENTS`) applies only when
  `isStripeTestMode()` sees a `sk_test_` or `rk_test_` key. Keep that guard.
- The webhook verifies the Stripe signature, and `licenseIssueProblem()`
  refuses unpaid sessions and test checkouts in live mode. It issues
  licenses on `checkout.session.completed` and
  `checkout.session.async_payment_succeeded`, stores the key in the buyer's
  Clerk `publicMetadata.licenseKey` (shown on `/success`), and emails it
  through Resend.
- End-to-end test, in Stripe test mode only: run the site with test keys,
  forward webhooks with `stripe listen --forward-to
  localhost:3000/api/webhooks/stripe`, buy with the test card
  `4242 4242 4242 4242`, and confirm the key on `/success` and in the email.
  Only the owner has the keys; never ask for them in chat.

## Environment

`.env.example` lists the variables. Two gaps: it omits `RESEND_API_KEY`,
which the webhook needs to email keys, and it points to a
`docs/gmail-oauth-setup.md` that is not in the repository. Real values live
with the hosting provider; never commit them or paste them into chat.

## Known Gaps

From the 2026-09-28 stability audit
(`docs/STABILITY_AUDIT_2026-09-28.md` in the desktop repository):

- The `/app` demo calls `NEXT_PUBLIC_API_URL` from the browser without a
  credential, but the public sidecar requires a bearer key on every compute
  route, so compute should fail with 401. The fix is a server route that
  adds the key behind a Clerk session and a rate limit. After that, delete
  `api-sidecar/`, an outdated, unhardened copy of the desktop sidecar.
- `/api/chat` and `/api/test-key` are unauthenticated OpenRouter proxies.
  `src/middleware.ts` runs `clerkMiddleware()` without protecting any
  route, so every API route must check `auth()` itself.
- Past live-mode payments with `metadata.isTest = "true"` were full
  licenses sold for $1; they are worth checking in Stripe.
- The remaining production advisories need Next.js 16 and nodemailer 10.
- There is no CI, no test runner, and no ESLint configuration.

## Historical Docs

`CODEX_BRIEF.md` and `CODEX_NOTES.md` are the February 2026 hackathon plan
and its review. They describe a target that has since changed, such as
permissive sidecar CORS and an AI endpoint on the sidecar. Do not treat them
as current.

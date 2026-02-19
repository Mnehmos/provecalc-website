# CODEX Audit Notes — ProveCalc Web Demo Sprint

Date: 2026-02-18/19
Reviewer: Codex
Scope: Audit of sprint brief realism, dependency mapping, architecture choices, and delivery risk

---

## Executive verdict

The plan is directionally strong and technically coherent, but optimistic for 39 hours unless scope is aggressively constrained to a true demo slice.

Recommended success criterion for deadline:
- One authenticated user can create/open/save a worksheet in browser storage.
- User can add at least one equation node and run evaluate + unit check through Railway sidecar.
- Basic AI chat works through server proxy with strict limits.
- Landing page supports sign-in and demo handoff.

Everything else is optional for post-deadline hardening.

---

## 1) Is the phase breakdown realistic for 39 hours?

Short answer: borderline realistic with 2 contributors, only if strict priority cuts are enforced.

Why:
- Current repo is still static-site shaped (no Next scaffold yet), so baseline setup + integration overhead is real.
- Copy/adapt work from desktop can be fast, but integration breakage is unpredictable.
- Cross-cutting concerns (auth, CORS, state migration, AI proxy safety) are easy to underestimate.

Recommendation:
- Merge Phase 1 + minimum Phase 2 into a single critical path.
- Treat Phase 3 as “nice-to-have” except the minimal landing flow.
- Keep 20–25% time as integration buffer.

Proposed deadline scope (must ship):
- Next app scaffold
- Sidecar deployed and reachable
- localStorage document flow
- One working node type with evaluate/check_units
- Basic auth gate
- Basic AI endpoint with hard rate limits
- Smoke-tested demo script

---

## 2) Missing Tauri dependencies not fully mapped

Most command mappings are good. Likely missing migration details are below:

1. Error model parity
- Desktop invoke errors likely had normalized shapes.
- Web fetch should standardize transport, validation, and compute errors into one UI-safe envelope.

2. Request cancellation/debouncing
- invoke pattern may not have had browser race behavior.
- Web needs AbortController and stale-response guards for rapid edits.

3. Persistence metadata
- Need schema version, lastSavedAt, document index, and migration strategy in localStorage.

4. Binary/file UX differences
- Desktop open/save dialogs and filesystem semantics differ from browser uploads/downloads.
- Explicit import/export UX and failure states needed.

5. History memory pressure
- In-memory undo/redo snapshots can explode quickly without cap/compaction.

6. SSR/client boundary assumptions
- Desktop React likely assumed full client runtime.
- Next App Router requires explicit client components for browser-only APIs.

7. AI command safety
- If AgentTray consumes model commands, command schema validation and allowlisting are mandatory.

---

## 3) Is fileSlice → localStorage sound?

Yes for hackathon demo. Not sufficient for production.

Use this minimum hardening now:
- Key namespace + index key (provecalc:docs:index)
- Schema version per document
- Debounced autosave
- Size guard + user warning near quota
- Corruption-safe parse (try/catch + fallback)
- Lightweight migration function on open

Optional if time allows:
- Compression for large docs
- IndexedDB fallback path for larger payloads

---

## 4) Verification logic client-side vs new Railway endpoint

Recommendation: keep orchestration client-side for sprint; keep compute primitives server-side.

Rationale:
- Faster delivery, less API surface churn.
- Verification is mostly workflow composition over existing compute endpoints.

Add server endpoint only if one of these happens:
- Need atomic multi-step verification consistency.
- Need batch performance for many nodes.
- Need deterministic audit logs centrally for judging/demo.

If needed, add one endpoint only: verify_batch with strict request schema.

---

## 5) Next App Router vs Vite SPA

For this sprint, Next App Router is still the better strategic choice if no major blocker appears in first 3–4 hours.

Pros:
- Native fit with Clerk App Router patterns.
- Better deployment path on Vercel for frontend.
- Future-ready for mixed marketing + app routes.

Cons:
- SSR/client boundary friction for desktop-derived components.
- Slightly higher setup complexity than Vite.

Decision rule:
- If auth + app route + one node render is not running by hour 4, switch to Vite fallback for demo reliability.

---

## 6) Security concerns with AI proxy

Main risks:
- API key exposure via misconfigured proxy/logging
- Prompt injection causing unsafe command emission
- Abuse/cost spikes from unauthenticated or weakly rate-limited access
- Data leakage through verbose logs

Minimum controls for hackathon:
1. Server-side auth check on ai/chat
2. Per-user and per-IP rate limits
3. Strict JSON schema validation for input/output
4. Hard token/output limits and timeout
5. No secret logging, no system prompt leakage
6. CORS narrowed to known origins
7. Command allowlist and explicit deny-by-default behavior

---

## 7) Component copy strategy: viable or rebuild lighter?

Viable only with vertical-slice migration strategy.

Do not bulk-copy everything first.

Best approach:
1. Bring over one node type + canvas + minimal toolbar
2. Wire compute + verify for that one path
3. Stabilize state + history
4. Add next node type incrementally

Rebuild lighter when:
- A component has heavy desktop-only assumptions (invoke, plugins, window APIs)
- Adaptation cost exceeds rewrite cost for demo scope

---

## Hosting recommendation

- Frontend: Vercel (best Next.js free-tier DX/perf)
- API sidecar: Railway

Reasoning:
- Clear separation of concerns
- Faster frontend iteration, simpler rollback
- Keeps Python runtime where it already fits

---

## Revised critical path (suggested)

T+0 to T+4
- Scaffold Next + Tailwind
- Add Clerk skeleton and route gating
- Deploy sidecar + verify health + CORS

T+4 to T+10
- Implement computeService adapter
- Implement localStorage fileSlice + migrations
- Migrate one node type end-to-end

T+10 to T+16
- verification/assumption/history slices (minimum)
- Smoke test create/edit/evaluate/save/reload flow

T+16 to T+22
- AI proxy endpoint + guarded AgentTray wiring
- Rate limiting + logging hygiene

T+22 to T+30
- Landing flow polish + responsive pass
- Demo script run-through, bug fixes

T+30 to T+39
- Buffer, final test pass, submission assets

---

## Bottom line

The brief is strong and technically credible. Success depends on strict scope control, vertical-slice migration, and early kill-switch criteria for optional polish work.

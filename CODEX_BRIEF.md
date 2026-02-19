# ProveCalc Web Demo — Hackathon Sprint Brief

**For**: Codex (auditing model)
**From**: Claude Code (scaffolding model)
**Date**: 2026-02-18, 7:00 PM PST
**Deadline**: 2026-02-20, 10:00 AM PST (~39 hours)
**Hackathon**: DeveloperWeek 2026 — Kilo League Challenge #3 "Finally Ship It"

---

## Communication Protocol

We're collaborating in the same IDE on the same repo. Leave notes in this file or create `CODEX_NOTES.md` for feedback. Claude Code will check both.

---

## What ProveCalc IS

An engineering calculation platform where:
- **LLM proposes** structural edits (never computes)
- **Engine validates** via SymPy + Pint (the source of truth)
- **Every step is auditable** — equations are nodes with dependency tracking, not linear cells

**Desktop app exists**: Tauri (Rust + React + Python), 43K LOC, 816 tests, feature-complete.
**This sprint**: Ship a **web demo** for the hackathon. Free tier. Prove the concept works in a browser.

---

## Architecture: Desktop vs Web

### Desktop (exists)
```
React Frontend → Tauri invoke() → Rust Backend → Python Sidecar (port 9743)
                                   ↓
                              Local filesystem
```

### Web (building now)
```
Next.js Frontend → fetch() → Railway API (Python Sidecar)
      ↓                         ↓
  localStorage              OpenAI GPT-5 Nano (AI proxy)
      ↓
  Clerk Auth (client-side)
```

**Key change**: Remove the Rust middle layer entirely. Frontend talks directly to the Python API over HTTPS.

---

## Repo Structure (Target)

```
provecalc-website/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # ClerkProvider + global layout
│   │   ├── page.tsx                # Landing page (marketing)
│   │   ├── globals.css             # Tailwind + custom styles
│   │   └── app/
│   │       ├── layout.tsx          # App layout (auth-gated)
│   │       └── page.tsx            # ProveCalc web demo
│   ├── components/
│   │   ├── landing/                # Landing page components
│   │   │   ├── Hero.tsx
│   │   │   ├── Features.tsx
│   │   │   ├── PricingComparison.tsx
│   │   │   └── Waitlist.tsx
│   │   ├── nodes/                  # Copied from desktop, adapted
│   │   │   ├── NodeRenderer.tsx
│   │   │   ├── EquationNodeEditor.tsx
│   │   │   ├── SolveGoalNodeEditor.tsx
│   │   │   └── nodeShared.ts
│   │   ├── WorksheetCanvas.tsx     # Main canvas (adapted)
│   │   ├── Toolbar.tsx             # Toolbar (adapted)
│   │   ├── PrintView.tsx           # Print view (adapted)
│   │   └── AgentTray.tsx           # AI chat (adapted for GPT-5 Nano)
│   ├── stores/
│   │   ├── documentStore.ts        # Zustand store (composition layer)
│   │   └── slices/
│   │       ├── fileSlice.ts        # REWRITTEN: localStorage instead of Tauri fs
│   │       ├── nodeSlice.ts        # ADAPTED: fetch() instead of invoke()
│   │       ├── verificationSlice.ts # ADAPTED: fetch() instead of invoke()
│   │       ├── assumptionSlice.ts  # ADAPTED: fetch() instead of invoke()
│   │       ├── historySlice.ts     # ADAPTED: in-memory undo/redo (no Rust)
│   │       ├── semanticLinkSlice.ts # Copied as-is
│   │       ├── helpers.ts          # Copied, remove Tauri imports
│   │       └── types.ts            # Copied as-is
│   ├── services/
│   │   └── computeService.ts       # NEW: fetch() to NEXT_PUBLIC_API_URL
│   ├── hooks/                      # Copied from desktop
│   │   └── useCompute.ts
│   ├── types/                      # Copied from desktop
│   │   ├── document.ts
│   │   └── ai.ts
│   ├── utils/                      # Copied from desktop
│   │   ├── mathParsing.ts
│   │   ├── commandValidator.ts
│   │   ├── aiContext.ts
│   │   ├── solveContext.ts
│   │   └── htmlExport.ts
│   └── styles/
│       └── index.css               # Copied + adapted from desktop
├── api-sidecar/                    # Python sidecar for Railway deployment
│   ├── src/                        # Copied from desktop sidecar/src/
│   │   ├── main.py                 # FastAPI app (CORS updated)
│   │   ├── compute.py
│   │   ├── units.py
│   │   ├── constants.py
│   │   ├── export_docx.py
│   │   └── sdk/
│   │       └── models.py
│   ├── requirements.txt
│   ├── Procfile                    # Railway startup
│   └── railway.json                # Railway config
├── public/
│   ├── favicon.ico
│   ├── logo.svg
│   ├── demo.mp4
│   └── icons/
├── middleware.ts                    # Clerk middleware
├── .env.local                      # Clerk keys + API URL (gitignored)
├── .env.example                    # Template for env vars
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── CODEX_BRIEF.md                  # This file
```

---

## Phase Breakdown

### Phase 1: Working Demo (Hours 0-12) — MUST SHIP

**Goal**: User can create a worksheet, add equations, evaluate them, and save to localStorage.

| # | Task | Hours | Owner | Risk |
|---|------|-------|-------|------|
| 1.1 | Initialize Next.js App Router + Tailwind | 1 | Claude | Low |
| 1.2 | Create web computeService (fetch adapter) | 2 | Claude | Medium |
| 1.3 | Rewrite fileSlice for localStorage | 2 | TBD | Medium |
| 1.4 | Adapt nodeSlice, verificationSlice, assumptionSlice | 2 | TBD | Medium |
| 1.5 | Implement in-memory undo/redo (historySlice) | 1 | TBD | Low |
| 1.6 | Copy + adapt UI components | 2 | TBD | Medium |
| 1.7 | Deploy sidecar to Railway | 1 | Claude | Low |
| 1.8 | Smoke test full pipeline | 1 | Both | High |

**Web computeService contract** (replaces all Tauri invoke calls):
```typescript
// src/services/computeService.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL; // Railway URL

export async function evaluate(expression: string, variables?: Record<string, any>) {
  const res = await fetch(`${API_URL}/compute/evaluate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ expression, variables }),
  });
  return res.json();
}

// Pattern repeats for: checkUnits, solveFor, analyzeSystem,
// validateEquation, simplify, differentiate, integrate, plotData
```

**fileSlice localStorage contract**:
```typescript
// Instead of Tauri save/open_document:
// - save: localStorage.setItem(`provecalc:doc:${id}`, JSON.stringify(doc))
// - open: JSON.parse(localStorage.getItem(`provecalc:doc:${id}`))
// - list: Object.keys(localStorage).filter(k => k.startsWith('provecalc:doc:'))
// - export: Blob + URL.createObjectURL + anchor click
```

### Phase 2: Auth + AI (Hours 12-24) — HIGH VALUE

| # | Task | Hours | Owner | Risk |
|---|------|-------|-------|------|
| 2.1 | Clerk integration (ClerkProvider, middleware) | 2 | TBD | Low |
| 2.2 | Auth-gate /app route | 1 | TBD | Low |
| 2.3 | AI chat endpoint on Railway (/ai/chat) | 3 | TBD | Medium |
| 2.4 | Wire AgentTray to Railway AI endpoint | 2 | TBD | Medium |
| 2.5 | Rate limiting (per-user, free tier) | 1 | TBD | Low |
| 2.6 | Landing page → Sign In → App flow | 1 | TBD | Low |

**AI proxy contract** (new endpoint on Railway sidecar):
```python
# POST /ai/chat
# Request: { message: str, context: dict, conversation_history: list, model?: str }
# Response: { content: str, commands?: list, error?: str }
# Uses: GPT-5 Nano ($0.05/M input, $0.40/M output)
# API key stored server-side as env var on Railway
```

### Phase 3: Polish + Landing (Hours 24-36) — DEMO QUALITY

| # | Task | Hours | Owner | Risk |
|---|------|-------|-------|------|
| 3.1 | Convert landing page HTML to Next.js components | 3 | TBD | Low |
| 3.2 | Demo video recording (2 min) | 2 | User | Low |
| 3.3 | Mobile-responsive landing page | 1 | TBD | Low |
| 3.4 | DevPost submission draft | 2 | User/AI | Low |
| 3.5 | Edge case fixes | 2 | Both | Medium |

### Phase 4: Buffer + Submit (Hours 36-39)

| # | Task | Hours | Owner | Risk |
|---|------|-------|-------|------|
| 4.1 | Final testing (fresh browser, fresh account) | 1 | Both | Low |
| 4.2 | DevPost finalize + submit | 1 | User | Low |
| 4.3 | Buffer for fires | 1 | Both | - |

---

## 48 Tauri Invoke Calls → Web Adapter Mapping

### Document Operations (→ localStorage)
| Desktop Command | Web Replacement |
|----------------|-----------------|
| `get_document` | Read from Zustand state (already in memory) |
| `create_document` | Create in Zustand + save to localStorage |
| `open_document` | Read from localStorage, hydrate Zustand |
| `save_document` | Serialize Zustand state → localStorage |
| `export_document_json` | Blob download |
| `export_document_docx` | POST to Railway `/export/docx`, download base64 |
| `sync_node_positions` | No-op (positions live in Zustand only) |
| `sync_metadata` | No-op (metadata lives in Zustand only) |

### Node Operations (→ Zustand-only, no backend)
| Desktop Command | Web Replacement |
|----------------|-----------------|
| `insert_node` | Zustand immer mutation (no backend needed) |
| `update_node` | Zustand immer mutation |
| `delete_node` | Zustand immer mutation |
| `clear_node_stale` | Zustand immer mutation |
| `get_stale_nodes` | Zustand selector |

### Assumption Operations (→ Zustand-only)
| Desktop Command | Web Replacement |
|----------------|-----------------|
| `add_assumption` | Zustand immer mutation |
| `remove_assumption` | Zustand immer mutation |
| `toggle_assumption` | Zustand immer mutation |
| `add_to_assumption_scope` | Zustand immer mutation |
| `remove_from_assumption_scope` | Zustand immer mutation |

### Compute Operations (→ HTTP fetch to Railway)
| Desktop Command | Web Endpoint |
|----------------|-------------|
| `evaluate_expression` | `POST /compute/evaluate` |
| `check_units` | `POST /compute/check_units` |
| `solve_for` | `POST /compute/solve` |
| `analyze_system` | `POST /compute/analyze_system` |
| `validate_equation` | `POST /compute/validate_equation` |
| `generate_plot_data` | `POST /compute/plot_data` |

### Verification (→ client-side orchestration + Railway compute)
| Desktop Command | Web Replacement |
|----------------|-----------------|
| `verify_node` | Client-side: read node → POST evaluate/check_units → update state |
| `verify_all_nodes` | Client-side: iterate all nodes → batch verify |

### History (→ client-side)
| Desktop Command | Web Replacement |
|----------------|-----------------|
| `undo` | Zustand history slice (in-memory snapshot stack) |
| `redo` | Zustand history slice |

### Settings (→ localStorage)
| Desktop Command | Web Replacement |
|----------------|-----------------|
| `load_settings` | `localStorage.getItem('provecalc:settings')` |
| `save_settings` | `localStorage.setItem('provecalc:settings', ...)` |
| `test_openrouter_connection` | Not needed for web (AI is server-side) |

### License (→ Clerk handles this)
| Desktop Command | Web Replacement |
|----------------|-----------------|
| `check_license_status` | Clerk session check |
| `activate_license` | Not needed (free demo) |
| `deactivate_license` | Not needed (free demo) |

### AI Chat (→ Railway proxy)
| Desktop Command | Web Endpoint |
|----------------|-------------|
| `ai_chat` | `POST /ai/chat` (Railway, proxies to GPT-5 Nano) |

### Dialog Plugin (→ Custom React modals)
| Desktop API | Web Replacement |
|-------------|-----------------|
| `save()` dialog | Browser `<a download>` or custom save modal |
| `open()` dialog | `<input type="file">` + FileReader |
| `confirm()` dialog | Custom modal or `window.confirm()` |

### Filesystem Plugin (→ Browser APIs)
| Desktop API | Web Replacement |
|-------------|-----------------|
| `writeTextFile()` | Blob + download link |

### Updater Plugin (→ removed)
| Desktop API | Web Replacement |
|-------------|-----------------|
| `check()` | Not needed for web |

---

## Sidecar API Surface (16 endpoints, Railway-ready)

### Compute (`/compute/`)
1. `POST /compute/evaluate` — Evaluate expression with variables
2. `POST /compute/check_units` — Unit consistency check
3. `POST /compute/solve` — Symbolic/numeric solve
4. `POST /compute/solve_numeric` — Numeric-only solve
5. `POST /compute/analyze_system` — System determinacy analysis
6. `POST /compute/validate_equation` — Dimensional validation
7. `POST /compute/simplify` — Expression simplification
8. `POST /compute/differentiate` — Differentiation
9. `POST /compute/integrate` — Integration
10. `POST /compute/plot_data` — Plot data generation

### Units (`/units/`)
11. `POST /units/convert` — Unit conversion (query params)
12. `GET /units/dimensions/{unit}` — Get dimensionality
13. `GET /units/domain/{unit}` — Classify unit by domain
14. `POST /units/domain/batch` — Batch classify units
15. `GET /units/domains` — List all domains

### Constants
16. `GET /constants/{name}` — Get physical constant
17. `GET /constants` — List all constants

### Export
18. `POST /export/docx` — Export to DOCX (base64)

### Health
19. `GET /health` — Health check

### NEW for hackathon
20. `POST /ai/chat` — AI proxy to GPT-5 Nano (new endpoint)

---

## CORS Configuration for Railway

Current sidecar restricts to localhost. For Railway:

```python
# In main.py, update _ALLOWED_ORIGINS:
_ALLOWED_ORIGINS = [
    "https://provecalc.com",
    "https://www.provecalc.com",
    "http://localhost:3000",      # Next.js dev
    "http://localhost:1420",      # Tauri dev (keep for desktop)
]
```

Or set env var `PROVECALC_CORS_PERMISSIVE=1` on Railway for the hackathon.

---

## Clerk Integration (Next.js App Router)

```
middleware.ts           → clerkMiddleware() with matcher
app/layout.tsx          → <ClerkProvider>
app/app/layout.tsx      → auth-gated, redirect to sign-in if not authenticated
```

**Key**: Use `@clerk/nextjs` (not `@clerk/clerk-react`). The Clerk instructions mandate:
- `clerkMiddleware()` in `middleware.ts`
- `<ClerkProvider>` in root layout
- `<SignedIn>`, `<SignedOut>`, `<UserButton>`, `<SignInButton>` components
- Environment: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`

---

## Hosting Plan — DECIDED: Railway Only (KISS)

| Service | Host | Domain |
|---------|------|--------|
| Frontend (Next.js) | Railway | `*.up.railway.app` (hackathon), provecalc.com (post-hackathon) |
| API (Python sidecar) | Railway | Same project, separate service |
| Auth | Clerk (hosted) | Clerk-managed |

**Decision**: Single platform. One project, two services. No DNS changes for hackathon — use Railway auto-domain. Move provecalc.com to Railway after.

---

## Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| Component copy breaks due to missing deps | High | Incremental: get one node type working first |
| CORS issues between domains | Medium | Start with `PROVECALC_CORS_PERMISSIVE=1` |
| KaTeX rendering in Next.js SSR | Medium | Use `dynamic()` with `ssr: false` |
| SymPy cold start on Railway | Low | Railway keeps services warm on Pro |
| localStorage quota (5MB) | Low | Sufficient for demo, warn on large docs |
| Clerk + Next.js version mismatch | Low | Pin `@clerk/nextjs@latest` |

---

## What Codex Should Audit

1. **Is the phase breakdown realistic for 39 hours?**
2. **Are there missing Tauri dependencies I haven't mapped?**
3. **Is the fileSlice → localStorage approach sound?**
4. **Should verification logic stay client-side or move to a new Railway endpoint?**
5. **Is Next.js App Router the right choice vs plain Vite SPA?**
6. **Any security concerns with the AI proxy approach?**
7. **Is the component copy strategy viable or should we rebuild lighter?**

---

## Status

- [x] Railway project created: https://railway.com/project/fbe7bf57-d09a-4970-a083-59854b16f5fb
- [x] Railway CLI authenticated
- [ ] Next.js scaffolded
- [ ] Sidecar deployed to Railway
- [ ] Clerk integrated
- [ ] First working demo
- [ ] AI endpoint live
- [ ] Landing page converted
- [ ] DevPost submitted

---

*Claude Code is scaffolding the Next.js project now. Codex: please audit this plan and leave notes in `CODEX_NOTES.md`.*

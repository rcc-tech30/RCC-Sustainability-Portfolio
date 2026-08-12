# Homepage Redesign — Session Context & Handoff (2026-08-12)

Durable record of all work and context from this working thread. Preserved
because the working commit is trapped in an ephemeral clone (push 403-blocked).

## Workspace facts (verified)

- Repo: `RCC-Sustainability-Portfolio`
- Remote: `https://github.com/rcc-tech30/RCC-Sustainability-Portfolio`
- Live: `https://rcc-tech30.github.io/RCC-Sustainability-Portfolio/`
- Worker clone path (ephemeral, Linux): `/home/user/RCC-Sustainability-Portfolio`
- Branch: `claude/rcc-portfolio-redesign-plan-rr8dko`
- HEAD / working commit: `8b406cdc13f335f4bf981990109634fe73ce9068`
- Commit parent (base it was built on): `888781f9bec80214bd6f903b1f5ebd76801ba449`
- Owner local `origin/main` (reported): `e211aa5a72cbcb81c02b8b68dab0bf9b7b30ec0c`
  (base `888781f` reported absent in owner local — base mismatch, review before apply)
- Push status: HTTP 403 egress-policy denial on `github.com` writes. Not retried.
- Environment: managed ephemeral container; `~/.claude` config regenerated per session.

## What the repo is

- Plain static HTML/CSS, zero dependencies, no build, deployed via GitHub Pages
  from `main` root (`index.html`). Single self-contained homepage (~450 lines,
  inline CSS, currently no JS).
- Planning convention: specs in `docs/superpowers/specs/`, plans in
  `docs/superpowers/plans/` (`YYYY-MM-DD-<slug>[-design].md`).
- Tests: `tests/portfolio-homepage.test.mjs` (node:test), `tests/fleet-electrification.test.mjs`,
  `scripts/verify-portfolio.ps1`. Node v22 available.
- No `AGENTS.md`, `CLAUDE.md`, or `package.json`. No image assets dir yet.

## Work produced (commit 8b406cd, local-only)

Added two planning docs:
- `docs/superpowers/plans/2026-08-12-homepage-header-nav-redesign.md` (142 lines)
- `docs/superpowers/specs/2026-08-12-homepage-header-nav-redesign-design.md` (104 lines)

They plan: hero/header refresh, a segmented Home/Portfolio/About nav with a
sliding pill (`cubic-bezier(0.65, 0, 0.35, 1)`, ~0.4s, label crossfade),
smooth-scroll to `#home` / portfolio / `#about`, a photo/text founder section,
and an empty `#about` scaffold for a future bento. Full patch was exported to
the controller earlier in the thread.

### Recovery of the trapped commit
```bash
# from a checkout that has the commit:
git format-patch -1 8b406cd -o ./out
# apply later onto the intended base (review base mismatch first):
git checkout -b claude/rcc-portfolio-redesign-plan-rr8dko <intended-base>
git am ./out/0001-*.patch     # or: git apply --3way out/0001-*.patch
```
Both files are pure additions (new files), so a 3-way/path apply should succeed
even though the parent SHA differs from owner `main`.

## KEY BLOCKER (open)

The founder-content + bento revision task requires TWO images. Only the
**founder photo** was received (real photo: person outdoors by a green "7 KM"
trail marker, pine forest, black sweatshirt, navy jacket, backpack). The
**bento-layout inspiration image was not attached / not accessible**. Per
instruction, work stopped rather than inventing the bento layout. Unblock by
re-attaching the bento image, or by explicitly waiving it (design a
self-contained SVG map + illustrated head marker from the written spec alone).

## Owner-approved founder content (verbatim, do not silently reword)

- Heading: `Hi, I'm Reiniel.`
- Body: `I'm a carbon analyst specializing in greenhouse gas accounting across
  Scope 1, Scope 2, and Scope 3. I work across the end-to-end process, from
  mapping business activities and identifying applicable emission sources to
  building dashboards and translating results into practical insights. My work
  helps teams assess decarbonization opportunities and understand their
  potential financial, energy, and emissions impacts.`
- CTA 1: `View LinkedIn` -> `https://www.linkedin.com/in/reiniel-celgie-chan-0a122428b/`
  (new tab, `rel="noopener noreferrer"`)
- CTA 2: `Email me` -> `mailto:reinielcelgiechan@gmail.com`

Founder-section rules: use the supplied photo (not placeholder); descriptive
alt text; do NOT make the whole section a single link; two explicit accessible
CTAs; balance for employers and consulting clients; no "Carbon Hoshi" mention;
do not claim established workflow-automation expertise; no em dashes in public
copy.

Proposed photo asset path (for implementation): `assets/founder-reiniel.jpg`
(new `assets/` dir). Alt text draft: "Reiniel Celgie Chan standing on a forest
trail beside a 7 kilometre marker."

## About bento requirements (verbatim intent)

Card 1 — Regional emission-factor experience:
- Australia: DCCEEW National Greenhouse Accounts (NGA) Factors
- UK: DESNZ greenhouse gas reporting conversion factors
- No implication of regulatory assurance, certification, or guaranteed
  compliance. Do NOT imply NGA Factors suit mandatory NGER reporting. Avoid a
  hard-coded publication year unless a maintainable update strategy is included.
  Keep concise for employers/clients.

Card 2 — Location:
- Public label: `Metro Manila, Philippines`
- Broad, privacy-preserving map composition centered around southern Metro Manila.
- Oversized illustrated avatar/head marker inspired by the (missing) layout image.
- Do NOT expose Muntinlupa, address, coordinates, live/precise location.
- No map API, tracking, credentials, or external map service. Self-contained
  visual compatible with static GitHub Pages. Do not copy the inspiration image.

Card 3 — Tools I use (ONLY these, accessible text labels, logos not sole ID):
- Excel, Power Query, Power Automate, Power BI, ChatGPT, Claude
- Do NOT include n8n (still practising). Do not describe automation as an
  established specialization. No new packages or external asset requests.

Bento direction: inspiration not template; adapt to RCC forest/emerald/mint;
portfolio not SaaS dashboard; clear hierarchy, restrained motion, accessible
contrast, responsive; no purple gradients / AI-slop / crowded cards; define
desktop and mobile arrangements; relate bento to the `About` nav target.

## Decisions vs assumptions

Owner-approved decisions:
- Founder heading/body/CTAs (verbatim above).
- The three bento cards' exact contents and prohibitions.
- Use the real founder photo; nav behavior/easing/duration; no Carbon Hoshi; no n8n.

Remaining assumptions (need confirmation):
- Photo asset path/filename and alt-text wording (drafts above).
- Bento layout/proportions and the Card 2 marker style (blocked on the image).
- Justified text applies only to the long founder paragraph on wide viewports,
  left-aligned on mobile.

## Files expected to change during later implementation

- `index.html` (hero/header/nav, founder section, About bento, one inline `<script>`)
- `tests/portfolio-homepage.test.mjs` (rescope the blanket no-`<script>` assertion
  at line 38 to "aurora stays pure CSS"; add nav/section/motion/bento assertions)
- New asset: `assets/founder-reiniel.jpg`
- Planning docs: the spec and plan under `docs/superpowers/` (this revision)

## Test blocker to remember

`tests/portfolio-homepage.test.mjs:38`:
`assert.ok(!html.includes("<script"), "The aurora must not add JavaScript");`
The pill nav requires JS. This assertion must be narrowed (aurora-only), or the
build goes red.

## Superpowers install (this session)

Installed 14 skills to `~/.claude/skills/` (brainstorming, writing-plans,
executing-plans, subagent-driven-development, test-driven-development,
systematic-debugging, verification-before-completion, requesting/receiving-code-review,
dispatching-parallel-agents, using-git-worktrees, finishing-a-development-branch,
writing-skills, using-superpowers). Added a self-contained SessionStart hook
(`~/.claude/superpowers-session-start.sh` + `~/.claude/settings.json`) that
injects `using-superpowers` at startup. Note: this container regenerates
`~/.claude` per session, so for a durable install use the plugin marketplace on
a local machine: `/plugin marketplace add obra/superpowers` then
`/plugin install superpowers`.

## Suggested next step

Provide the bento inspiration image (or waive it), then revise the spec + plan
to replace the placeholder photo/copy and the empty About scaffold with the
founder section and the three-card bento as explicit, testable tasks. Then, in a
separate implementation pass, apply to `index.html` + tests with full nav / a11y
/ reduced-motion / no-overflow / privacy / no-external-request verification.
Nothing is pushable from this session until the 403 egress block is lifted.

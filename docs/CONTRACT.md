# The page's contract

One clause for every acceptance criterion in END-2 to END-10. Clause `Cn.m` is END-n AC m.
The ticket is the source of truth for each clause's wording. Each clause names what will prove it.
None of these tests exist yet; each is written by the ticket the clause belongs to.
Why we are building this: `docs/INTENT.md`.

A proof is a test (a file under `test/`), a CI or deploy run (named by its workflow),
a named review step, or **customer sign-off in staging**.

## END-2: Build once (src/ bundled into one dist/index.html)

- **C2.1** `node tools/build.mjs` writes `dist/index.html`. Running it twice gives byte-identical output.
  Proof: `test/build.test.mjs`.
- **C2.2** `dist/index.html` makes no network requests: no src/href to http(s), no fetch, no import() of URLs.
  Proof: `test/build.test.mjs`.
- **C2.3** No behavior change. For t = 0, 0.5, 1.7 and 3.2 s, the frame text rendered by the built page
  equals v1's frame text (golden files captured from v1 before the change).
  Proof: `test/build.test.mjs` against the v1 golden files.
- **C2.4** CI runs the build, then `node --test`. A failed build fails the check.
  Proof: the `checks.yml` workflow run (build step before `node --test`).
- **C2.5** `dist/` is in `.gitignore`. The artifact is built, never committed.
  Proof: `test/build.test.mjs`.

## END-3: Staging (every merge to main deploys to /staging/)

- **C3.1** A push to `main` deploys to `/staging/` with no human step. Production at `/` is
  byte-identical before and after.
  Proof: the `deploy-staging.yml` run on a push to `main`; `test/compose-site.test.mjs` for `/` unchanged.
- **C3.2** `/deploy.json` `staging` equals the pushed SHA within one run.
  Proof: `test/smoke.mjs` against `/staging/`, run by `deploy-staging.yml`.
- **C3.3** The smoke test runs against the live `/staging/` URL after deploy. Failure marks the run red.
  Proof: `test/smoke.mjs` as a step of `deploy-staging.yml`.
- **C3.4** A missing or first-ever production artifact is handled: `/` shows a "not yet released"
  page, and the run still passes.
  Proof: `test/compose-site.test.mjs` (no production artifact).
- **C3.5** The workflow has least-privilege `permissions:` (contents read, pages write, id-token write)
  and nothing else.
  Proof: review of `deploy-staging.yml`.

## END-4: Production (promote the staged artifact, human-approved, with rollback)

- **C4.1** The production run pauses for approval. Nothing deploys without it.
  Proof: a `promote-production.yml` run waiting on the `production` environment's required reviewer.
- **C4.2** The file served at `/` is byte-identical to the `endboss-<sha>` artifact (sha256 compared
  in the run log).
  Proof: the sha256 comparison step in the `promote-production.yml` run log.
- **C4.3** A SHA that isn't live in staging is refused with a named reason, before approval is even
  requested (unless `rollback: true` names a SHA that was previously in production).
  Proof: `test/compose-site.test.mjs` (refusal cases).
- **C4.4** Rolling back to the previous SHA works, and `deploy.json` shows it.
  Proof: `test/compose-site.test.mjs` (rollback case); a live rollback run, checked by `test/smoke.mjs`.
- **C4.5** The smoke test against `/` passes after promotion, or the run is red.
  Proof: `test/smoke.mjs` as a step of `promote-production.yml`.

## END-5: Hold space (or press and hold) to breathe fire

- **C5.1** With no input for 60 s, intensity is 0 the whole time. The timed fire is gone.
  Proof: `test/breath.test.mjs`.
- **C5.2** Press at t=0: intensity is 0 until 220 ms, then 1 while held.
  Proof: `test/breath.test.mjs`.
- **C5.3** Release: intensity falls to 0 within 400 ms and stays there.
  Proof: `test/breath.test.mjs`.
- **C5.4** A tap shorter than 220 ms still gives a short puff (inhale completes, then tail-off).
  It never sticks.
  Proof: `test/breath.test.mjs`.
- **C5.5** Key-repeat events don't restart the inhale. Blur while held means release.
  Proof: `test/input.test.mjs`.
- **C5.6** Space does not scroll the page.
  Proof: `test/input.test.mjs`.

## END-6: Canvas renderer whose detail scales to 8K

- **C6.1** `grid()` is pure. At 1920x1080 dpr 1 it gives at least 25,000 cells. At 7680x4320 it gives
  at least 4x the 1080p count and at most 160,000.
  Proof: `test/grid.test.mjs`.
- **C6.2** The canvas backing store equals CSS size x dpr at 1080p, 4K and 8K viewports, so there's no
  browser upscaling blur.
  Proof: `test/e2e/resolutions.mjs` (Playwright).
- **C6.3** Median frame time is at most 16 ms at the 160,000-cell cap on the CI runner (120 frames).
  Proof: `test/e2e/resolutions.mjs` (Playwright).
- **C6.4** Resizing the window recomputes the grid within one frame. No stretched frame is ever shown.
  Proof: `test/e2e/resolutions.mjs` (Playwright).
- **C6.5** v1 visuals still render (the dragon art is untouched here).
  Proof: `test/e2e/resolutions.mjs` (Playwright).

## END-7: The HD dragon (shaded, lit, resolution-independent)

- **C7.1** At 320x90 cells, a frame uses at least 10 distinct ramp glyphs and at least 64 distinct colors.
  Proof: `test/dragon-sdf.test.mjs`.
- **C7.2** Resolution independence: the silhouette (ink mask) at 160x45, 320x90 and 640x180, downsampled
  to 160x45, agrees at 92% IoU or better.
  Proof: `test/dragon-sdf.test.mjs`.
- **C7.3** Ink ratio is 0.25-0.60 of the screen. The dragon is centered with its mouth facing right.
  Proof: `test/dragon-sdf.test.mjs`.
- **C7.4** Both eyes are emissive cells whose brightness varies over a 2 s window.
  Proof: `test/dragon-sdf.test.mjs`.
- **C7.5** Frames are deterministic for a given (t, grid).
  Proof: `test/dragon-sdf.test.mjs`.
- **C7.6** The ticket isn't done until the customer has looked at `/staging/` and said yes.
  Proof: **customer sign-off in staging.**

## END-8: Flamethrower fire (particles that cool from white to smoke)

- **C8.1** Intensity 0 means zero fire cells within 600 ms (smoke may linger up to 1.5 s).
  Proof: `test/fire.test.mjs`.
- **C8.2** At full intensity, every fire cell's origin traces to within 3 cells of the mouth.
  Proof: `test/fire.test.mjs`.
- **C8.3** Color is ordered by distance from the mouth. The median color near the mouth is hotter
  (higher G) than the median at 70% reach.
  Proof: `test/fire.test.mjs`.
- **C8.4** After 1 s held, fire reach is at least 60% of the screen width.
  Proof: `test/fire.test.mjs`.
- **C8.5** The particle count is capped (at most 4,000) and frame time holds C6.3.
  Proof: `test/fire.test.mjs` for the cap; `test/e2e/resolutions.mjs` (C6.3) for frame time, with fire on.

## END-9: HUD redrawn, input hint, reduced motion, accessibility

- **C9.1** The bar never goes below 0 or above 100%. It drains only while intensity is above 0.
  Proof: `test/hud.test.mjs`.
- **C9.2** The XP banner shows only after a release that followed at least 1.5 s of breathing.
  Proof: `test/hud.test.mjs`.
- **C9.3** With reduced motion on, the shake offset is always 0 and no element flashes more than
  3 times per second.
  Proof: `test/hud.test.mjs`.
- **C9.4** The hint text matches the input type (hasTouch on and off).
  Proof: a Playwright test with hasTouch on and off (file to be named by END-9).
- **C9.5** axe-core finds no violations on the page.
  Proof: a Playwright test running axe-core (file to be named by END-9).

## END-10: Retire the terminal version

- **C10.1** `dragon.mjs`, `test/dragon.test.mjs` and `SPEC.md` are gone, and nothing in the repo
  imports or mentions `dragon.mjs`.
  Proof: `git grep dragon.mjs` finds nothing, run in the END-10 review.
- **C10.2** CI is green with the remaining tests.
  Proof: the `checks.yml` workflow run.
- **C10.3** The README's commands, run exactly as written on a fresh clone, work.
  Proof: the README's commands run on a fresh clone in the END-10 review.

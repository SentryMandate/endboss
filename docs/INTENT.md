# Intent: HD Dragon v2

What the customer said, and what we decided. Every ticket in the HD Dragon v2 milestone is
checked against `docs/CONTRACT.md`, and the contract answers to this page.

## What the customer said

Verbatim, as quoted in the tickets:

1. "worse than my child could draw" (their verdict on v1; END-1)
2. "10k ultra HD" (END-1)
3. "HD out of ASCII" (END-1, decision 3)
4. "hold space to breathe fire" (END-5)

## What we decided

Made by the lead, recorded in END-1.

1. **The page is the product.** The customer opens `index.html` in a browser. The terminal
   version is retired (END-10).
2. **"10k" means detail that scales with the screen.** The dragon is drawn from math, not a fixed
   grid. A bigger screen gets more glyphs, so more detail. Tested crisp at 8K (7680x4320), the
   largest real display.
3. **"HD out of ASCII" means shaded, not outlined.** A brightness ramp of at least 10 glyphs, a
   truecolor value per glyph, and lighting from one key light.
4. **Hold to breathe.** Space held (or press-and-hold with touch or mouse) makes fire stream from
   the mouth. Release and it tails off. The automatic timed fire is removed. Idle is alive:
   breathing body, wing beat, eye glow, nostril smoke.
5. **The HUD stays** (boss bar, `CRITICAL HIT! +10,000 XP`), redrawn in the same style.
6. **The customer's look at staging is an acceptance criterion.** "Better than a child's drawing"
   is judged by the customer in staging, and no test can stand in for it.

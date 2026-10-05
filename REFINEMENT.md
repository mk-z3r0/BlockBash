# chat_refine: first refinement pass

## Playability lens

For an impatient ten-year-old, the biggest risks are losing hard-earned progress,
missing the run requirement on long gaps, and juggling a separate weapon button.
This pass combines run and weapon on Shift/B (controller A/Y), preserves the
checkpoint after game over, and adds short contextual guidance in level one.
Melee repeats while held. Limited-ammo triangles fire once per fresh tap, so a
held run button does not empty the magazine. Acquiring a weapon while already
holding run does not automatically fire a triangle: release and tap to shoot.

## Presentation

A brighter arcade title, a responsive game frame, a gold shaded hero with a face,
lit platform landing edges, backed HUD counters, and a small face-progress bar.
The canvas resolution and collision geometry remain as authored. Music is untouched.

## Validation and next playtest

`node tools/refine-controls-probe.mjs` passes combined running speed, Shift melee,
held melee repetition, single-tap ammo use, input clearing on blur, checkpoint
retry with retained score/coins/weapon and replenished ammo, and rendering smoke
checks with a mocked canvas. `git diff --check` passes.

The browser probe suite and visual screenshots could not run: no installed
browser, and the Playwright browser download returned an invalid archive.
The canvas smoke check does not establish visual quality or game feel.

Playtest next: let a child start without explaining controls. Watch their first
gap, first earned weapon, first long gap, and first game-over retry. Record
confusion and time spent stuck. Later boss readability and levels 4–6 still need
hands-on review; this pass does not claim a complete seven-level playtest.

## Story continuity and opening follow-up

Quarrick loses individual corners in a fixed order, rather than having all four
chamfered at every damage stage. The first chip grows during the level-one edge
transition and matches his level-two meeting. Level three starts with two lost
corners; a third is lost visibly before the handoff, and the final corner is
ground away during corruption. Restoration leaves one scar.

The opening now lasts about 10.3 seconds. It gives the intact cube two seconds
of peace, then shows converging sphere trails, persistent landing spheres, sparks
and a progressive chamfer before the corner breaks away. A tinted space backdrop,
letterboxing and five short captions connect the attack to the hero's home.
The existing skip behavior, save flag and audio cues remain in use.

The Node probe also verifies exact corner counts, stable prior scars, fractional
corner animation, both handoff damage beats, all 620 opening update/draw steps
with a mocked canvas, normal completion, and fresh-press versus held-key skipping.
This still needs a real browser visual review and hands-on playtest.

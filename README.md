# SortStudio — Order from the Chaos

## 20-algorithm comparison lab

Open **20-Algorithm Lab** from the sidebar. Choose two algorithms and generate a seeded input or enter 2–128 signed integers. Both lanes receive a copy of the same input, with the same item identities and sort direction. Counting Sort supports inputs spanning up to 16,384 integer bins.

- **Three.js arena.** Rotate by dragging, zoom with the mouse wheel or a two-finger pinch, and select a bar to track its original item. The camera buttons provide the same navigation without gestures. Each bar's direction and height show the sign and magnitude of its value on a scale shared by both lanes. Orange marks active positions and cream marks the tracked item. The 2D arena is available for exact inspection and as a fallback when WebGL is unavailable.
- **D3 plots.** Compare cumulative key comparisons, main-array writes, swaps, and auxiliary writes. Select a point along the horizontal axis to seek to that event. Tracked-item position shows the first occurrence while a record is temporarily duplicated and a gap while it is absent from the main array. The cursor always reads the exact trace even when long metric lines are sampled for display.
- **Sort coach.** Ask about a recorded operation, compare measured work, check equal-key order, or try predicting an event in either lane. The coach uses the engine's traces and algorithm catalog in the browser. There is no external model or account setup.

The simulation compares recorded operations. A shared timeline aligns event numbers, and each lane freezes when its own trace ends. A swap writes two main-array cells. Comparison counts exclude validation, loop and bounds checks, and distribution range scans. Auxiliary writes count recorded updates to working structures. Use operation counts to explain behavior on the chosen input. The display does not measure CPU time.

### Rebuild and verify

```sh
npm ci
npm run build
npm test
```

`sort-engine.js` contains the sorting implementations and reversible traces. `sort-lab.js` and `sort-lab.css` implement the comparison interface and D3 charts. `three-scene.mjs` builds the portable `vendor/sort-scene.js`, with the MIT license in `THREE-LICENSE.txt`. `sort-coach.js` implements the local coach.

To exercise the browser flows, install Playwright for Python and use a machine with Chrome:

```sh
python -m pip install playwright
python test-sortstudio-browser.py
```

The browser check opens the packaged app directly from disk, exercises all 20 selections, verifies mouse and emulated touch camera controls, and checks the WebGL fallback. It saves screenshots to `test-results/`.

### Research question for a follow-up study

Does predicting the next operation in a synchronized two-lane replay improve learners' ability to explain or trace an unfamiliar input? A comparison could match algorithms, practice time, and examples, vary the prediction interaction, then score traces and explanations on unseen inputs with a fixed rubric. This is a proposed study.

## Open and present the classic lessons

Extract the whole folder and double-click index.html. The checked-in libraries, styles, and scripts allow offline use. Keep the files together.

For the visual opener, click **Launch Sorting Theater**, then **Begin the race**. It fills the browser panel with projected illuminated lanes, live values, operation counters, and a completion reveal. Use the full-screen button when supported. Play/pause, stepping, scrubbing, reverse/random/sorted input, speed, and reset all use the main arena’s actual traces. This is an alternate presentation of the arena, not an additional independent scientific view.

Click **Start the guided presentation** for a 13-stop route through a 13-minute demo followed by 2 minutes of discussion. The timer measures elapsed time; it does not auto-advance. Next deliberately loads prepared input in the arena, experiment, and code explorer. Back preserves current experiment state. Exit or Escape closes the tour. Read notes.html or PRESENTATION-NOTES.md for the full timed script and rehearsal instructions. Rehearse to adapt the timing to your speaking pace.

For localhost use, run `python3 -m http.server 8000` in this folder and visit http://localhost:8000.

## Ten dynamic views

1. Arena — shared-input traces, playback, stepping, scrubbing, and operation counts.
2. Heatmap — algorithm-specific position-pair comparisons and position activity.
3. What-if experiment — prediction, controlled input patterns, size, and common measurement units.
4. Array playground — validated custom input, click/keyboard swaps, drag reorder, shuffle, restore.
5. Code explorer — reversible stepping through conceptual pseudocode and actual trace states.
6. Prediction challenge — audience prediction, revealed pair operation, and score.
7. Growth study — measured comparison counts by size and input pattern, with a numeric table.
8. Operation history — cumulative comparisons and a cursor synchronized with the arena.
9. Inversion matrix — quantifies initial disorder and connects it to Bubble swaps and Insertion writes.
10. Identity stability — tagged equal-key records show Selection's possible reordering.

The opening question, algorithm mechanism cards, three narrative acts, and conclusion provide the connecting scientific story. The opening bar sculpture is decorative and is not counted as a dynamic scientific view.

## Scientific interpretation

This is an explicit algorithm simulation. Input variables include algorithm, size, order, sort direction, and event index. Values are dimensionless integers. Comparisons exclude loop and bounds checks. Array writes exclude local variables. A Bubble or Selection swap counts as two array-cell writes. Insertion counts shifts plus final key placements. Arena native counters keep their own labels; the controlled experiment offers a common array-write metric.

Recorded events include candidate and completion frames. The animation winner is the shortest recorded trace under this instrumentation, not the fastest implementation in CPU time. Insertion may temporarily duplicate a value in array cells while holding its key outside the array; the message displays the held key. Its heatmap pairs mark a scanned position and next insertion slot. Heatmaps are mirrored and rescale their color maximum for each algorithm.

The random growth curve is one deterministic sample per size, not an average or a confidence interval. The identity example is fixed in ascending order, independently of the main arena, and is explicitly labeled. It illustrates stability, not a general proof. Insertion shifts are summarized in the identity view; the code explorer records them separately.

## Checks

Run:

```
node --check script.js
node --check experience.js
node verify.cjs
node verify-experience.cjs
```

**Results:** 630 core assertions + 90 inversion/identity assertions = 720 passing assertions. Tests cover final sorting, input preservation, duplicates, ascending/descending direction, empty/singleton arrays, monotonic counters, comparison accounting, numerical examples, Selection's formula, Bubble's inversion identity, Insertion writes, and tagged-record final orders.

**Browser checks completed:** local D3 loading and initialization; guided navigation/prepared reverse input; arena stepping; sorted n=20 class prediction (19,190,19 comparisons); Selection identity example ending C,B,A; custom reverse input [30,20,10]; inversion count 3; shared history scrubbing to event 9; invalid input rejection. The opening was visually inspected in the available narrow browser preview. Desktop projector layout, fullscreen behavior, drag gestures, and every combination of settings have not been exhaustively browser-tested. Check your actual presentation machine.

## Source map

- index.html — narrative, sections, controls, methodology, and disclosure.
- style.css — responsive visual design and presentation controls.
- script.js — original sorting implementations, traces, arena, heatmap, experiments, code, challenge, and core checks.
- theater.js — canvas projection, immersive dialog, and shared-trace race controls.
- experience.js — disorder/identity views, guided route, synchronized history, and additional checks.
- d3.min.js — bundled D3 v7.9.0; see D3-LICENSE.txt.
- verify.cjs / verify-experience.cjs — dependency-free Node verification runners.
- notes.html / PRESENTATION-NOTES.md — printable speaker guide and rehearsal plan.

## Course submission still requires your own context

This package improves the working visualization and presentation preparation. It does not claim to complete the required project PDF or mandatory live presentation. Add name(s), approved proposal alignment, actual instructor feedback and revisions, and actual audience evaluation. Do not invent these records. Prepare the required PDF sections, labeled screenshots of every view, working visualization and source links, launch instructions, references, and AI disclosure. Host the project if your submission requires a shareable URL.

## Attribution

The original HTML, CSS, and JavaScript were supplied by the student. ChatGPT assisted with implementation, design, speaker notes, and automated checks. Sorting algorithms are established methods. D3: https://d3js.org/. Related visualization: https://visualgo.net/en/sorting. Cormen et al., Introduction to Algorithms, is an algorithm reference. D3's license is included alongside the bundled library.

# SortStudio 4.0 — Order from the Chaos

## Open and present

Extract the whole folder and double-click index.html. All libraries, styles, and scripts are local; no internet, account, installation, API key, or build step is required. Keep the files together. A separate single-file HTML edition is also supplied outside the source folder.

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

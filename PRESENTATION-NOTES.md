# Order from the Chaos — 15-minute presentation

Use this as a rehearsal script. The plan is **13 minutes of explanation and live demonstrations, followed by 2 minutes of discussion**. Demonstration and audience-response time is included in each slot. Practice once with a timer; move on when a slot ends rather than waiting for every animation to finish. The guided mode has 13 stops, prepared examples, brief prompts, and an elapsed clock. Use the full script on a second device or print it so the audience sees the visualizations.

## Before class

Extract the entire folder. Open index.html. The bundled D3 library means the charts work without internet. Keep all files together. Use a laptop or projector at normal browser zoom; maximize the browser for the three-lane layout. Click “Start the guided presentation.” Next moves between stops; Exit or Escape ends the tour. Tour time ranges are cues, not automatic transitions. Advancing into the arena, hypothesis experiment, and code explorer deliberately loads prepared examples. Going Back preserves your current experiment.

Have script.js open in your code editor, especially `make`, `snap`, and `insertion`. Have a terminal ready for `node verify.cjs` and `node verify-experience.cjs`, or use the verification text in the Methods section. Add your name and your own approved proposal/feedback context before presenting. Do not claim usability feedback you have not collected.

## Optional visual opener: use within the existing first minute

Click **Launch Sorting Theater**, then **Begin the race**. Say: “All three lanes receive the same numbers. They will reach the same answer, but watch how different their journeys are.” Let it run for about 15 seconds, pause, and close the theater. This replaces part of the introduction; do not add time to the 15-minute plan. Avoid calling the race a CPU-speed benchmark. Its height represents value, its horizontal coordinate represents array position, and the shared clock advances recorded events.

## 0:00–1:00 — Opening: a deceptively simple question

**Show:** the opening hero and research question. Guided stop 1.

**Say:**

“Here is a task that sounds almost finished: I give a computer a list of numbers that is already in order, and I ask it to sort the list. How much work should that take?

“My project, SortStudio, explores why the same answer can hide very different processes. All three algorithms produce a correctly ordered list. But they inspect different pairs, move values differently, and respond differently to the initial order.

“The question is: how do input structure and the way we measure work change which algorithm looks best?

“I count three things. A comparison checks the order of two values. An array write changes one array cell. A recorded event is one frame in my instrumented model. Events are useful for animation, but they are not seconds of CPU time.”

**Transition:** “First, let’s look inside the process.”

## 1:00–2:30 — Arena: three mechanisms, identical conditions

**Do:** Next loads nine reverse-ordered values in ascending mode. Start the race, pause after a few ticks, then Step +1 twice. Continue talking while it animates; you do not need to wait for completion.

**Say:**

“All lanes receive identical values and the same requested direction. Bubble compares neighbors and swaps an out-of-order pair. That gradually pushes larger values to the right. Selection searches the remaining suffix for the smallest value, then places it with a swap. Insertion takes a key and fits it into a sorted prefix by shifting other values.

“The gold bars identify active positions. Each lane advances one recorded event per tick. Notice that a comparison, a candidate update, and a write can each generate frames. The lane that finishes first has the shortest recorded trace under this instrumentation. That is a precise claim; it does not establish the fastest implementation on a real machine.

“The key lesson is that the processes differ before we ever talk about large datasets. These different mechanisms will explain the patterns and operation counts in the next views.”

**Point out:** the native movement counters deliberately say swaps for Bubble and Selection, writes for Insertion. The experiment later converts to common array-write units.

## 2:30–3:30 — Heatmap: where comparisons happen

**Do:** Next. Switch Algorithm from Bubble to Selection, then Insertion. Hover one cell to inspect its actual count.

**Say:**

“A race shows changes over time. A heatmap compresses those changes into a spatial pattern. Rows and columns are array positions. Brighter cells indicate more recorded comparisons involving that position pair.

“Bubble produces a band along the diagonal because it compares neighboring positions. Selection reaches across its unsorted suffix, so its pattern spreads out. Insertion works backward through a prefix.

“One important modeling detail is that Insertion holds its key outside the array. Its heatmap records the scanned cell and next insertion slot. It should not be read as two permanently identified values sitting in those cells. The map is mirrored, and its color range rescales for each algorithm, so compare actual counts before comparing brightness across algorithms.”

## 3:30–5:00 — Controlled experiment: ask the class

**Do:** Next loads sorted n = 20 and comparison counts. Ask the question before selecting any answer.

**Ask:** “For 20 already sorted values, who expects Bubble to use the fewest comparisons? Selection? Insertion? Or a tie?”

**Pause:** allow 15–20 seconds for hands or answers. Select Tie and Run experiment.

**Say:**

“Bubble and Insertion tie at 19 comparisons. Selection uses 190. Bubble exits after a pass with no swaps. Insertion immediately finds that each key belongs after its predecessor. Selection still searches every remaining suffix. It does not contain a shortcut that recognizes this global order.

“We can explain 190 without trusting the animation: Selection makes 19 plus 18 plus 17 comparisons, continuing down to 1. That is n times n minus one, divided by two.

“Now I’ll change the measurement to array writes and run again. Bubble and Selection write nothing on this sorted input. Insertion still performs 19 final key writes in this implementation. The data did not change, but the question changed, so the result changed.”

**Do:** select Array writes and Run experiment. Explain why a swap counts as two array-cell writes. Local variables and loop checks are excluded.

## 5:00–6:00 — Playground: intervene, do not just observe

**Do:** Next. Apply `10, 20, 30, 40, 50`, then swap the first and last bars. Use clicking or keyboard selection.

**Say:**

“This is an intervention on input order. I can hold the values and length constant while changing their positions. That makes the comparison more controlled than changing everything at once.

“The arena, heatmap, code explorer, operation history, and inversion view all rebuild from this starting array. The controlled experiment and scaling study have separate generated inputs, which keeps their settings explicit.

“A useful hypothesis is that nearly sorted inputs should always be easy. But ‘nearly’ needs a definition. Moving one value a long distance can create many out-of-order pairs. Later I will quantify that disorder instead of relying on appearance.”

**Transition:** “Before counting disorder, let’s connect the animation to code.”

## 6:00–7:00 — Code explorer: how the project is built

**Do:** Next loads `[30,20,10]` and Insertion. Step through compare, shift, and insert. Briefly show the corresponding source functions in your editor.

**Say:**

“The preparation workflow is input, algorithm, event trace, then visual encoding. A snapshot stores the array state, cumulative comparison and movement counters, active positions, phase, and optional compared positions or held key.

“Here the key is 20. We compare it with 30, shift 30 right, and write 20 into the gap. A temporary duplicate is expected because the key is held in a local variable. The message makes that external value explicit.

“The same snapshots drive the arena and code explorer. I am not inventing a separate animation that merely resembles sorting. The display is generated from the algorithm’s recorded operations. The pseudocode is conceptual; script.js contains the actual executable implementation.”

## 7:00–7:45 — Quick comprehension check

**Do:** Next. Read the displayed highlighted pair and ask the audience to predict. Click the chosen answer. Generate another only if time permits.

**Say:**

“For ascending Bubble Sort, the rule is strictly greater than. If the left value is greater, they swap. If the values are equal, they stay. That detail will matter when we talk about equal-valued records.

“This view is a small formative check. A correct answer is evidence of understanding this local rule; a single answer does not establish broader learning gains.”

## 7:45–9:00 — Growth: connect small observations to size

**Do:** Next. Choose Sorted, then Reverse. Inspect the table at n = 40.

**Say:**

“The arena is deliberately small enough to watch. This view measures comparison counts over increasing input sizes using the same functions.

“For sorted input, Bubble and Insertion grow linearly: at n equals 40 they each use 39 comparisons. Selection uses 780. For reverse order with distinct values, all three perform n times n minus one divided by two comparisons.

“Doubling n does not always double the work. For Selection, n equals 20 gives 190 comparisons, while n equals 40 gives 780, a little more than four times as many. The exact formula explains why the ratio approaches four as n grows.

“The random option is seeded and reproducible. It uses one sample at each size, so I do not claim it estimates an average or provides uncertainty bounds. Those would require repeated independent samples.”

## 9:00–9:30 — Operation history: how work accumulates

**Do:** Next. Move Inspect event slowly.

**Say:**

“Here the horizontal axis is the recorded event index, and the vertical axis is cumulative comparisons. The cursor is synchronized with the arena. Plateaus represent events that are not comparisons, such as writes or candidate changes.

“This is a bridge between an individual operation and the final count. A steeper curve does not mean more CPU work per second, because the horizontal unit is an event, not elapsed time.”

## 9:30–10:30 — Inversions: explain the hidden cost

**Do:** Next. Read the current inversion count and corresponding Bubble swaps. Explain one lit pair.

**Say:**

“An inversion is a pair of positions whose values are in the wrong relative order. We only count i less than j, so each pair appears once in the triangular matrix.

“The insight is that swapping adjacent out-of-order values removes exactly one inversion. Bubble therefore needs one swap per initial inversion. Insertion’s shifts remove the same disorder, while its final key placements add n minus one array writes.

“This connects a property of the input to the work required by the algorithm. It is more informative than calling an array messy. It also explains why distant Selection swaps can repair several inversions at once.”

## 10:30–11:30 — Stability: a different kind of correctness

**Do:** Next. Select Selection and step to completion. Follow the labels A and B. Then switch to Bubble and step through if time permits.

**Say:**

“These records are 20A, 20B, and 10C. A and B have equal keys, but distinct identities. A stable sort preserves their original relative order.

“Selection swaps 10C with 20A. That places A after B. The final numeric keys are correct, but the equal-key order has changed.

“The strict adjacent swaps in Bubble do not exchange equal keys. Insertion shifts only strictly greater keys and inserts after equals. Those choices preserve equal-key order. This small example illustrates a practical issue when records contain more than just a number, such as a prior ordering we want to retain. It is an illustration, not a proof of every possible implementation.”

## 11:30–12:30 — Verification, workflow, and limits

**Do:** Next. Open Model, schema, workflow, and numerical verification. Show the displayed checks and briefly point to the export button. If convenient, run both test commands in the prepared terminal.

**Say:**

“This project is an explicitly labeled algorithm simulation. It has no external observational dataset. Inputs are generated or validated as integer arrays; invalid custom entries are rejected rather than silently imputed.

“The two verification suites pass 720 assertions. They test sorted output, preservation of input, duplicates, both directions, empty and singleton cases, numerical counts, inversion identities, and the tagged-record example.

“For an independently checkable example, [3,2,1] needs three comparisons for all three algorithms. Bubble makes three swaps, which is six array writes. Selection makes one swap, or two writes. Insertion makes five writes.

“Limitations include small input sizes, one random sample per scaling size, no runtime or memory profiling, and implementation-specific event counts. I disclose AI assistance and distinguish automated checks from user evaluation.”

**Add your own evidence:** one sentence about real feedback and the revision it caused, if you have collected it. If not, state that usability evaluation is still a next step.

## 12:30–13:00 — Conclusion

**Do:** Next. Show the three findings.

**Say:**

“My answer is that already sorted does not mean zero work, and the amount of remaining work depends on the mechanism. Input structure changes comparisons and movement. Changing the metric can change which algorithm looks best. And correct numeric order is not the only property that matters.

“The main contribution of this project is the connection between a visible operation, its spatial pattern, a reproducible count, and an explanation of that count.”

## 13:00–15:00 — Discussion

**Ask:** “Suppose your data is almost sorted, array writes are expensive, and equal-valued records must keep their relative order. What would you measure or test before choosing an algorithm?”

Let the class reason from the evidence. Avoid declaring a universal winner. These requirements can pull in different directions: Insertion exploits existing order and preserves stability here; Selection reduces swaps but can break equal-key order; actual runtime requires benchmarking representative data and implementations.

If there are no questions, use one of these:

- “Why is 780 comparisons at n = 40 stronger evidence than saying the animation looked slow?”
- “What extra experiment would we need to estimate average behavior on random inputs?”
- “What would happen if the requested direction changed from ascending to descending?”

## Backup answers

**Why no 3D?** Position-pair matrices, zero-baseline bars, and lines directly encode the quantities being explained. Depth would add occlusion without providing another scientific variable in this model.

**Why only three classical algorithms?** They offer contrasting local exchange, suffix search, and prefix insertion mechanisms. This is a controlled explanatory study, not a survey of modern production sorting.

**Why not say Selection is always fastest?** Low array-write counts do not determine total runtime. It still makes quadratic comparisons and can be unstable.

**Does Insertion really write on sorted data?** This specific implementation performs a final array assignment for every key, even when the value is already in place. An implementation that avoids those assignments would have different write counts.

**What is original here?** Describe the project's question and combination of controlled hypotheses, spatial comparison patterns, inversion accounting, identity stability, and shared traces. Do not claim the sorting algorithms themselves are new.

**What if the demo fails?** Keep the source and recorded numerical examples available. Explain the model and verification; restore the working page. A backup is useful, but it does not replace the assignment's mandatory live working demonstration.

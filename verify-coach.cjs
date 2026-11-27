"use strict";

const assert = require("node:assert/strict");
const {answer, challenge} = require("./sort-coach.js");

// An independent, synthetic fixture spot-checks the coach's evidence boundary.
const definitions = [
  ["bubble", "Bubble Sort", "Exchange", true, {comparisons: 3, writes: 4, swaps: 2, auxWrites: 0}],
  ["selection", "Selection Sort", "Selection", false, {comparisons: 3, writes: 2, swaps: 1, auxWrites: 0}],
  ["merge", "Merge Sort", "Merge", true, {comparisons: 2, writes: 5, swaps: 0, auxWrites: 3}],
  ["quick", "Quick Sort", "Partition", false, {comparisons: 4, writes: 2, swaps: 1, auxWrites: 0}],
  ["quick-three-way", "Three-Way Quick Sort", "Partition", false, {comparisons: 3, writes: 2, swaps: 1, auxWrites: 0}],
  ["counting", "Counting Sort", "Distribution", true, {comparisons: 0, writes: 3, swaps: 0, auxWrites: 6}],
];
const algorithms = definitions.map(([id, name, family, stable]) => ({
  id, name, family, stable, best: "O(n)", average: "O(n²)", worst: "O(n²)", space: "O(1)",
  description: `${name} uses its recorded mechanism.`,
}));
const calls = [];
const base = [2, 2, 1];
const engine = {
  algorithms,
  run(id, initial, direction, options) {
    calls.push({id, initial, direction, options});
    if (id === "counting" && Math.max(...initial) - Math.min(...initial) + 1 > 16_384) {
      throw new Error("The key range exceeds the algorithm limit.");
    }
    const sorter = direction === "asc" ? (a, b) => a - b : (a, b) => b - a;
    const result = [...initial].sort(sorter);
    const resultIds = initial.map((_, index) => index).sort((a, b) => sorter(initial[a], initial[b]));
    if (id === "selection" && initial.join() === base.join() && direction === "asc") [resultIds[1], resultIds[2]] = [resultIds[2], resultIds[1]];
    const metrics = definitions.find(row => row[0] === id)[4];
    return {direction, initial, result, resultIds, metrics};
  },
};
const zero = {comparisons: 0, writes: 0, swaps: 0, auxWrites: 0};
const frames = [
  {phase: "ready", values: base, indices: [], message: "Ready", metrics: zero},
  {phase: "compare", values: base, indices: [1, 2], message: "Compare 2 and 1", metrics: {...zero, comparisons: 1}},
  {phase: "swap", values: [2, 1, 2], indices: [1, 2], message: "Swap 2 and 1", metrics: {...zero, comparisons: 1, writes: 2, swaps: 1}},
  {phase: "done", values: [1, 2, 2], indices: [], message: "Sorted", metrics: {...zero, comparisons: 2, writes: 4, swaps: 2}},
];
const staged = {direction: "asc", initial: base, events: frames, at: index => frames[index]};
const context = {engine, input: base, direction: "asc", focusId: "bubble", lanes: [
  {id: "bubble", run: staged, index: 1}, {id: "selection", run: staged, index: 0},
]};

const step = answer("Explain this step", context);
assert.equal(step.intent, "step");
assert.match(step.title, /Bubble Sort.*event 2 of 4/);
assert.equal(step.text, "Compare 2 and 1");
assert.ok(step.evidence.some(line => line.includes("positions 2, 3 (one-based)")));
assert.equal(answer("Why did it swap?", {...context, lanes: [{...context.lanes[0], index: 2}]}).text, "Swap 2 and 1");
assert.match(answer("How many comparisons so far?", context).text, /Through event 2.+1 comparison/);
assert.match(answer("Why so many comparisons?", context).text, /completed trace.+3 comparisons/);
assert.match(answer("What causes the high counts?", context).evidence.join(" "), /2 inversions/);
assert.match(answer("Tell me about inversion count in descending order", context).text, /0 inversions/);
assert.match(answer("What is the complexity of Merge Sort?", context).title, /Merge Sort complexity/);
assert.match(answer("Why use this algorithm?", context).text, /Bubble Sort uses/);
assert.match(answer("Is Selection Sort stable?", context).evidence.join(" "), /order changed for 2/);
assert.match(answer("Is Bubble Sort stable?", context).evidence.join(" "), /order of equal keys was preserved/);
assert.match(answer("Explain duplicate stability", {...context, input: [8, 5, 2]}).evidence.join(" "), /repeated values/);

assert.match(answer("Which has fewer writes?", context).text, /Selection Sort used the fewest main-array writes \(2\)/);
assert.match(answer("Compare these algorithms", context).text, /Bubble Sort, Selection Sort tied/);
assert.match(answer("Which algorithm is fastest?", context).text, /runtime comparison requires timing both implementations/);
assert.match(answer("Compare Merge Sort and Counting Sort", context).evidence.join(" "), /zero value comparisons/);
assert.match(answer("Compare auxiliary writes of Merge Sort vs Counting Sort", context).text, /Merge Sort used the fewest auxiliary writes/);
const requested = answer("Compare Bubble Sort vs Merge Sort on [4, -1, 4] descending", context);
assert.match(requested.evidence[0], /descending workload.*\[4, -1, 4\]/);
assert.deepEqual(calls.at(-1), {id: "merge", initial: [4, -1, 4], direction: "desc", options: {trace: false}});
const aliases = answer("Compare 3-way Quick Sort versus Quick Sort", context);
assert.ok(aliases.evidence.some(line => line.startsWith("Quick Sort recorded")));
assert.ok(aliases.evidence.some(line => line.startsWith("Three-Way Quick Sort recorded")));
assert.match(answer("Compare all algorithms on [1, 50000]", context).evidence.join(" "), /Counting Sort could not run/);
assert.match(answer("Compare on [1, 0.25]", context).title, /integer array/);
assert.match(answer("Compare on [1] and [2]", context).title, /integer array/);
assert.match(answer("Compare on [1,", context).title, /integer array/);
assert.match(answer("Are you an AI model?", context).text, /local intent matcher/);
assert.equal(answer("Do aliens exist?", context).intent, "help");
assert.equal(answer("Compare Paris versus Lima", context).intent, "help");
assert.equal(answer("", context).intent, "help");
assert.match(answer("Predict the next event", context).text, /hidden until/);

const prediction = challenge(context);
assert.ok(prediction.options.some(option => option.id === "swap"));
assert.equal(prediction.reveal("invalid"), null);
assert.ok(!JSON.stringify(prediction).includes("Swap 2 and 1"));
const result = prediction.reveal("swap");
assert.equal(result.correct, true);
assert.equal(result.text, "Swap 2 and 1");
assert.equal(prediction.reveal("compare"), result);
const wrong = challenge(context).reveal("compare");
assert.equal(wrong.correct, false);
assert.equal(wrong.answer, "Swap items");
assert.ok(challenge({...context, lanes: [{...context.lanes[0], index: 2}]}).reveal("finish").correct);
assert.equal(challenge({...context, lanes: [{...context.lanes[0], index: 3}]}), null);
assert.equal(challenge({engine, lanes: []}), null);

const real = require("./sort-engine.js");
const initial = [2, 2, 1];
const bubbleRun = real.run("bubble", initial);
const selectionRun = real.run("selection", initial);
const realContext = {engine: real, input: initial, lanes: [
  {id: "bubble", run: bubbleRun, index: 2}, {id: "selection", run: selectionRun, index: 0},
]};
const liveStep = answer("Explain this step", realContext);
assert.equal(liveStep.text, bubbleRun.events[2].message);
assert.ok(liveStep.evidence.includes("Compared values 2 and 1."));
const afterSwap = answer("Explain this step", {...realContext, lanes: [{id: "bubble", run: bubbleRun, index: 3}]});
assert.ok(afterSwap.evidence.includes("Writes to working positions 2 ← 1 (original position 3), 3 ← 2 (original position 2)."));
assert.match(answer("Which has fewer writes?", realContext).text, /Selection Sort used the fewest main-array writes \(2\)/);
assert.match(answer("Is Selection Sort stable?", realContext).evidence.join(" "), /order changed for 2/);
assert.match(answer("Why so many comparisons?", realContext).evidence.join(" "), /Each Bubble Sort swap removes exactly one inversion/);
const allAlgorithms = answer("Compare all algorithms on [4, -2, 4, -2] descending", realContext);
assert.equal(allAlgorithms.evidence.filter(line => line.includes(" recorded ")).length, 20);
assert.match(allAlgorithms.evidence[0], /Same descending workload with 4 items \[4, -2, 4, -2\]/);
assert.match(allAlgorithms.evidence.find(line => line.startsWith("Counting Sort recorded")), /0 comparisons, 4 main-array writes/);

const knownEvents = new Map([["compare", "compare"], ["swap", "swap"], ["write", "write"],
  ["auxiliary", "auxiliary"], ["range", "focus"], ["done", "finish"]]);
for (const id of ["bubble", "counting"]) {
  const run = real.run(id, initial);
  for (let index = 0; index < run.events.length - 1; index++) {
    const event = run.events[index + 1];
    const exercise = challenge({engine: real, input: initial, lanes: [{id, run, index}]});
    assert.equal(exercise.options.length, 6);
    const revealed = exercise.reveal(knownEvents.get(event.phase));
    assert.equal(revealed.correct, true);
    assert.equal(revealed.text, event.message);
  }
}

console.log("Verified offline coach intent, exact trace evidence, all 20 same-input engine comparisons, equal-key ranking, and hidden predictions.");

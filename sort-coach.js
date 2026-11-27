(function (root, factory) {
  const coach = factory();
  if (typeof module === "object" && module.exports) module.exports = coach;
  else root.SortCoach = coach;
})(globalThis, function () {
  "use strict";

  const actions = {
    compare: "Compare values",
    swap: "Swap items",
    write: "Write into the main array",
    auxiliary: "Write into auxiliary storage",
    focus: "Move focus or mark progress",
    finish: "Finish the run",
  };
  const defaults = ["Explain this step", "Compare these algorithms", "Why so many comparisons?", "Is this sort stable?"];
  const aliases = {
    "binary-insertion": ["binary insertion", "binary insertion sort"],
    cocktail: ["cocktail shaker", "cocktail shaker sort", "shaker sort"],
    "odd-even": ["oddeven", "brick sort"],
    "natural-merge": ["natural mergesort"],
    "quick-three-way": ["3 way quick sort", "three way quick sort", "three way quicksort", "3 way quicksort", "dutch flag quicksort"],
  };

  const normalize = value => String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const nameOf = algorithm => algorithm?.name || "The selected algorithm";
  const reply = (intent, title, text, evidence = [], suggestions = defaults) => ({intent, title, text, evidence, suggestions});
  const valuesLabel = values => `[${values.slice(0, 12).join(", ")}${values.length > 12 ? ", …" : ""}]`;
  const isInput = value => Array.isArray(value) && value.length <= 128 && Array.from(value).every(Number.isSafeInteger);

  function currentContext(context = {}) {
    const engine = context.engine || globalThis.SortStudioEngine;
    const catalog = Array.isArray(engine?.algorithms) ? engine.algorithms : [];
    const byId = new Map(catalog.map(algorithm => [algorithm.id, algorithm]));
    const lanes = Array.isArray(context.lanes) ? context.lanes.filter(lane => byId.has(lane?.id)) : [];
    const focus = lanes[context.focusLane] || lanes.find(lane => lane.id === context.focusId) || lanes[0];
    const input = isInput(context.input) ? context.input : isInput(focus?.run?.initial) ? focus.run.initial : null;
    const direction = (context.direction || focus?.run?.direction) === "desc" ? "desc" : "asc";
    return {engine, catalog, byId, lanes, focus, input, direction};
  }

  function frameAt(lane) {
    const length = lane?.run?.events?.length;
    if (!length || typeof lane.run.at !== "function") return null;
    const index = Math.max(0, Math.min(length - 1, Number.isInteger(lane.index) ? lane.index : 0));
    return {frame: lane.run.at(index), index, length};
  }

  function referencedAlgorithms(question, catalog) {
    const words = ` ${normalize(question)} `;
    const matches = [];
    for (const algorithm of catalog) {
      const spellings = [algorithm.id, algorithm.name, `${algorithm.id} sort`, ...(aliases[algorithm.id] || [])];
      for (const spelling of new Set(spellings.map(normalize).filter(Boolean))) {
        const probe = ` ${spelling} `;
        for (let start = words.indexOf(probe); start !== -1; start = words.indexOf(probe, start + 1)) {
          matches.push({algorithm, start, end: start + probe.length - 1});
        }
      }
    }
    const accepted = [];
    for (const found of matches.sort((a, b) => (b.end - b.start) - (a.end - a.start) || a.start - b.start)) {
      if (!accepted.some(other => found.start < other.end && other.start < found.end)) accepted.push(found);
    }
    return [...new Set(accepted.sort((a, b) => a.start - b.start).map(match => match.algorithm))];
  }

  function inputFacts(input, direction) {
    let inversions = 0;
    for (let i = 0; i < input.length; i++) {
      for (let j = i + 1; j < input.length; j++) {
        if (direction === "asc" ? input[i] > input[j] : input[i] < input[j]) inversions++;
      }
    }
    const duplicates = input.length - new Set(input).size;
    return {inversions, duplicates};
  }

  function metricText(metrics) {
    const quantity = (value, unit) => `${value} ${unit}${value === 1 ? "" : "s"}`;
    return `${quantity(metrics.comparisons, "comparison")}, ${quantity(metrics.writes, "main-array write")}, ${quantity(metrics.swaps, "swap")}, and ${quantity(metrics.auxWrites, "auxiliary write")}`;
  }

  function requestedWorkload(question, ctx) {
    const arrays = [...question.matchAll(/\[([^\]]*)\]/g)];
    const directionWords = normalize(question);
    const direction = /\bdesc(?:ending)?\b/.test(directionWords) ? "desc" : /\basc(?:ending)?\b/.test(directionWords) ? "asc" : ctx.direction;
    if (arrays.length > 1 || (arrays.length === 0 && /[\[\]]/.test(question))) return null;
    if (!arrays.length) return {...ctx, direction};
    const fields = arrays[0][1].trim();
    const entries = fields ? fields.split(",").map(value => value.trim()) : [];
    if (!entries.every(value => /^[+-]?\d+$/.test(value))) return null;
    const input = entries.map(Number);
    return isInput(input) ? {...ctx, input, direction} : null;
  }

  function explainFrame(lane, ctx) {
    const state = frameAt(lane);
    if (!state) return reply("step", "No frame is selected", "Choose an algorithm and start or step through its recorded trace.");
    const {frame, index, length} = state;
    const title = `${nameOf(ctx.byId.get(lane.id))} · event ${index + 1} of ${length}`;
    const evidence = [`At this event the trace records ${metricText(frame.metrics)}.`];
    if (frame.indices?.length) evidence.push(`Highlighted positions ${frame.indices.map(position => position + 1).join(", ")} (one-based).`);
    if (frame.operands?.length) evidence.push(`Compared values ${frame.operands.join(" and ")}.`);
    if (frame.patches?.length) {
      const changes = frame.patches.map(({index: position, value, id}) => `${position + 1} ← ${value} (original position ${id + 1})`);
      evidence.push(`Writes to working positions ${changes.join(", ")}.`);
    }
    if (Array.isArray(frame.values)) evidence.push(`Working array ${valuesLabel(frame.values)}.`);
    return reply("step", title, frame.message, evidence, ["Why so many comparisons?", "How does this algorithm work?", "Is this sort stable?"]);
  }

  function measuredRuns(ctx, algorithms) {
    const runs = [];
    const skipped = [];
    for (const algorithm of algorithms) {
      try {
        const run = ctx.engine.run(algorithm.id, ctx.input, ctx.direction, {trace: false});
        runs.push({algorithm, run});
      } catch (error) {
        skipped.push(`${algorithm.name} could not run on this input. ${String(error.message || error)}`);
      }
    }
    return {runs, skipped};
  }

  function compare(ctx, algorithms, question) {
    if (!ctx.input || algorithms.length < 2) return reply("compare", "Choose a workload", "Load one input and select or name two algorithms to obtain a measured comparison.");
    const {runs, skipped} = measuredRuns(ctx, algorithms);
    if (runs.length < 2) return reply("compare", "Two results are needed", "Choose two algorithms that can run on the same input.", skipped);
    const unit = /\bauxiliary\s+writes?\b/.test(question) ? "auxWrites" : /\bswaps?\b/.test(question) ? "swaps" : /\bwrites?\b/.test(question) ? "writes" : "comparisons";
    const unitLabel = {comparisons: "value comparisons", writes: "main-array writes", swaps: "swaps", auxWrites: "auxiliary writes"}[unit];
    const minimum = Math.min(...runs.map(({run}) => run.metrics[unit]));
    const winners = runs.filter(({run}) => run.metrics[unit] === minimum).map(({algorithm}) => algorithm.name);
    const result = winners.length === 1 ? `${winners[0]} used the fewest ${unitLabel}` : `${winners.join(", ")} tied for the fewest ${unitLabel}`;
    const speedCaveat = /\b(fastest|faster|speed|quickest|runtime|timing|time)\b/.test(question) ? " A runtime comparison requires timing both implementations." : "";
    const evidence = [
      `Same ${ctx.direction === "asc" ? "ascending" : "descending"} workload with ${ctx.input.length} items ${valuesLabel(ctx.input)}.`,
      ...runs.map(({algorithm, run}) => `${algorithm.name} recorded ${metricText(run.metrics)}.`),
      ...skipped,
    ];
    if (runs.some(({algorithm}) => /distribution|non comparison|distributional|digit/.test(normalize(algorithm.family)))) {
      evidence.push("A distribution sort can use digit or bucket work with zero value comparisons. Read comparisons alongside writes and the algorithm mechanism.");
    }
    return reply("compare", "Measured operation counts", `${result} (${minimum}) on this input.${speedCaveat}`, evidence);
  }

  function measure(ctx, algorithm, question) {
    if (!algorithm || !ctx.input) return reply("counts", "Choose an input", "Load an input and select an algorithm to see operation counts.");
    const lane = ctx.lanes.find(item => item.id === algorithm.id);
    const current = /\b(so far|current|this step|this frame|right now)\b/.test(question);
    const sameInput = lane?.run?.direction === ctx.direction && lane?.run?.initial?.length === ctx.input.length &&
      ctx.input.every((value, index) => value === lane.run.initial[index]);
    const state = current && sameInput && frameAt(lane);
    const {runs, skipped} = state ? {runs: [], skipped: []} : measuredRuns(ctx, [algorithm]);
    if (!state && !runs.length) return reply("counts", `${algorithm.name} on this input`, "The trace could not be generated.", skipped);
    const metrics = state ? state.frame.metrics : runs[0].run.metrics;
    const {inversions, duplicates} = inputFacts(ctx.input, ctx.direction);
    const evidence = [`Input ${valuesLabel(ctx.input)} has ${inversions} inversions and ${duplicates} entries beyond the first occurrence of each key.`];
    const metric = /\bauxiliary\b/.test(question) ? "auxWrites" : /\bwrites?\b/.test(question) ? "writes" :
      /\bswaps?\b/.test(question) ? "swaps" : "comparisons";
    evidence.push(ctx.engine.metricDefinitions?.[metric] || "Comparisons, main-array writes, swaps, and auxiliary writes are recorded separately.");
    if (algorithm.id === "bubble") evidence.push("Each Bubble Sort swap removes exactly one inversion. An ordered sweep can still compare neighbors without swapping.");
    if (algorithm.id === "selection") evidence.push("Selection Sort scans the remaining suffix for each position. The full run makes n × (n − 1) / 2 comparisons regardless of the input order.");
    if (algorithm.id === "counting" || algorithm.id === "radix") {
      evidence.push("The counters can record zero value comparisons while the algorithm writes to distribute records and rebuild the array.");
    }
    if (algorithm.description) evidence.push(algorithm.description);
    return reply("counts", `${algorithm.name} operation counts`,
      `${state ? `Through event ${state.index + 1}, the trace records` : "The completed trace records"} ${metricText(metrics)}.`, evidence);
  }

  function stability(ctx, algorithm) {
    if (!algorithm) return reply("stability", "Stability preserves equal-key order", "Give equal records distinct identities. A stable implementation retains their original relative order.", [], ["Is Merge Sort stable?", "Is Quick Sort stable?"]);
    const evidence = ["Stability concerns the identities of equal keys. Two arrays can have identical sorted values while their equal records changed order."];
    const {duplicates} = ctx.input ? inputFacts(ctx.input, ctx.direction) : {duplicates: 0};
    let contradictsCatalog = false;
    if (duplicates) {
      const {runs, skipped} = measuredRuns(ctx, [algorithm]);
      const run = runs[0]?.run;
      if (run?.result?.length === ctx.input.length && run.resultIds?.every(Number.isInteger)) {
        const latest = new Map();
        const changed = new Set();
        run.result.forEach((value, index) => {
          const identity = run.resultIds[index];
          if (latest.has(value) && latest.get(value) > identity) changed.add(value);
          latest.set(value, identity);
        });
        contradictsCatalog = changed.size > 0 && algorithm.stable === true;
        evidence.push(changed.size ? `On this input the equal-key order changed for ${[...changed].join(", ")}.` : "On this input the relative order of equal keys was preserved.");
      }
      evidence.push(...skipped);
    } else evidence.push("Load an input containing repeated values to test the tracked record identities.");
    return reply("stability", `${algorithm.name} and equal keys`,
      contradictsCatalog ? "The catalog's stability claim conflicts with the observed identities on this input." :
        algorithm.stable === true ? "This implementation preserves the original relative order of equal keys." : "This implementation can reorder equal keys. Stability requires preserving equal-key order on every input.", evidence);
  }

  function mechanism(algorithm, complexity, ctx) {
    if (!algorithm) return reply("algorithm", "Select an algorithm", "Name one of the catalog algorithms or ask about the current lane.");
    const evidence = [`Operation complexity uses the implementation and input conditions in the catalog.`,
      `Best ${algorithm.best} · average ${algorithm.average} · worst ${algorithm.worst} · auxiliary space ${algorithm.space}.`];
    if (ctx?.input) {
      const {inversions, duplicates} = inputFacts(ctx.input, ctx.direction);
      evidence.push(`The current input has ${inversions} inversions and ${duplicates} duplicate entries. ${algorithm.stable ? "This implementation preserves equal-key order." : "Choose a stable implementation if equal-key order matters."}`);
    }
    return reply(complexity ? "complexity" : "algorithm", `${algorithm.name} ${complexity ? "complexity" : "mechanism"}`,
      algorithm.description, evidence, [`How many comparisons does ${algorithm.name} use?`, `Is ${algorithm.name} stable?`, "Explain this step"]);
  }

  function answer(question, context) {
    const input = String(question || "").slice(0, 500);
    const originalContext = currentContext(context);
    const ctx = requestedWorkload(input, originalContext);
    const words = normalize(input);
    if (!words) return reply("help", "Ask Sort Coach", "Ask about an exact trace step, a same-input comparison, duplicate stability, or a recorded operation count.");
    if (!ctx) return reply("help", "Use one integer array", "For a separate comparison, give one array of up to 128 safe integers, such as [4, 1, 4, -2].");
    const named = referencedAlgorithms(input, ctx.catalog);
    const algorithm = named[0] || ctx.byId.get(ctx.focus?.id);
    const focus = named.length ? ctx.lanes.find(lane => lane.id === algorithm.id) : ctx.focus;

    if (/\b(are you|ai model|llm|offline|hallucination|your source)\b/.test(words)) {
      return reply("scope", "Trace-grounded local coach", "Sort Coach interprets questions with a local intent matcher and answers from the selected data, recorded traces, and algorithm catalog. Questions outside that evidence are left open.");
    }
    if (/\b(stable|stability|equal keys|same key|duplicates?)\b/.test(words)) return stability(ctx, algorithm);
    if (/\b(predict|quiz|next event|next step)\b/.test(words)) {
      return reply("prediction", "Predict before advancing", "Use the prediction control to guess the next recorded operation. The coach keeps the next event hidden until you choose an answer.");
    }
    const compareQuestion = /\b(compare|versus|vs|fastest|faster|winner|fewest|fewer|least|quickest|which algorithm|better)\b/.test(words);
    const compareSubject = named.length || /\b(these|them|sorts?|algorithms?|lanes?|writes?|comparisons?|swaps?|fastest|faster)\b/.test(words) || /\[/.test(input);
    if (compareQuestion && compareSubject && (named.length > 1 || !/\b(step|frame|positions?)\b/.test(words))) {
      const algorithms = /\b(all|every)\b/.test(words) ? ctx.catalog : named.length > 1 ? named :
        [...new Set([...named, ...ctx.lanes.map(lane => ctx.byId.get(lane.id))])];
      return compare(ctx, algorithms, words);
    }
    if (/\b(complexity|big o|asymptotic|growth|memory|space|best case|worst case)\b/.test(words)) return mechanism(algorithm, true);
    if (/\b(inversions?|disorder|already sorted|reverse sorted|input order)\b/.test(words)) {
      if (!ctx.input) return reply("input", "Load an input to inspect", "Select an order and load an array to count its out-of-order pairs.");
      const {inversions, duplicates} = inputFacts(ctx.input, ctx.direction);
      return reply("input", "Disorder in the current input", `${valuesLabel(ctx.input)} has ${inversions} inversions under ${ctx.direction === "asc" ? "ascending" : "descending"} order. Pairs of equal values contribute zero inversions.`,
        [`${ctx.input.length} items, ${ctx.input.length - duplicates} distinct values.`, "For adjacent-exchange Bubble Sort, each swap removes exactly one inversion."]);
    }
    if (/\b(comparisons?|writes?|swaps?|counts?|counter|so far)\b/.test(words) && !/\b(explain this step|what happened|why did it)\b/.test(words)) {
      return measure(ctx, algorithm, words);
    }
    if (/\b(why use|why this algorithm|why choose|why pick)\b/.test(words)) return mechanism(algorithm, false, ctx);
    if (/\b(step|frame|highlight(?:s|ed|ing)?|event|what happened|why did|did it)\b/.test(words)) return explainFrame(focus, ctx);
    if (named.length || /\b(how does|mechanism|algorithm work|algorithm do)\b/.test(words)) return mechanism(algorithm, false);
    return reply("help", "That question is outside the current trace", "Ask about sorting steps, recorded counts, algorithm mechanisms, equal-key stability, or the current input. The coach uses the catalog and deterministic local runs.");
  }

  function challenge(context) {
    const ctx = currentContext(context);
    const state = frameAt(ctx.focus);
    if (!state || state.index + 1 >= state.length) return null;
    const next = ctx.focus.run.at(state.index + 1);
    const previousMetrics = state.frame.metrics;
    const actual = next.phase === "done" ? "finish" : next.metrics.comparisons > previousMetrics.comparisons ? "compare" :
      next.metrics.swaps > previousMetrics.swaps ? "swap" : next.metrics.writes > previousMetrics.writes ? "write" :
      next.metrics.auxWrites > previousMetrics.auxWrites ? "auxiliary" : "focus";
    const choices = Object.keys(actions);
    const seed = `${ctx.focus.id}:${state.index}:${ctx.input?.join(",") || ""}`;
    const shift = [...seed].reduce((hash, letter) => (Math.imul(hash, 31) + letter.charCodeAt(0)) >>> 0, 0) % choices.length;
    const options = [...choices.slice(shift), ...choices.slice(0, shift)].map(id => Object.freeze({id, label: actions[id]}));
    let revealed = null;
    return Object.freeze({
      prompt: `What does ${nameOf(ctx.byId.get(ctx.focus.id))} do after event ${state.index + 1}?`,
      options: Object.freeze(options),
      reveal(choice) {
        if (!options.some(option => option.id === choice)) return null;
        if (!revealed) revealed = Object.freeze({
          correct: choice === actual,
          answer: actions[actual],
          text: next.message,
          evidence: Object.freeze([`Recorded event ${state.index + 2} of ${state.length}.`, `The cumulative trace records ${metricText(next.metrics)}.`]),
        });
        return revealed;
      },
    });
  }

  return Object.freeze({answer, challenge});
});

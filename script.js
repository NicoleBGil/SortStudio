
"use strict";
if (typeof d3 === "undefined") {
  document.body.innerHTML = '<main style="max-width:680px;margin:60px auto;padding:24px;font-family:system-ui"><h1>SortStudio needs D3 to draw its charts</h1><p>Keep d3.min.js next to index.html, style.css, script.js, and experience.js. Extract the complete ZIP before opening the project.</p></main>';
  throw new Error("D3 dependency did not load");
}

// SORTSTUDIO 2.0 — INTERACTIVE SORTING LABORATORY

const $ = id => document.getElementById(id);

const names = ["bubble", "selection", "insertion"];

const palette = {
  bubble: "#9c82e2",
  selection: "#f28d67",
  insertion: "#31b3a8",
  active: "#f5be56",
  sorted: "#82c5a8"
};

let values = [];
let original = [];
let traces = {};
let battleTick = 0;
let battleTimer = null;
let chosen = null;
let codeStep = 0;
let quizScore = 0;
let quizTotal = 0;
let quizAnswered = false;
let quizPair = [];
let quizArray = [];

const dir = () => $("direction").value;

const bad = (a, b, d) => d === "asc" ? a > b : a < b;
const good = (a, b, d) => d === "asc" ? a <= b : a >= b;


// ==========================================
// 1. SORTING ALGORITHMS AND EVENT TRACES
// ==========================================

function snap(a, t, c, m, active, msg, phase = "ready", pairs = null) {
  t.push({
    a: [...a],
    c,
    m,
    active: [...active],
    msg,
    phase,
    pairs
  });
}

function bubble(a, d = "asc") {
  a = [...a];
  const t = [];
  let c = 0;
  let m = 0;

  snap(a, t, c, m, [], "Ready");

  for (let i = 0; i < a.length - 1; i++) {
    let changed = false;

    for (let j = 0; j < a.length - 1 - i; j++) {
      c++;

      snap(
        a, t, c, m, [j, j + 1],
        `Compare ${a[j]} and ${a[j + 1]}`,
        "compare",
        [j, j + 1]
      );

      if (bad(a[j], a[j + 1], d)) {
        [a[j], a[j + 1]] = [a[j + 1], a[j]];
        m++;
        changed = true;

        snap(
          a, t, c, m, [j, j + 1],
          `Swap ${a[j]} and ${a[j + 1]}`,
          "swap"
        );
      }
    }

    if (!changed) break;
  }

  snap(a, t, c, m, [], "Sorted!", "done");
  return t;
}

function selection(a, d = "asc") {
  a = [...a];
  const t = [];
  let c = 0;
  let m = 0;

  snap(a, t, c, m, [], "Ready");

  for (let i = 0; i < a.length - 1; i++) {
    let best = i;

    for (let j = i + 1; j < a.length; j++) {
      c++;

      snap(
        a, t, c, m, [best, j],
        `Compare ${a[best]} and ${a[j]}`,
        "compare",
        [best, j]
      );

      if (bad(a[best], a[j], d)) {
        best = j;

        snap(
          a, t, c, m, [best],
          `New candidate ${a[best]}`,
          "select"
        );
      }
    }

    if (best !== i) {
      [a[i], a[best]] = [a[best], a[i]];
      m++;

      snap(
        a, t, c, m, [i, best],
        `Place ${a[i]} at position ${i + 1}`,
        "swap"
      );
    }
  }

  snap(a, t, c, m, [], "Sorted!", "done");
  return t;
}

function insertion(a, d = "asc") {
  a = [...a];
  const t = [];
  let c = 0;
  let m = 0;

  snap(a, t, c, m, [], "Ready");

  for (let i = 1; i < a.length; i++) {
    const key = a[i];
    const firstFrame = t.length;
    let j = i - 1;

    while (j >= 0) {
      c++;

      snap(
        a, t, c, m, [j, j + 1],
        `Compare ${a[j]} with key ${key}`,
        "compare",
        [j, j + 1]
      );

      if (good(a[j], key, d)) break;

      a[j + 1] = a[j];
      m++;

      snap(
        a, t, c, m, [j, j + 1],
        `Shift ${a[j]} right`,
        "shift"
      );

      j--;
    }

    a[j + 1] = key;
    m++;

    snap(
      a, t, c, m, [j + 1],
      `Insert ${key}`,
      "insert"
    );
    for (let k = firstFrame; k < t.length; k++) {
      t[k].key = key;
      t[k].msg += ` · held key: ${key}`;
    }
  }

  snap(a, t, c, m, [], "Sorted!", "done");
  return t;
}

const algorithms = {
  bubble,
  selection,
  insertion
};


// ==========================================
// 2. ARRAY GENERATION
// ==========================================

function seeded(n) {
  let s = 2026;
  const a = Array.from({ length: n }, (_, i) => i + 1);

  for (let i = n - 1; i > 0; i--) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }

  return a;
}

function make(n, scenario, fixed = false) {
  let a = Array.from(
    { length: n },
    (_, i) => fixed
      ? i + 1
      : Math.round(10 + i * 89 / Math.max(1, n - 1))
  );

  // Sorted and reverse-sorted are relative to direction.
  if (dir() === "desc") a.reverse();

  if (scenario === "reverse") {
    return a.reverse();
  }

  if (scenario === "nearly") {
    if (n > 2) {
      [a[1], a[n - 1]] = [a[n - 1], a[1]];
    }
    return a;
  }

  if (scenario === "random") {
    return fixed
      ? seeded(n)
      : Array.from(
          { length: n },
          () => 10 + Math.floor(Math.random() * 90)
        );
  }

  return a;
}


// ==========================================
// 3. D3 BAR CHARTS
// ==========================================

function chart(id, a, active = [], color = "#9c82e2", height = 205) {
  const width = Math.max(300, Math.min(850, $(id).clientWidth || 850));
  const svg = d3.select("#" + id)
    .selectAll("svg")
    .data([null])
    .join("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("role", "img")
    .attr("aria-label", `Array ${a.join(", ")}`);

  const x = d3.scaleBand()
    .domain(d3.range(a.length))
    .range([24, width - 24])
    .padding(0.17);

  const y = d3.scaleLinear()
    .domain([0, Math.max(100, d3.max(a) || 1)])
    .range([height - 25, 19]);

  svg.selectAll("rect.bar")
    .data(a)
    .join("rect")
    .attr("class", "bar")
    .attr("data-index", (_, i) => i)
    .attr("x", (_, i) => x(i))
    .attr("y", v => y(v))
    .attr("width", x.bandwidth())
    .attr("height", v => height - 25 - y(v))
    .attr("rx", 4)
    .attr("fill", (_, i) =>
      active.includes(i) ? palette.active : color
    );

  svg.selectAll("text.value")
    .data(a)
    .join("text")
    .attr("class", "value")
    .attr("x", (_, i) => x(i) + x.bandwidth() / 2)
    .attr("y", v => y(v) - 6)
    .attr("text-anchor", "middle")
    .attr("font-size", a.length > 16 ? 10 : 14)
    .attr("fill", id.endsWith("Battle") ? "#eee6f7" : "#40374e")
    .text(v => v);

  svg.selectAll("text.index")
    .data(a)
    .join("text")
    .attr("class", "index")
    .attr("x", (_, i) => x(i) + x.bandwidth() / 2)
    .attr("y", height - 6)
    .attr("text-anchor", "middle")
    .attr("font-size", 11)
    .attr("fill", id.endsWith("Battle") ? "#c7bfd3" : "#62576c")
    .text((_, i) => i + 1);

  return svg;
}


// ==========================================
// 4. ALGORITHM BATTLE ARENA
// ==========================================

function stop() {
  if (battleTimer !== null) clearInterval(battleTimer);
  battleTimer = null;
  $("battlePlay").textContent = "▶ Start battle";
}

function setArray(a, msg = "Array updated.") {
  values = [...a];
  original = [...a];

  $("size").value = Math.min(18, Math.max(3, a.length));
  $("sizeOut").textContent = a.length;

  rebuild();
  $("playMsg").textContent = msg;
}

function rebuild() {
  stop();

  battleTick = 0;
  codeStep = 0;
  chosen = null;

  traces = Object.fromEntries(
    names.map(n => [n, algorithms[n](values, dir())])
  );

  drawBattle();
  drawHeat();
  drawPlay();
  drawCode();
  drawHistory();

  $("winner").textContent =
    "Choose Start battle to begin. All three lanes receive identical data.";
}

function maxTick() {
  return Math.max(
    ...names.map(n => traces[n].length - 1)
  );
}

function drawBattle() {
  names.forEach(name => {
    const t = traces[name];
    const idx = Math.min(battleTick, t.length - 1);
    const s = t[idx];

    const p = Math.round(
      100 * idx / Math.max(1, t.length - 1)
    );

    chart(
      name + "Battle",
      s.a,
      s.active,
      s.phase === "done" ? palette.sorted : palette[name],
      190
    );

    $(name + "Percent").textContent = p + "%";
    $(name + "Meter").style.width = p + "%";
    $(name + "C").textContent = s.c;
    $(name + "M").textContent = s.m;
    $(name + "S").textContent = idx + "/" + (t.length - 1);
    $(name + "Msg").textContent = s.msg;
  });

  if ($("historyChart")) drawHistory();
  $("winner").classList.toggle("finished", battleTick >= maxTick());
  const pct = Math.round(
    100 * battleTick / Math.max(1, maxTick())
  );

  $("battleTimeline").max = maxTick();
  $("battleTimeline").value = battleTick;
  $("battlePct").textContent = pct + "%";
  if ($("historyTimeline")) { $("historyTimeline").max=maxTick(); $("historyTimeline").value=battleTick; }

  if (battleTick >= maxTick()) {
    stop();

    const low = Math.min(
      ...names.map(n => traces[n].length - 1)
    );

    const winners = names.filter(
      n => traces[n].length - 1 === low
    );

    $("winner").textContent =
      `🏆 ${winners.map(n =>
        n[0].toUpperCase() + n.slice(1)
      ).join(" & ")} ${
        winners.length > 1 ? "tie for" : "wins with"
      } ${low} recorded events. This is not a CPU-time benchmark.`;
  }

  const summary = $("arenaSummary");
  summary.innerHTML = "";

  names.forEach(n => {
    const s = traces[n].at(-1);
    const e = document.createElement("div");

    e.className = "summary-card";

    e.textContent =
      `${n.toUpperCase()} · ${s.c} comparisons · ` +
      `${s.m} ${n === "insertion" ? "writes" : "swaps"} · ` +
      `${traces[n].length - 1} events`;

    summary.append(e);
  });
}

function tick() {
  battleTick = Math.min(maxTick(), battleTick + 1);
  drawBattle();
}

function start() {
  if (battleTimer !== null) {
    stop();
    return;
  }

  if (battleTick >= maxTick()) {
    battleTick = 0;
  }

  $("winner").textContent = "Battle in progress…";
  $("battlePlay").textContent = "Ⅱ Pause";

  battleTimer = setInterval(
    tick,
    Number($("battleSpeed").value)
  );
}


// ==========================================
// 5. COMPARISON HEATMAP
// ==========================================

function drawHeat() {
  const n = values.length;
  const name = $("heatAlgo").value;
  const mode = $("heatMode").value;

  const grid = Array.from(
    { length: n },
    () => Array(n).fill(0)
  );

  traces[name].forEach(s => {
    if (s.phase === "compare" && s.pairs) {
      const [i, j] = s.pairs;

      grid[i][j]++;
      grid[j][i]++;
    }
  });

  const activity = grid.map(
    row => row.reduce((a, b) => a + b, 0)
  );

  const max = Math.max(1, ...grid.flat());

  const w = 650;
  const h = 650;
  const p = 60;
  const cell = (w - p - 12) / n;

  const svg = d3.select("#heatChart")
    .selectAll("svg")
    .data([null])
    .join("svg")
    .attr("viewBox", `0 0 ${w} ${h}`);

  svg.selectAll("*").remove();

  const cells = [];

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      cells.push({
        i,
        j,
        v: mode === "activity"
          ? activity[i]
          : grid[i][j]
      });
    }
  }

  const upper = mode === "activity"
    ? Math.max(1, ...activity)
    : max;

  svg.selectAll("rect")
    .data(cells)
    .join("rect")
    .attr("x", d => p + d.j * cell)
    .attr("y", d => p + d.i * cell)
    .attr("width", Math.max(1, cell - 2))
    .attr("height", Math.max(1, cell - 2))
    .attr("rx", Math.min(5, cell / 5))
    .attr("fill", d =>
      d.v === 0
        ? "#2d2b40"
        : d3.interpolateRgb(
            "#51456c",
            "#f3b66b"
          )(d.v / upper)
    )
    .append("title")
    .text(d =>
      mode === "activity"
        ? `Position ${d.i + 1}: ${d.v} comparison appearances`
        : `Position ${d.i + 1} vs ${d.j + 1}: ${d.v} comparisons`
    );

  if (n <= 18) {
    svg.selectAll("text.col")
      .data(d3.range(n))
      .join("text")
      .attr("class", "col")
      .attr("x", j => p + (j + 0.5) * cell)
      .attr("y", p - 12)
      .attr("text-anchor", "middle")
      .attr("fill", "#62576c")
      .attr("font-size", 12)
      .text(j => j + 1);

    svg.selectAll("text.row")
      .data(d3.range(n))
      .join("text")
      .attr("class", "row")
      .attr("x", p - 13)
      .attr("y", i => p + (i + 0.6) * cell)
      .attr("text-anchor", "end")
      .attr("fill", "#62576c")
      .attr("font-size", 12)
      .text(i => i + 1);
  }

  const insights = {
    bubble:
      "Bubble compares neighboring positions. Expect a band near the diagonal.",
    selection:
      "Selection scans candidates across the unsorted suffix, creating a broader comparison pattern.",
    insertion:
      "Insertion walks backward through the sorted prefix, often producing concentrated local comparisons."
  };

  $("heatInsight").textContent = insights[name];

  $("heatStats").textContent =
    `${traces[name].at(-1).c} comparisons recorded · ` +
    `${Math.max(...activity)} maximum position activity`;
}


// ==========================================
// 6. WHAT-IF EXPERIMENT STUDIO
// ==========================================

function runLab() {
  const scenario = $("labScenario").value;
  const n = Number($("labSize").value);
  const metric = $("labMetric").value;

  const a = make(n, scenario, true);

  const results = names.map(name => {
    const t = algorithms[name](a, dir());
    const s = t.at(-1);

    return {
      name,
      value: metric === "comparisons"
        ? s.c
        : metric === "moves"
          ? (name === "insertion" ? s.m : 2 * s.m)
          : t.length - 1,
      c: s.c,
      m: s.m,
      events: t.length - 1
    };
  });

  const best = Math.min(
    ...results.map(r => r.value)
  );

  const winners = results
    .filter(r => r.value === best)
    .map(r => r.name);

  const selected = document.querySelector(
    'input[name="hypothesis"]:checked'
  );

  const prediction = selected ? selected.value : null;

  const correct = prediction === "tie"
    ? winners.length > 1
    : winners.length === 1 &&
      winners[0] === prediction;

  $("labResult").textContent =
    `${prediction
      ? correct
        ? "✓ Your prediction matches. "
        : "Your prediction did not match. "
      : "No prediction selected. "
    }Lowest ${metric}: ${winners.join(" & ")} (${best}). ` +
    (metric === "moves"
      ? "Common unit: array-cell writes; a swap counts as two writes."
      : "");

  $("labInsight").textContent = "";
  // Experiment bar chart
  const svg = d3.select("#labChart")
    .selectAll("svg")
    .data([null])
    .join("svg")
    .attr("viewBox", "0 0 800 270");

  svg.selectAll("*").remove();

  const x = d3.scaleBand()
    .domain(names)
    .range([80, 760])
    .padding(0.35);

  const y = d3.scaleLinear()
    .domain([
      0,
      Math.max(1, ...results.map(r => r.value))
    ])
    .nice()
    .range([220, 22]);

  svg.append("g")
    .attr("transform", "translate(0,220)")
    .call(d3.axisBottom(x));

  svg.append("g")
    .attr("transform", "translate(80,0)")
    .call(d3.axisLeft(y).ticks(5));

  svg.selectAll("rect")
    .data(results)
    .join("rect")
    .attr("x", d => x(d.name))
    .attr("y", d => y(d.value))
    .attr("width", x.bandwidth())
    .attr("height", d => 220 - y(d.value))
    .attr("fill", d => palette[d.name]);

  svg.selectAll("text.result")
    .data(results)
    .join("text")
    .attr("class", "result")
    .attr("x", d => x(d.name) + x.bandwidth() / 2)
    .attr("y", d => y(d.value) - 8)
    .attr("text-anchor", "middle")
    .attr("fill", "#40374e")
    .text(d => d.value);

  svg.append("text").attr("x",80).attr("y",14).attr("font-size",12)
    .text(metric === "moves" ? "Array-cell writes (count)" : metric === "comparisons" ? "Value comparisons (count)" : "Recorded events (count)");
  // Numerical results table
  const table = $("labTable");
  table.replaceChildren();

  const t = document.createElement("table");
  const head = document.createElement("tr");

  [
    "Algorithm",
    "Comparisons",
    "Native movements",
    "Events"
  ].forEach(v => {
    const th = document.createElement("th");
    th.textContent = v;
    head.append(th);
  });

  t.append(head);

  results.forEach(r => {
    const row = document.createElement("tr");

    [
      r.name,
      r.c,
      `${r.m} ${r.name === "insertion"
        ? "writes"
        : "swaps"}`,
      r.events
    ].forEach(v => {
      const td = document.createElement("td");
      td.textContent = v;
      row.append(td);
    });

    t.append(row);
  });

  table.append(t);

  const explanations = {
    sorted:
      "Sorted data (relative to the chosen direction): early-exit Bubble and Insertion need only n−1 comparisons, while Selection still scans every unsorted suffix.",
    reverse:
      "Reverse order makes Bubble exchange many pairs and Insertion shift many elements.",
    nearly:
      "A nearly sorted array can still be costly if one value is far from its correct position.",
    random:
      "The fixed seed ensures that repeating this experiment with the same settings gives the same result."
  };

  $("labInsight").textContent = explanations[scenario];
}


// ==========================================
// 7. INTERACTIVE ARRAY PLAYGROUND
// ==========================================

function drawPlay() {
  const svg = chart(
    "playChart",
    values,
    [],
    "#a78be0",
    270
  );

  $("arrayLabel").textContent =
    "Starting array: [" + values.join(", ") + "]";

  svg.selectAll("rect.bar")
    .attr("tabindex", 0).attr("role", "button")
    .attr("aria-label", (v, i) => `Position ${i + 1}, value ${v}. Enter to select or swap.`)
    .on("keydown", function(e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); this.dispatchEvent(new MouseEvent("click", {bubbles:true})); } })
    .style("cursor", "grab")
    .on("click", function () {
      const i = Number(this.dataset.index);

      if (chosen === null) {
        chosen = i;

        d3.select(this).attr("fill", "#f1a1b4");

        $("playMsg").textContent =
          `Selected ${values[i]}. Click another bar to swap.`;
      } else {
        const j = chosen;
        chosen = null;

        if (i !== j) {
          [values[i], values[j]] = [values[j], values[i]];
          rebuild();

          $("playMsg").textContent =
            `Swapped positions ${j + 1} and ${i + 1}.`;
        } else {
          drawPlay();
          $("playMsg").textContent =
            "Selection canceled.";
        }
      }
    })
    .call(
      d3.drag()
        .on("start", function () {
          this.__from = Number(this.dataset.index);
          this.__dist = 0;
          chosen = null;
        })
        .on("drag", function (e) {
          this.__dist +=
            Math.abs(e.dx) + Math.abs(e.dy);

          d3.select(this).attr("opacity", 0.5);
        })
        .on("end", function (e) {
          d3.select(this).attr("opacity", 1);

          if (this.__dist < 7) return;

          const [x] = d3.pointer(
            e.sourceEvent,
            this.ownerSVGElement
          );

          const to = Math.max(
            0,
            Math.min(
              values.length - 1,
              Math.floor(
                (x - 24) / ((this.ownerSVGElement.viewBox.baseVal.width - 48) / values.length)
              )
            )
          );

          const from = this.__from;

          if (from !== to) {
            const [v] = values.splice(from, 1);
            values.splice(to, 0, v);

            rebuild();

            $("playMsg").textContent =
              `Moved ${v} from position ${from + 1} to ${to + 1}.`;
          } else {
            drawPlay();
          }
        })
    );
}


// ==========================================
// 8. STEP-BY-STEP CODE EXPLORER
// ==========================================

const codeLines = {
  bubble: [
    "for each pass over unsorted values:",
    "  compare adjacent elements",
    "  if out of order:",
    "    swap the two elements",
    "  stop if no swaps occurred"
  ],

  selection: [
    "for each unsorted position:",
    "  assume first unsorted is best",
    "  compare with remaining positions",
    "  update best candidate",
    "  swap best into position"
  ],

  insertion: [
    "for each key after first:",
    "  compare key with sorted prefix",
    "  shift out-of-order values right",
    "  insert key into correct position"
  ]
};

function drawCode() {
  const name = $("codeAlgo").value;
  const t = traces[name];

  codeStep = Math.max(
    0,
    Math.min(codeStep, t.length - 1)
  );

  const s = t[codeStep];

  chart(
    "codeChart",
    s.a,
    s.active,
    palette[name],
    220
  );

  $("codeMsg").textContent =
    `Step ${codeStep}/${t.length - 1}: ${s.msg}`;

  $("codeCount").textContent =
    `${s.c} comparisons · ${s.m} ` +
    (name === "insertion" ? "writes" : "swaps");

  const lineMap = {
    bubble: {
      compare: 1,
      swap: 3
    },
    selection: {
      compare: 2,
      select: 3,
      swap: 4
    },
    insertion: {
      compare: 1,
      shift: 2,
      insert: 3
    }
  };

  const line = lineMap[name][s.phase] ?? 0;

  const panel = $("codeText");
  panel.replaceChildren();

  codeLines[name].forEach((txt, i) => {
    const el = document.createElement("span");

    el.className =
      "code-line" + (i === line ? " active" : "");

    el.textContent = txt;
    panel.append(el);
  });

  $("codePrev").disabled = codeStep === 0;
  $("codeNext").disabled = codeStep === t.length - 1;
}


// ==========================================
// 9. PREDICTION CHALLENGE
// ==========================================

function newQuiz() {
  const a = Array.from(
    { length: 5 },
    () => 10 + Math.floor(Math.random() * 90)
  );

  quizArray = [...a];
  quizPair = [a[0], a[1]];
  quizAnswered = false;

  chart(
    "challengeChart",
    a,
    [0, 1],
    "#a78be0",
    230
  );

  $("challengeQuestion").textContent =
    `Will Bubble Sort swap ${a[0]} and ${a[1]} (ascending)?`;

  $("challengeMsg").textContent =
    "Choose your prediction.";

  $("yesSwap").disabled = false;
  $("noSwap").disabled = false;
}

function answerQuiz(yes) {
  if (quizAnswered) return;

  quizAnswered = true;
  quizTotal++;

  const correct = quizPair[0] > quizPair[1];

  if (yes === correct) quizScore++;

  $("challengeMsg").textContent =
    `${yes === correct ? "Correct!" : "Not quite."} ` +
    `${quizPair[0]} ${correct ? ">" : "≤"} ${quizPair[1]}, ` +
    `so the pair ${correct ? "will" : "will not"} swap.`;

  if (correct) [quizArray[0], quizArray[1]] = [quizArray[1], quizArray[0]];
  chart("challengeChart", quizArray, [0,1], palette.sorted, 230);
  $("challengeScore").textContent =
    `Score: ${quizScore} / ${quizTotal}`;

  $("yesSwap").disabled = true;
  $("noSwap").disabled = true;
}


// ==========================================
// 10. NUMERICAL VERIFICATION
// ==========================================

function verify() {
  const cases = [
    [3, 2, 1],
    [1, 2, 3],
    [5, 5, 1],
    [7],
    [9, 4, 9, 2, 1]
  ];

  for (const a of cases) {
    for (const d of ["asc", "desc"]) {
      for (const name of names) {
        const actual =
          algorithms[name](a, d).at(-1).a;

        const expected = [...a].sort(
          (x, y) => d === "asc" ? x - y : y - x
        );

        console.assert(
          JSON.stringify(actual) ===
          JSON.stringify(expected),
          `${name} failed ${a} ${d}`
        );
      }
    }
  }

  console.info(
    "SortStudio sorting self-tests completed."
  );
}


// ==========================================
// 11. USER INTERACTIONS
// ==========================================

// Arena array controls
$("size").addEventListener("input", () => {
  $("sizeOut").textContent = $("size").value;

  setArray(
    make(
      Number($("size").value),
      $("scenario").value
    ),
    "Array size changed."
  );
});

$("scenario").addEventListener("change", () => {
  setArray(
    make(
      Number($("size").value),
      $("scenario").value
    ),
    "Input scenario changed."
  );
});

$("generate").addEventListener("click", () => {
  setArray(
    make(
      Number($("size").value),
      $("scenario").value
    ),
    "New array generated."
  );
});

$("direction").addEventListener("change", () => {
  if ($("scenario").value !== "random") {
    setArray(
      make(
        Number($("size").value),
        $("scenario").value
      ),
      "Sorting direction changed."
    );
  } else {
    rebuild();
  }
});

// Battle controls
$("battlePlay").addEventListener("click", start);

$("battleStep").addEventListener("click", () => {
  stop();
  tick();
});

$("battleReset").addEventListener("click", () => {
  stop();
  battleTick = 0;
  drawBattle();

  $("winner").textContent = "Battle reset.";
});

$("battleSpeed").addEventListener("change", () => {
  if (battleTimer !== null) {
    stop();
    start();
  }
});

$("battleTimeline").addEventListener("input", () => {
  stop();

  battleTick = Math.round(
    Number($("battleTimeline").value)
  );

  drawBattle();
});

// Heatmap controls
$("heatAlgo").addEventListener("change", drawHeat);
$("heatMode").addEventListener("change", drawHeat);

// What-If Studio controls
$("labSize").addEventListener("input", () => {
  $("labSizeOut").textContent =
    $("labSize").value;
});

$("runLab").addEventListener("click", runLab);
["labScenario", "labMetric", "labSize"].forEach(id => $(id).addEventListener("input", () => {
  $("labResult").textContent = "Settings changed. Run experiment to measure the new configuration.";
  $("labChart").replaceChildren(); $("labTable").replaceChildren(); $("labInsight").textContent="";
}));

// Playground controls
$("applyCustom").addEventListener("click", () => {
  const parts = $("customInput").value
    .split(",")
    .map(s => s.trim());

  const a = parts.map(Number);

  const invalid =
    parts.length < 3 ||
    parts.length > 18 ||
    parts.some(p => !/^\d+$/.test(p)) ||
    a.some(v => v < 10 || v > 99);

  if (invalid) {
    $("playMsg").textContent =
      "Enter 3–18 comma-separated whole numbers between 10 and 99.";
    return;
  }

  setArray(a, "Custom array applied.");
});

$("shuffle").addEventListener("click", () => {
  for (let i = values.length - 1; i > 0; i--) {
    const j = Math.floor(
      Math.random() * (i + 1)
    );

    [values[i], values[j]] =
      [values[j], values[i]];
  }

  rebuild();

  $("playMsg").textContent = "Array shuffled.";
});

$("restore").addEventListener("click", () => {
  values = [...original];
  rebuild();

  $("playMsg").textContent =
    "Original array restored.";
});

// Code Explorer controls
$("codeAlgo").addEventListener("change", () => {
  codeStep = 0;
  drawCode();
});

$("codePrev").addEventListener("click", () => {
  codeStep--;
  drawCode();
});

$("codeNext").addEventListener("click", () => {
  codeStep++;
  drawCode();
});

$("codeRestart").addEventListener("click", () => {
  codeStep = 0;
  drawCode();
});

// Prediction Challenge controls
$("yesSwap").addEventListener(
  "click",
  () => answerQuiz(true)
);

$("noSwap").addEventListener(
  "click",
  () => answerQuiz(false)
);

$("newChallenge").addEventListener(
  "click",
  newQuiz
);


$("growthRun").addEventListener("click", drawGrowth);
$("growthScenario").addEventListener("change", drawGrowth);
$("direction").addEventListener("change", () => { drawGrowth(); if ($("labChart").children.length) runLab(); });
$("exportData").addEventListener("click", () => {
  const data = {version:3, direction:dir(), input:values, schema:{a:"array state",c:"comparisons",m:"swaps for bubble/selection, writes for insertion",pairs:"zero-based position pair",key:"held insertion key"}, traces};
  const url = URL.createObjectURL(new Blob([JSON.stringify(data,null,2)], {type:"application/json"}));
  const link = document.createElement("a"); link.href=url; link.download="sortstudio-experiment.json"; link.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
});

// ==========================================
// 12. INITIALIZE APPLICATION
// ==========================================



setArray(
  make(9, "random"),
  "Welcome to the Sorting Laboratory."
);

newQuiz();

console.info("SortStudio 2.0 initialized.");

renderVerification();
drawGrowth();

function linePlot(id, series, xLabel, yLabel, cursor = null) {
  const w=850,h=300,p={l:65,r:25,t:35,b:55};
  const svg=d3.select('#'+id).selectAll('svg').data([null]).join('svg')
    .attr('viewBox',`0 0 ${w} ${h}`).attr('role','img').attr('aria-label',`${yLabel} against ${xLabel}; numerical values follow the chart.`);
  svg.selectAll('*').remove();
  const x=d3.scaleLinear().domain([0,Math.max(1,...series.flatMap(s=>s.points.map(p=>p.x)))]).range([p.l,w-p.r]);
  const y=d3.scaleLinear().domain([0,Math.max(1,...series.flatMap(s=>s.points.map(p=>p.y)))]).nice().range([h-p.b,p.t]);
  svg.append('g').attr('transform',`translate(0,${h-p.b})`).call(d3.axisBottom(x).ticks(8).tickFormat(d3.format('d')));
  svg.append('g').attr('transform',`translate(${p.l},0)`).call(d3.axisLeft(y).ticks(5));
  svg.append('text').attr('x',w/2).attr('y',h-10).attr('text-anchor','middle').text(xLabel);
  svg.append('text').attr('x',p.l).attr('y',16).text(yLabel);
  const line=d3.line().x(p=>x(p.x)).y(p=>y(p.y));
  series.forEach((s,i)=>{
    svg.append('path').datum(s.points).attr('d',line).attr('fill','none').attr('stroke',palette[s.name]).attr('stroke-width',3).attr('stroke-dasharray',['','8 4','2 3'][i]);
    svg.append('text').attr('x',w-240+i*80).attr('y',16).attr('fill',palette[s.name]).attr('font-size',12).text(s.name);
    if(id==='growthChart') svg.append('g').selectAll('circle').data(s.points).join('circle').attr('cx',d=>x(d.x)).attr('cy',d=>y(d.y)).attr('r',4).attr('fill',palette[s.name]).append('title').text(d=>`${s.name}: n=${d.x}, ${d.y} comparisons`);
  });
  if(cursor!==null) svg.append('line').attr('x1',x(cursor)).attr('x2',x(cursor)).attr('y1',p.t).attr('y2',h-p.b).attr('stroke','#43374e').attr('stroke-dasharray','4 4');
}
function drawHistory(){
  linePlot('historyChart',names.map(name=>({name,points:traces[name].map((s,i)=>({x:i,y:s.c}))})), 'Recorded event index','Cumulative comparisons (count)',battleTick);
  $('historyReadout').textContent=`Event ${battleTick}: `+names.map(n=>`${n} ${traces[n][Math.min(battleTick,traces[n].length-1)].c} comparisons`).join(' · ');
}
function drawGrowth(){
  const sizes=[2,4,8,12,16,24,32,40];
  const series=names.map(name=>({name,points:sizes.map(n=>({x:n,y:algorithms[name](make(n,$('growthScenario').value,true),dir()).at(-1).c}))}));
  linePlot('growthChart',series,'Input size n (elements)','Value comparisons (count)');
  $('growthInsight').textContent=`Direction: ${dir()==='asc'?'ascending':'descending'}. Selection always uses n(n−1)/2 comparisons. Sorted Bubble and Insertion use n−1. Seeded random is one reproducible sample at each size, not an average or a timing benchmark.`;
  const table=document.createElement('table');
  const caption=document.createElement('caption');caption.textContent='Measured comparison counts';table.append(caption);
  const head=table.createTHead().insertRow(); ['n',...names].forEach(v=>{const th=document.createElement('th');th.textContent=v;th.scope='col';head.append(th)});
  const body=table.createTBody();sizes.forEach((n,i)=>{const row=body.insertRow();[n,...series.map(s=>s.points[i].y)].forEach(v=>row.insertCell().textContent=v)});
  $('growthTable').replaceChildren(table);
}
function runVerification(){
  let checks=0; const errors=[];
  function check(ok,label){checks++;if(!ok)errors.push(label)}
  const cases=[[],[7],[5,5,5],[3,2,1],[1,2,3],[5,5,1],[9,4,9,2,1]];
  for(let n=2;n<=18;n++)cases.push(seeded(n));
  for(const a of cases)for(const d of ['asc','desc'])for(const name of names){
    const before=JSON.stringify(a), t=algorithms[name](a,d), last=t.at(-1);
    const expected=[...a].sort((x,y)=>d==='asc'?x-y:y-x);
    check(JSON.stringify(last.a)===JSON.stringify(expected),`${name} result ${a} ${d}`);
    check(JSON.stringify(a)===before,`${name} mutated input`);
    check(t.filter(s=>s.phase==='compare').length===last.c,`${name} comparison accounting`);
    check(t.every((s,i)=>!i||(s.c>=t[i-1].c&&s.m>=t[i-1].m)),`${name} monotonic counters`);
    if(name==='selection')check(last.c===a.length*(a.length-1)/2,'selection formula');
  }
  const b=bubble([3,2,1]).at(-1),s=selection([3,2,1]).at(-1),i=insertion([3,2,1]).at(-1);
  check(b.c===3&&b.m===3,'bubble numerical example');
  check(s.c===3&&s.m===1,'selection numerical example');
  check(i.c===3&&i.m===5,'insertion numerical example');
  for(const name of names)check(algorithms[name]([7]).at(-1).c===0,'singleton boundary');
  return {checks,errors};
}
function renderVerification(){
  const {checks,errors}=runVerification();
  $('verification').textContent=errors.length?`FAILED: ${errors.join('; ')}`:`PASS: ${checks} assertions. Numerical example [3,2,1], ascending: Bubble 3 comparisons / 3 swaps (6 writes); Selection 3 / 1 swap (2 writes); Insertion 3 / 5 writes. Empty and singleton inputs: zero comparisons. Tests also check duplicates, both directions, input preservation, accounting, and Selection's formula.`;
  if(errors.length)throw new Error(errors.join('; '));
}

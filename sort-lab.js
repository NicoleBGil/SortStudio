(() => {
  'use strict';
  const lab = document.getElementById('sort-lab');
  const engine = globalThis.SortStudioEngine;
  const coach = globalThis.SortCoach;
  if (!lab || !engine || !globalThis.d3) return;

  lab.innerHTML = `
    <header class="sl-header">
      <div><p class="sl-kicker">SORTSTUDIO / COMPARISON LAB</p>
      <h2>Two algorithms. One input.</h2>
      <p>Watch 20 sorting algorithms turn the same values into order, then inspect the work behind each step.</p></div>
      <nav class="sl-shortcuts" aria-label="Comparison lab links">
        <a href="#research-validation">Validate 1,000 records</a>
        <a href="#arena">Classic lessons</a>
      </nav>
    </header>
    <div class="sl-settings">
      <label class="sl-a">Algorithm A <select id="sl-a"></select></label>
      <label class="sl-b">Algorithm B <select id="sl-b"></select></label>
      <label>Input pattern <select id="sl-pattern"><option value="duplicates">Few unique values</option><option value="random">Uniform random</option><option value="nearly">Nearly sorted</option><option value="reverse">Descending</option><option value="sorted">Ascending</option><option value="mixed">Signed integers</option></select></label>
      <label>Order <select id="sl-order"><option value="asc">Ascending ↑</option><option value="desc">Descending ↓</option></select></label>
      <label>Items <span id="sl-size-label">18</span><input id="sl-size" type="range" min="5" max="44" value="18"></label>
      <label>Seed <input id="sl-seed" type="number" min="0" max="4294967295" value="42" step="1"></label>
      <button id="sl-new" type="button">Generate input</button>
    </div>
    <details class="sl-custom">
      <summary>Use your own integers</summary>
      <form id="sl-custom-form"><label for="sl-custom">Enter 2–128 comma- or space-separated integers.</label>
      <input id="sl-custom" placeholder="5, -3, 5, 0, 7" autocomplete="off"><button type="submit">Load input</button></form>
    </details>
    <p class="sl-status" id="sl-status" role="status"></p>
    <div class="sl-stage">
      <div class="sl-toolbar">
        <div class="sl-switch" role="group" aria-label="Arena view">
          <button id="sl-3d" type="button" aria-pressed="true">3D arena</button>
          <button id="sl-2d" type="button" aria-pressed="false">2D bars</button>
        </div>
        <div id="sl-camera" class="sl-camera" role="group" aria-label="Camera controls">
          <button id="sl-orbit" type="button" aria-pressed="false">Auto orbit</button>
          <button id="sl-left" type="button" aria-label="Rotate left">↶</button>
          <button id="sl-right" type="button" aria-label="Rotate right">↷</button>
          <button id="sl-in" type="button" aria-label="Zoom in">+</button>
          <button id="sl-out" type="button" aria-label="Zoom out">−</button>
          <button id="sl-reset-camera" type="button">Reset camera</button>
        </div>
      </div>
      <div class="sl-legend"><span class="sl-a" id="sl-legend-a"></span><span class="sl-b" id="sl-legend-b"></span><span class="sl-active">Active positions</span><span class="sl-pinned">Tracked item</span></div>
      <p class="sl-gesture" id="sl-gesture">Drag to rotate · scroll or pinch to zoom · select a bar to track it</p>
      <canvas id="sl-canvas" aria-label="Interactive 3D bars showing the two arrays on a shared signed scale"></canvas>
      <svg id="sl-bars" role="group" aria-label="Sortable array values by position"></svg>
      <div class="sl-inspector">
        <span id="sl-inspect"></span>
        <label>Track input item <select id="sl-item"></select></label>
      </div>
      <div class="sl-player">
        <button id="sl-back" type="button" aria-label="Previous event">‹</button>
        <button id="sl-play" type="button">Play</button>
        <button id="sl-next" type="button" aria-label="Next event">›</button>
        <div><input id="sl-seek" type="range" min="0" value="0" aria-label="Recorded event">
        <output id="sl-frame" for="sl-seek"></output></div>
        <label>Speed <select id="sl-speed"><option value="2">2 events/s</option><option value="8" selected>8 events/s</option><option value="20">20 events/s</option><option value="60">60 events/s</option></select></label>
      </div>
    </div>
    <div class="sl-lanes" id="sl-lanes"></div>
    <div class="sl-analysis">
      <section class="sl-panel" aria-labelledby="sl-chart-title">
        <div class="sl-panel-head"><h3 id="sl-chart-title">Compare the work</h3><label><span class="sl-sr">Chart</span><select id="sl-chart-type"><option value="comparisons">Comparisons</option><option value="writes">Array writes</option><option value="swaps">Swaps</option><option value="auxWrites">Auxiliary writes</option><option value="position">Tracked item position</option></select></label></div>
        <svg id="sl-chart" role="img" aria-labelledby="sl-chart-title"></svg>
        <p id="sl-chart-note" class="sl-muted"></p>
      </section>
      <section class="sl-panel sl-coach" aria-labelledby="sl-coach-title">
        <div class="sl-panel-head"><h3 id="sl-coach-title">Sort coach</h3><span>LOCAL · TRACE-BASED</span></div>
        <div class="sl-suggestions" id="sl-suggestions"></div>
        <form id="sl-question-form"><label for="sl-question" class="sl-sr">Question about the sort</label><input id="sl-question" placeholder="Ask about this step or a trade-off" maxlength="500" required><button type="submit">Ask</button></form>
        <div id="sl-coach-reply" aria-live="polite"></div>
        <div class="sl-quiz-controls"><label>Focus <select id="sl-coach-lane"><option value="0">Lane A</option><option value="1">Lane B</option></select></label><button id="sl-challenge" type="button">Predict the next event</button></div>
        <div id="sl-quiz" aria-live="polite"></div>
      </section>
    </div>`;

  const $ = id => document.getElementById('sl-' + id);
  const roster = new Map(engine.algorithms.map(algorithm => [algorithm.id, algorithm]));
  const metrics = {comparisons: 'Comparisons', writes: 'Array writes', swaps: 'Swaps', auxWrites: 'Auxiliary writes'};
  const colors = ['#5eeac1', '#a6aeff'];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const state = {input: [], lanes: [], index: 0, last: 0, playing: false, track: 0, view: '3d', orbit: false};
  let scene;
  let webglFailed = false;
  let timer = 0;
  let chartCursor;
  let chartPoints;
  let chartScale;
  let chartMeasure;
  const bars = d3.select($('bars'));
  const chart = d3.select($('chart'));

  for (const control of [$('a'), $('b')]) {
    const groups = new Map();
    for (const algorithm of engine.algorithms) {
      if (!groups.has(algorithm.family)) {
        const group = document.createElement('optgroup');
        group.label = algorithm.family;
        control.append(group);
        groups.set(algorithm.family, group);
      }
      groups.get(algorithm.family).append(new Option(algorithm.name, algorithm.id));
    }
  }
  $('a').value = 'quick-three-way';
  $('b').value = 'merge';

  function generate() {
    let seed = Number($('seed').value);
    if (!Number.isInteger(seed) || seed < 0 || seed > 4294967295) {
      $('status').textContent = 'Enter an integer seed from 0 to 4,294,967,295.';
      return null;
    }
    const random = () => {
      seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    const mode = $('pattern').value;
    const input = Array.from({length: Number($('size').value)}, () => {
      if (mode === 'duplicates') return 8 + 9 * Math.floor(random() * 5);
      if (mode === 'mixed') return Math.floor(random() * 91) - 45;
      return 3 + Math.floor(random() * 48);
    });
    if (['nearly', 'sorted', 'reverse'].includes(mode)) input.sort((a, b) => mode === 'reverse' ? b - a : a - b);
    if (mode === 'nearly') {
      const i = Math.floor(random() * (input.length - 1));
      [input[i], input[i + 1]] = [input[i + 1], input[i]];
    }
    return input;
  }

  function coachContext() {
    const lane = Number($('coach-lane').value);
    return {engine, input: state.input, direction: state.direction, focusLane: lane,
      lanes: state.lanes.map(lane => ({id: lane.id, run: lane.run, index: Math.min(state.index, lane.run.events.length - 1)}))};
  }

  function setPlaying(playing) {
    state.playing = playing;
    clearInterval(timer);
    $('play').textContent = playing ? 'Pause' : 'Play';
    if (playing) timer = setInterval(() => {
      go(state.index + 1);
      if (state.index === state.last) setPlaying(false);
    }, 1000 / Number($('speed').value));
  }

  function load(input) {
    if (!input) return;
    const direction = $('order').value;
    try {
      const runs = [$('a').value, $('b').value].map(id => ({id, run: engine.run(id, input, direction)}));
      setPlaying(false);
      state.input = input.slice();
      state.lanes = runs;
      state.direction = direction;
      state.last = Math.max(...runs.map(lane => lane.run.events.length - 1));
      state.track = Math.min(state.track, input.length - 1);
      $('seek').max = state.last;
      $('status').textContent = input.length + ' items · ' + new Set(input).size + ' unique values' +
        (webglFailed ? ' · 2D arena active because WebGL is unavailable' : '');
      $('item').replaceChildren(...input.map((value, id) => new Option('#' + (id + 1) + ' · ' + value, id)));
      $('item').value = state.track;
      $('quiz').replaceChildren();
      buildLanes();
      go(0);
      drawChart();
      answer('Compare both algorithms');
    } catch (error) {
      $('status').textContent = error.message;
      if (state.lanes.length) {
        $('a').value = state.lanes[0].id;
        $('b').value = state.lanes[1].id;
        $('order').value = state.direction;
      }
    }
  }

  function buildLanes() {
    $('lanes').replaceChildren(...state.lanes.map(({id}, i) => {
      const algorithm = roster.get(id);
      const lane = document.createElement('article');
      lane.className = i ? 'sl-b' : 'sl-a';
      lane.innerHTML = `<div class="sl-lane-head"><h3></h3><span></span></div><p class="sl-event"></p>
        <dl>${Object.entries(metrics).map(([key, label]) => `<div><dt data-definition="${key}">${label}</dt><dd data-stat="${key}">0</dd></div>`).join('')}</dl>
        <details><summary>Method and complexity</summary><p class="sl-definition"></p><p class="sl-cost"></p><pre></pre></details>`;
      const name = (i ? 'B' : 'A') + ' · ' + algorithm.name;
      $('legend-' + (i ? 'b' : 'a')).textContent = name;
      lane.querySelector('h3').textContent = name;
      lane.querySelector('.sl-lane-head span').textContent = algorithm.stable ? 'Stable' : 'Unstable';
      lane.querySelector('.sl-definition').textContent = algorithm.description;
      for (const label of lane.querySelectorAll('[data-definition]')) label.title = engine.metricDefinitions[label.dataset.definition];
      lane.querySelector('.sl-cost').textContent = 'Best ' + algorithm.best + ' · Average ' + algorithm.average +
        ' · Worst ' + algorithm.worst + ' · Extra space ' + algorithm.space;
      lane.querySelector('pre').textContent = Array.isArray(algorithm.pseudocode) ? algorithm.pseudocode.join('\n') : algorithm.pseudocode;
      return lane;
    }));
  }

  function go(index) {
    if (!state.lanes.length) return;
    const nextIndex = Math.max(0, Math.min(state.last, index));
    if (state.index !== nextIndex) $('quiz').replaceChildren();
    state.index = nextIndex;
    $('seek').value = state.index;
    $('frame').textContent = 'Event ' + (state.index + 1) + ' / ' + (state.last + 1);
    $('back').disabled = state.index === 0;
    $('next').disabled = state.index === state.last;
    state.lanes.forEach((lane, i) => {
      lane.frame = lane.run.at(Math.min(state.index, lane.run.events.length - 1));
      lane.focus = {position: lane.frame.ids.indexOf(state.track)};
      const card = $('lanes').children[i];
      card.querySelector('.sl-event').textContent = (lane.frame.index + 1) + ' / ' + lane.run.events.length + ' · ' + lane.frame.message;
      for (const key of Object.keys(metrics)) card.querySelector('[data-stat="' + key + '"]').textContent = lane.frame.metrics[key];
    });
    if (state.view === '3d' && scene) {
      scene.setFrame(state.lanes.map(lane => ({frame: lane.frame, initial: state.input, focus: lane.focus})),
        {motion: !reducedMotion.matches && (!state.playing || Number($('speed').value) <= 20), orbit: state.orbit});
    }
    if (state.view === '2d') drawBars();
    updateCursor();
    inspect();
  }

  function inspect(hit) {
    if (!state.lanes.length) return;
    if (hit) {
      const {frame} = state.lanes[hit.lane];
      $('inspect').textContent = (hit.lane ? 'B' : 'A') + ' · position ' + (hit.position + 1) +
        ' · value ' + frame.values[hit.position] + ' · input item #' + (frame.ids[hit.position] + 1);
      return;
    }
    const positions = state.lanes.map((lane, i) => (i ? 'B' : 'A') + ' ' +
      (lane.focus.position < 0 ? 'outside main array' : 'position ' + (lane.focus.position + 1)));
    $('inspect').textContent = '#' + (state.track + 1) + ' · value ' + state.input[state.track] + ' · ' + positions.join(' / ');
  }

  function track(id) {
    state.track = id;
    $('item').value = id;
    go(state.index);
    if ($('chart-type').value === 'position') drawChart();
  }

  function focusHit(hit) {
    const id = state.lanes[hit.lane].frame.ids[hit.position];
    if (id >= 0) track(id);
  }

  function switchView(view) {
    if (view === '3d' && !scene && !webglFailed) {
      function fallBack() {
        webglFailed = true;
        $('3d').disabled = true;
        switchView('2d');
        $('status').textContent = 'WebGL is unavailable. The 2D arena is active.';
      }
      try {
        scene = globalThis.SortStudioScene.create($('canvas'), {onInspect: inspect, onSelect: focusHit, onUnavailable: fallBack});
      } catch {
        fallBack();
      }
    }
    state.view = webglFailed ? '2d' : view;
    const is3d = state.view === '3d';
    $('canvas').hidden = !is3d;
    $('bars').toggleAttribute('hidden', is3d);
    $('camera').hidden = !is3d;
    $('gesture').hidden = !is3d;
    $('3d').setAttribute('aria-pressed', is3d);
    $('2d').setAttribute('aria-pressed', !is3d);
    scene?.setVisible(is3d);
    go(state.index);
  }

  function drawBars() {
    const width = Math.max(270, $('bars').clientWidth);
    const height = Math.max(245, $('bars').clientHeight);
    bars.attr('viewBox', [0, 0, width, height]);
    const x = d3.scaleBand(d3.range(state.input.length), [57, width - 16]).padding(.21);
    const max = Math.max(1, ...state.input.map(Math.abs));
    const min = Math.min(0, ...state.input) < 0 ? -max : 0;
    const laneHeight = height / 2;
    const y = d3.scaleLinear([min, max], [laneHeight - 23, 16]);
    const panels = bars.selectAll('g.sl-chart-lane').data(state.lanes).join(enter => {
      const lane = enter.append('g').attr('class', 'sl-chart-lane');
      lane.append('g').attr('class', 'sl-axis');
      lane.append('line').attr('class', 'sl-zero');
      lane.append('g').attr('class', 'sl-columns');
      lane.append('g').attr('class', 'sl-column-labels');
      return lane;
    }).attr('transform', (_, i) => 'translate(0,' + (laneHeight * i) + ')');
    panels.each(function (lane, i) {
      const panel = d3.select(this);
      panel.select('.sl-axis').attr('transform', 'translate(51,0)').call(d3.axisLeft(y).ticks(3).tickSize(3).tickFormat(d3.format('~s')));
      panel.select('.sl-zero').attr('x1', 57).attr('x2', width - 16).attr('y1', y(0)).attr('y2', y(0));
      const active = new Set(lane.frame.indices);
      const columns = panel.select('.sl-columns').selectAll('rect').data(lane.frame.values).join('rect');
      columns.attr('x', (_, position) => x(position)).attr('width', x.bandwidth())
        .attr('y', value => value === 0 ? y(0) - 2 : Math.min(y(value), y(0)))
        .attr('height', value => Math.max(2, Math.abs(y(value) - y(0)))).attr('rx', 2)
        .attr('fill', (_, position) => lane.focus.position === position ? '#fff2cd' : active.has(position) ? '#ffbb75' : colors[i])
        .attr('tabindex', 0).attr('role', 'button').attr('data-position', (_, position) => position)
        .attr('aria-label', (value, position) => (i ? 'B' : 'A') + ', position ' + (position + 1) + ', value ' + value +
          ', item ' + (lane.frame.ids[position] + 1))
        .on('pointerenter focus', event => inspect({lane: i, position: Number(event.currentTarget.dataset.position)}))
        .on('pointerleave blur', () => inspect())
        .on('click keydown', event => {
          if (event.type === 'click' || event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            focusHit({lane: i, position: Number(event.currentTarget.dataset.position)});
          }
        });
      const stride = Math.ceil(state.input.length / Math.max(1, Math.floor((width - 60) / 32)));
      panel.select('.sl-column-labels').selectAll('text').data(d3.range(0, state.input.length, stride)).join('text')
        .attr('x', position => x(position) + x.bandwidth() / 2).attr('y', laneHeight - 8)
        .text(position => position + 1);
    });
  }

  function drawChart() {
    if (!state.lanes.length) return;
    const width = Math.max(270, $('chart').clientWidth);
    const height = 225;
    const x = d3.scaleLinear([0, state.last], [53, width - 18]);
    const key = $('chart-type').value;
    const positions = key === 'position';
    const stride = positions ? 1 : Math.max(1, Math.ceil(state.last / 330));
    const traces = state.lanes.map(({run}) => {
      const frames = run.events.filter((event, i) => i % stride === 0 || i === run.events.length - 1);
      const points = frames.map(event => [event.index, metricAt(run, event.index, key)]);
      if (points.at(-1)[0] < state.last) points.push([state.last, points.at(-1)[1]]);
      return points;
    });
    const end = positions ? state.input.length : Math.max(1, ...state.lanes.map(lane => lane.run.metrics[key]));
    const y = d3.scaleLinear(positions ? [end, 1] : [0, end], [height - 31, 14]);
    chart.attr('viewBox', [0, 0, width, height]).selectAll('*').remove();
    chart.append('g').attr('class', 'sl-axis sl-grid-axis').attr('transform', 'translate(53,0)')
      .call(d3.axisLeft(y).tickValues(y.ticks(4).filter(Number.isInteger)).tickSize(-(width - 71)).tickPadding(7).tickFormat(d3.format('~s')));
    chart.append('g').attr('class', 'sl-axis').attr('transform', 'translate(0,' + (height - 31) + ')')
      .call(d3.axisBottom(x).tickValues(x.ticks(width < 450 ? 4 : 7).filter(Number.isInteger)).tickFormat(index => d3.format('~s')(index + 1)));
    const line = d3.line().defined(point => point[1] !== null)
      .x(point => x(point[0])).y(point => y(point[1])).curve(d3.curveStepAfter);
    chart.selectAll('path.sl-trace').data(traces).join('path').attr('class', 'sl-trace')
      .attr('d', line).attr('stroke', (_, i) => colors[i]);
    chartCursor = chart.append('line').attr('class', 'sl-chart-cursor').attr('y1', 13).attr('y2', height - 31);
    chartPoints = chart.selectAll('circle').data(colors).join('circle').attr('r', 4).attr('fill', color => color);
    chartScale = {x, y};
    chartMeasure = key;
    chart.append('rect').attr('class', 'sl-chart-hit').attr('x', 53).attr('y', 10).attr('width', width - 71).attr('height', height - 41)
      .on('click', event => { setPlaying(false); go(Math.round(x.invert(d3.pointer(event, $('chart'))[0]))); });
    $('chart-note').textContent = positions
      ? 'Tracked item #' + (state.track + 1) + ' · First position shown if an item temporarily appears twice. Gaps indicate an item is outside the main array.'
      : 'Cumulative operation counts by recorded event. ' +
        (stride > 1 ? 'The lines sample long traces. The cursor shows exact counts. ' : '') + 'Select the chart to scrub.';
    updateCursor();
  }

  function metricAt(run, index, key) {
    const frame = Math.min(index, run.events.length - 1);
    if (key !== 'position') return run.events[frame].metrics[key];
    const position = run.at(frame).ids.indexOf(state.track);
    return position < 0 ? null : position + 1;
  }

  function updateCursor() {
    if (!chartScale) return;
    const {x, y} = chartScale;
    chartCursor.attr('x1', x(state.index)).attr('x2', x(state.index));
    chartPoints.attr('cx', x(state.index)).attr('cy', (_, i) => {
      const value = metricAt(state.lanes[i].run, state.index, chartMeasure);
      return value === null ? null : y(value);
    }).attr('visibility', (_, i) => metricAt(state.lanes[i].run, state.index, chartMeasure) === null ? 'hidden' : 'visible');
  }

  function addText(parent, tag, text) {
    const element = document.createElement(tag);
    element.textContent = text;
    parent.append(element);
    return element;
  }

  function appendEvidence(parent, evidence) {
    if (!evidence.length) return;
    const list = document.createElement('ul');
    for (const item of evidence) addText(list, 'li', item);
    parent.append(list);
  }

  function answer(question, focusReply = false) {
    if (!coach || !state.lanes.length) return;
    const response = coach.answer(question, coachContext());
    const out = $('coach-reply');
    out.replaceChildren();
    const heading = addText(out, 'h4', response.title);
    if (focusReply) {
      heading.tabIndex = -1;
      heading.focus({preventScroll: true});
    }
    addText(out, 'p', response.text);
    appendEvidence(out, response.evidence);
    $('suggestions').replaceChildren(...response.suggestions.map(question => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = question;
      button.onclick = () => answer(question, true);
      return button;
    }));
  }

  function showChallenge() {
    setPlaying(false);
    const quiz = $('quiz');
    quiz.replaceChildren();
    const challenge = coach?.challenge(coachContext());
    if (!challenge) {
      addText(quiz, 'p', 'Move to an earlier event to make a prediction.');
      return;
    }
    addText(quiz, 'p', challenge.prompt);
    const choices = document.createElement('div');
    choices.className = 'sl-suggestions';
    quiz.append(choices);
    for (const option of challenge.options) {
      const button = addText(choices, 'button', option.label);
      button.type = 'button';
      button.onclick = () => {
        const result = challenge.reveal(option.id);
        for (const choice of choices.children) choice.disabled = true;
        addText(quiz, 'strong', (result.correct ? 'Correct · ' : 'Expected · ') + result.answer);
        addText(quiz, 'p', result.text);
        appendEvidence(quiz, result.evidence);
      };
    }
  }

  for (const name of ['a', 'b', 'order']) $(name).onchange = () => load(state.input);
  $('size').oninput = () => { $('size-label').textContent = $('size').value; };
  $('new').onclick = () => load(generate());
  $('custom-form').onsubmit = event => {
    event.preventDefault();
    const tokens = $('custom').value.trim().split(/[\s,]+/);
    const input = tokens.map(Number);
    if (tokens.length < 2 || tokens.length > 128 || tokens.some((token, i) => !/^[+-]?\d+$/.test(token) || !Number.isSafeInteger(input[i]))) {
      $('status').textContent = 'Use 2–128 integers in JavaScript’s safe integer range.';
      return;
    }
    load(input);
  };
  $('play').onclick = () => {
    if (!state.playing && state.index === state.last) go(0);
    setPlaying(!state.playing);
  };
  $('back').onclick = () => { setPlaying(false); go(state.index - 1); };
  $('next').onclick = () => { setPlaying(false); go(state.index + 1); };
  $('seek').oninput = () => { setPlaying(false); go(Number($('seek').value)); };
  $('speed').onchange = () => { if (state.playing) setPlaying(true); };
  $('item').onchange = () => track(Number($('item').value));
  $('chart-type').onchange = drawChart;
  $('3d').onclick = () => switchView('3d');
  $('2d').onclick = () => switchView('2d');
  $('reset-camera').onclick = () => scene?.reset();
  $('left').onclick = () => scene?.rotate(.27);
  $('right').onclick = () => scene?.rotate(-.27);
  $('in').onclick = () => scene?.zoom(.82);
  $('out').onclick = () => scene?.zoom(1.22);
  $('orbit').onclick = () => {
    state.orbit = !state.orbit;
    $('orbit').setAttribute('aria-pressed', state.orbit);
    go(state.index);
  };
  $('question-form').onsubmit = event => {
    event.preventDefault();
    answer($('question').value, true);
  };
  $('coach-lane').onchange = () => { $('quiz').replaceChildren(); };
  $('challenge').onclick = showChallenge;
  const observer = new ResizeObserver(entries => {
    for (const {target} of entries) {
      if (target === $('chart') && state.lanes.length) drawChart();
      if (target === $('bars') && state.lanes.length && state.view === '2d') drawBars();
    }
  });
  observer.observe($('chart'));
  observer.observe($('bars'));
  switchView('3d');
  load(generate());
})();

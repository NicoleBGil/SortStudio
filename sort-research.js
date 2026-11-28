(() => {
  'use strict';
  const panel = document.getElementById('research-validation');
  const engine = globalThis.SortStudioEngine;
  if (!panel || !engine) return;

  const run = panel.querySelector('#sr-run');
  const status = panel.querySelector('#sr-status');
  const progress = panel.querySelector('#sr-progress');
  const results = panel.querySelector('#sr-results');
  const body = results.querySelector('tbody');
  const length = 1000;
  const seed = 138;
  const methods = engine.algorithms;
  progress.max = methods.length;

  function verify(input, expected, sorted, stable) {
    const {result, resultIds} = sorted;
    if (result.length !== input.length || resultIds.length !== input.length) throw new Error('Record count changed.');
    const seen = new Uint8Array(input.length);
    for (let i = 0; i < input.length; i++) {
      const id = resultIds[i];
      if (!Number.isInteger(id) || id < 0 || id >= input.length || seen[id]) throw new Error('Record IDs changed.');
      if (result[i] !== expected[i] || result[i] !== input[id]) throw new Error('Output order or record key changed.');
      if (stable && i > 0 && result[i] === result[i - 1] && id < resultIds[i - 1]) {
        throw new Error('Equal-key records changed order.');
      }
      seen[id] = 1;
    }
  }

  const candidate = document.getElementById('run-aware-counting');
  const candidateInput = candidate?.querySelector('#sr-candidate-input');
  const candidateLog = candidate?.querySelector('#sr-candidate-status');
  const routeLabels = {
    ordered: 'Already ordered',
    'reverse-groups': 'Reverse equal-key groups',
    'dense-counting': 'Stable counting with compact bins',
    'natural-merge': 'Stable merge of ordered runs',
  };
  candidate?.querySelector('#sr-candidate-run').addEventListener('click', () => {
    try {
      const input = engine.uniformRecords(length, seed);
      if (candidateInput.value === 'ordered') input.sort((a, b) => a - b);
      if (candidateInput.value === 'reverse') input.sort((a, b) => b - a);
      if (candidateInput.value === 'wide') {
        for (let i = 0; i < input.length; i++) input[i] *= 1_000_003;
      }
      const sorted = engine.runResearch('run-aware-counting', input);
      verify(input, input.slice().sort((a, b) => a - b), sorted, true);
      const format = new Intl.NumberFormat('en-US').format;
      candidateLog.textContent = `${routeLabels[sorted.route]}. Verified ${format(length)} records. ` +
        `${format(sorted.metrics.comparisons)} ordering comparisons and ${format(sorted.metrics.writes)} main writes.`;
    } catch (error) {
      candidateLog.textContent = `Verification failed. ${error.message}`;
    }
  });

  function appendRow(name, outcome, metrics = {}) {
    const row = body.insertRow();
    const heading = document.createElement('th');
    heading.scope = 'row';
    heading.textContent = name;
    row.append(heading);
    for (const value of [outcome, metrics.comparisons, metrics.writes, metrics.auxWrites]) {
      row.insertCell().textContent = typeof value === 'number' ? value.toLocaleString('en-US') : value ?? '—';
    }
  }

  run.addEventListener('click', async () => {
    run.disabled = true;
    progress.value = 0;
    progress.hidden = false;
    results.hidden = true;
    body.replaceChildren();
    status.textContent = 'Checking sorted keys, record identities, and stable methods…';
    let passed = 0;
    try {
      const input = Object.freeze(engine.uniformRecords(length, seed));
      const expected = input.slice().sort((left, right) => left - right);
      for (const method of methods) {
        // Yield between methods so the progress readout and navigation can update.
        await new Promise(resolve => setTimeout(resolve, 0));
        try {
          const sorted = engine.runResearch(method.id, input);
          verify(input, expected, sorted, method.stable);
          appendRow(method.name, 'Passed', sorted.metrics);
          passed++;
        } catch (error) {
          appendRow(method.name, error.message);
        }
        progress.value++;
      }
      results.hidden = false;
      status.textContent = `${passed} of ${methods.length} methods passed on the same 1,000 records.`;
    } catch (error) {
      status.textContent = `The check could not start. ${error.message}`;
    } finally {
      progress.hidden = true;
      run.disabled = false;
    }
  });
})();

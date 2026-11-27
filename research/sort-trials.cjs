'use strict';

const assert = require('node:assert/strict');
const {createHash} = require('node:crypto');
const {mkdirSync, readFileSync, writeFileSync} = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {parseArgs} = require('node:util');
const {isMainThread, parentPort, Worker, workerData} = require('node:worker_threads');
const engine = require('../sort-engine.js');

const maxWorkers = 12;
const native = {id: 'native-js', name: 'JavaScript Array.sort', stable: true, kind: 'reference'};
const methods = [
  ...engine.researchAlgorithms.map((method, index) => ({
    id: method.id, name: method.name, stable: method.stable,
    kind: index < engine.algorithms.length ? 'baseline' : 'hybrid',
  })),
  native,
];
const byId = new Map(methods.map(method => [method.id, method]));
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const hashOrder = order => digest(JSON.stringify(order));
const compareKeys = (a, b, direction) => direction === 'asc' ? a - b : b - a;

function researchInput(length, seed, keyBits) {
  const input = engine.uniformRecords(length, seed);
  if (keyBits === 12) return input;
  const shift = 12 - keyBits;
  const midpoint = 1 << (keyBits - 1);
  return input.map(key => ((key + 2048) >>> shift) - midpoint);
}

function runMethod(id, input, direction) {
  if (id !== native.id) return engine.runResearch(id, input, direction);
  const records = input.map((key, origin) => ({key, origin}));
  records.sort((a, b) => compareKeys(a.key, b.key, direction));
  return {result: records.map(row => row.key), resultIds: records.map(row => row.origin), metrics: null};
}

function checkResult(method, input, direction, run) {
  const label = `${method.id} ${direction}`;
  assert.equal(run.result.length, input.length, `${label}: output length`);
  assert.equal(run.resultIds.length, input.length, `${label}: identity length`);
  const seen = new Uint8Array(input.length);
  let stable = true;
  for (let i = 0; i < input.length; i++) {
    const id = run.resultIds[i];
    assert.ok(Number.isSafeInteger(id) && id >= 0 && id < seen.length && !seen[id], `${label}: permutation`);
    seen[id] = 1;
    assert.equal(run.result[i], input[id], `${label}: unchanged key and identity`);
    if (i === 0) continue;
    assert.ok(compareKeys(run.result[i - 1], run.result[i], direction) <= 0, `${label}: key order`);
    if (run.result[i - 1] === run.result[i] && run.resultIds[i - 1] > id) stable = false;
  }
  if (method.stable) assert.ok(stable, `${label}: stable tie order`);
  return stable;
}

function validateJobs(jobs, length, keyBits) {
  const inputs = new Map();
  return jobs.map(({id, seed, direction}) => {
    if (!inputs.has(seed)) inputs.set(seed, Object.freeze(researchInput(length, seed, keyBits)));
    const input = inputs.get(seed);
    const run = runMethod(id, input, direction);
    const stable = checkResult(byId.get(id), input, direction, run);
    return {id, seed, direction, stable, orderSha256: hashOrder(run.resultIds), metrics: run.metrics};
  });
}

function workerChecks(jobs, length, keyBits, count) {
  const batches = Array.from({length: count}, () => []);
  for (let index = 0; index < jobs.length; index++) batches[index % count].push(jobs[index]);
  return Promise.all(batches.map(batch => new Promise((resolve, reject) => {
    const worker = new Worker(__filename, {workerData: {jobs: batch, length, keyBits}});
    let receipts;
    worker.once('message', result => { receipts = result; });
    worker.once('error', reject);
    worker.once('exit', code => {
      if (code !== 0 || !Array.isArray(receipts)) {
        reject(new Error(`Validation worker did not return a complete result (exit ${code}).`));
      } else resolve(receipts);
    });
  })));
}

function shuffledMethods(seed) {
  const order = methods.slice();
  const draws = engine.uniformRecords(order.length, seed);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor((draws[i] + 2048) * (i + 1) / 4096);
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

function median(values) {
  const ordered = values.slice().sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2;
}

function measureDataset(length, seed, keyBits, repeats) {
  const input = Object.freeze(researchInput(length, seed, keyBits));
  const timings = new Map(methods.map(({id}) => [id, []]));
  for (const method of shuffledMethods(seed)) checkResult(method, input, 'asc', runMethod(method.id, input, 'asc'));
  for (let repeat = 0; repeat < repeats; repeat++) {
    for (const method of shuffledMethods((seed + repeat + 1) >>> 0)) {
      const start = process.hrtime.bigint();
      const result = runMethod(method.id, input, 'asc');
      timings.get(method.id).push(Number(process.hrtime.bigint() - start));
      checkResult(method, input, 'asc', result);
    }
  }
  return Object.fromEntries([...timings].map(([id, samplesNs]) => [id, {samplesNs, medianNs: median(samplesNs)}]));
}

function intOption(value, label, min, max) {
  if (!/^\d+$/.test(value) || Number(value) < min || Number(value) > max) {
    throw new RangeError(`--${label} must be an integer from ${min} to ${max}.`);
  }
  return Number(value);
}

function options() {
  const {values} = parseArgs({options: {
    records: {type: 'string', default: '1000'},
    seed: {type: 'string', default: '138'},
    workers: {type: 'string', default: '12'},
    repeats: {type: 'string', default: '5'},
    'key-bits': {type: 'string', default: '12'},
    output: {type: 'string', default: 'research/results/uniform-1000'},
  }});
  return {
    length: intOption(values.records, 'records', 2, engine.maxResearchLength),
    seed: intOption(values.seed, 'seed', 0, 0xffffffff),
    workers: intOption(values.workers, 'workers', 1, maxWorkers),
    repeats: intOption(values.repeats, 'repeats', 3, 20),
    keyBits: intOption(values['key-bits'], 'key-bits', 1, 12),
    output: path.resolve(values.output),
  };
}

function summarize(report) {
  const lines = [
    '# SortStudio uniform-record trials',
    '',
    `Validated **${report.validation.cases} cases** using ${report.validation.workers} workers. ` +
      `Each input contains ${report.records} signed integer records in ` +
      `[${report.distribution.minimum}, ${report.distribution.maximum}].`,
    '',
    'All timed tests ran serially on the CPU. The timings include the normal record construction and metrics in the SortStudio engine. JavaScript Array.sort is listed separately as a runtime reference.',
    '',
    `The tuning seed selected **${report.selectedHybrid.name}**. The table summarizes the held-out seeds without changing the selection.`,
    '',
    '| Method | Held-out median (ms) | Held-out wins against best original on each seed |',
    '| --- | ---: | ---: |',
    ...[report.bestOriginal, report.selectedHybrid, report.reference].map(row => {
      const wins = row.kind === 'baseline' ? '—' :
        `${row.winsAgainstOriginal} / ${report.heldOutSeeds.length}`;
      return `| ${row.name} | ${(row.heldOutMedianNs / 1e6).toFixed(3)} | ${wins} |`;
    }),
    '',
    'These timings describe this implementation, key range, input size, and local CPU. They establish neither general sorting superiority nor A100 performance.',
    '',
  ];
  return lines.join('\n');
}

async function main() {
  const {length, seed, workers, repeats, keyBits, output} = options();
  const holdout = [16807, 48271, 65537, 104729, 196613].map(offset => (seed + offset) >>> 0);
  const seeds = [seed, ...holdout];
  const jobs = seeds.flatMap(value => methods.flatMap(({id}) =>
    ['asc', 'desc'].map(direction => ({id, seed: value, direction}))));
  const count = Math.min(workers, os.availableParallelism(), jobs.length);
  mkdirSync(path.dirname(output), {recursive: true});
  mkdirSync(output);
  const input = researchInput(length, seed, keyBits);
  const csv = 'id,key\n' + input.map((key, id) => `${id},${key}\n`).join('');
  writeFileSync(path.join(output, 'tuning-input.csv'), csv);
  console.log(`Validating ${jobs.length} sorted permutations using ${count} worker threads.`);
  const validations = (await workerChecks(jobs, length, keyBits, count)).flat();
  assert.equal(validations.length, jobs.length);
  validations.sort((a, b) => a.seed - b.seed || a.id.localeCompare(b.id) || a.direction.localeCompare(b.direction));

  console.log('Validation passed. Measuring CPU latency serially across six seeds.');
  const tuning = measureDataset(length, seed, keyBits, repeats);
  const selectedId = methods.filter(method => method.kind === 'hybrid')
    .sort((a, b) => tuning[a.id].medianNs - tuning[b.id].medianNs || a.id.localeCompare(b.id))[0].id;
  const measurements = Object.fromEntries(holdout.map(value => [value, measureDataset(length, value, keyBits, repeats)]));
  const originalBestNs = holdout.map(value => Math.min(...engine.algorithms.map(({id}) => measurements[value][id].medianNs)));
  const ranks = methods.map(method => {
    const heldOut = holdout.map(value => ({seed: value, ...measurements[value][method.id]}));
    return {...method, tuning: tuning[method.id], heldOut, heldOutMedianNs: median(heldOut.map(row => row.medianNs)),
      winsAgainstOriginal: heldOut.filter((row, index) => row.medianNs < originalBestNs[index]).length};
  }).sort((a, b) => a.heldOutMedianNs - b.heldOutMedianNs || a.id.localeCompare(b.id));

  const report = {
    schema: 'sortstudio-uniform-trial-v1',
    records: length,
    tuningSeed: seed,
    heldOutSeeds: holdout,
    distribution: {generator: `Mulberry32 high ${keyBits} bits`, minimum: -(1 << (keyBits - 1)),
      maximum: (1 << (keyBits - 1)) - 1, keyBits,
      tuningCsvSha256: digest(csv),
      inputs: seeds.map(value => {
        const records = researchInput(length, value, keyBits);
        return {seed: value, sha256: hashOrder(records), distinctKeys: new Set(records).size};
      })},
    execution: {device: 'CPU only', node: process.version, platform: process.platform,
      architecture: process.arch, cpu: os.cpus()[0]?.model ?? null,
      engineSha256: digest(readFileSync(require.resolve('../sort-engine.js'))),
      harnessSha256: digest(readFileSync(__filename)),
      latency: 'One warm-up per method per seed. Serial full-call ascending timings; validation outside timed interval.',
      repeats},
    validation: {workers: count, cases: validations.length, originalMethods: engine.algorithms.length,
      hybridCandidates: methods.filter(method => method.kind === 'hybrid').length, receipts: validations},
    selectedHybrid: ranks.find(row => row.id === selectedId),
    bestOriginal: ranks.find(row => row.kind === 'baseline'),
    reference: ranks.find(row => row.kind === 'reference'),
    ranking: ranks,
  };
  writeFileSync(path.join(output, 'trials.json'), JSON.stringify(report, null, 2) + '\n');
  writeFileSync(path.join(output, 'summary.md'), summarize(report));
  console.log(`Saved ${path.join(output, 'trials.json')}`);
}

if (!isMainThread) {
  parentPort.postMessage(validateJobs(workerData.jobs, workerData.length, workerData.keyBits));
} else {
  main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

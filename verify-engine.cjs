const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const engine = require('./sort-engine.js');

const {algorithms, byId, run, maxLength, maxCountingSpan} = engine;
const directions = ['asc', 'desc'];
const balancedValues = [-2, 0, 2];
let runsChecked = 0;
let framesChecked = 0;

assert.equal(algorithms.length, 20);
assert.equal(new Set(algorithms.map(({id}) => id)).size, 20);
for (const algorithm of algorithms) assert.equal(byId[algorithm.id], algorithm);

function checkOutput(algorithm, direction, input, traced = false) {
  const label = `${algorithm.id} ${direction} [${input.join(', ')}]`;
  const order = direction === 'asc' ? 1 : -1;
  const orderedIds = input.map((_, id) => id).sort((left, right) => {
    if (input[left] === input[right]) return left - right;
    return (input[left] < input[right] ? -1 : 1) * order;
  });
  const result = run(algorithm.id, Object.freeze(input), direction, {trace: traced});
  assert.deepEqual(result.initial, input, `${label}: initial values`);
  assert.deepEqual(result.result, orderedIds.map(id => input[id]), `${label}: sorted values`);
  assert.deepEqual(result.resultIds.slice().sort((a, b) => a - b), input.map((_, id) => id), `${label}: input IDs`);
  assert.deepEqual(result.resultIds.map(id => input[id]), result.result, `${label}: keys kept their IDs`);
  if (algorithm.stable) assert.deepEqual(result.resultIds, orderedIds, `${label}: stability`);
  assert.equal(result.metrics.writes >= result.metrics.swaps * 2, true, `${label}: swap writes`);
  assert.equal(result.eventCount >= 2, true, `${label}: ready and done`);
  if (!traced) {
    assert.equal(result.events.length, 0);
    assert.equal(result.at(0), undefined);
  }
  runsChecked++;
  return result;
}

function verifyReplay(algorithm, direction, input) {
  const result = checkOutput(algorithm, direction, input, true);
  const compact = checkOutput(algorithm, direction, input);
  assert.deepEqual(result.metrics, compact.metrics);
  assert.deepEqual(result.resultIds, compact.resultIds);
  assert.equal(result.eventCount, compact.eventCount);
  assert.equal(result.events.length, result.eventCount);
  assert.equal(result.at(0).phase, 'ready');
  assert.equal(result.at(-1).phase, 'done');
  assert.equal(result.at(result.eventCount), undefined);
  assert.equal(result.at(-result.eventCount - 1), undefined);
  assert.equal(result.at(0.5), undefined);
  const values = input.slice();
  const ids = input.map((_, id) => id);
  let previous = {comparisons: 0, writes: 0, swaps: 0, auxWrites: 0};
  for (const event of result.events) {
    const {index, metrics, patches, phase} = event;
    const frame = result.at(index);
    for (const position of event.indices) assert.ok(position >= 0 && position < input.length);
    for (const {index: position, id, value} of patches) {
      assert.ok(position >= 0 && position < input.length);
      assert.equal(value, input[id]);
      values[position] = value;
      ids[position] = id;
    }
    assert.ok(event.message.length > 0);
    assert.equal(metrics.comparisons - previous.comparisons, phase === 'compare' ? 1 : 0);
    assert.equal(metrics.swaps - previous.swaps, phase === 'swap' ? 1 : 0);
    assert.equal(metrics.writes - previous.writes, patches.length);
    if (phase === 'compare') {
      assert.equal(event.operands.length, 2);
      assert.deepEqual(event.operandIds.map(id => input[id]), event.operands);
    }
    if (phase === 'swap') assert.equal(patches.length, 2);
    assert.equal(metrics.auxWrites > previous.auxWrites, phase === 'auxiliary');
    assert.deepEqual(frame.values, values, `${algorithm.id} frame ${index}: replayed keys`);
    assert.deepEqual(frame.ids, ids, `${algorithm.id} frame ${index}: replayed IDs`);
    previous = metrics;
    framesChecked++;
  }
  assert.deepEqual(previous, result.metrics);
  assert.deepEqual(result.at(-1).ids, result.resultIds);
  assert.deepEqual(result.at(-1).values, result.result);
  const first = result.at(0);
  first.values.fill(0);
  assert.deepEqual(result.at(0).values, input);
}

for (let size = 0; size <= 6; size++) {
  for (let sample = 0; sample < 3 ** size; sample++) {
    const input = Array.from({length: size}, (_, i) => balancedValues[Math.floor(sample / 3 ** i) % 3]);
    for (const algorithm of algorithms) {
      for (const direction of directions) checkOutput(algorithm, direction, input);
    }
  }
}

let seed = 2463987;
function nextInt(limit) {
  seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
  return seed % limit;
}

const extreme = [Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, 0, -1, 1, Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER];
const wideAscending = Array.from({length: maxLength}, (_, i) => i - 64);
const replayCases = [[3, 2, 1], [4, -2, 8, -2, 8, 0, 0, -9], Array.from({length: 37}, (_, i) => 19 - i)];
for (const algorithm of algorithms) {
  for (const direction of directions) {
    checkOutput(algorithm, direction, wideAscending);
    checkOutput(algorithm, direction, wideAscending.slice().reverse());
    checkOutput(algorithm, direction, Array(maxLength).fill(-3));
    for (let i = 0; i < 20; i++) {
      const length = nextInt(maxLength + 1);
      checkOutput(algorithm, direction, Array.from({length}, () => nextInt(i % 2 === 0 ? 512 : 11) - 6));
    }
    for (const input of replayCases) verifyReplay(algorithm, direction, input);
    if (algorithm.id === 'counting') {
      const high = Number.MAX_SAFE_INTEGER;
      verifyReplay(algorithm, direction, [high, high - maxCountingSpan + 1, high, high - 1]);
      assert.throws(() => run('counting', extreme, direction), /consecutive integer bins/);
    } else verifyReplay(algorithm, direction, extreme);
  }
}

assert.deepEqual(run('bubble', [3, 2, 1]).metrics, {comparisons: 3, writes: 6, swaps: 3, auxWrites: 0});
assert.deepEqual(run('selection', [3, 2, 1]).metrics, {comparisons: 3, writes: 2, swaps: 1, auxWrites: 0});
assert.deepEqual(run('insertion', [3, 2, 1]).metrics, {comparisons: 3, writes: 5, swaps: 0, auxWrites: 0});
assert.equal(run('counting', [3, 2, 1]).metrics.comparisons, 0);
assert.equal(run('radix', [3, 2, 1]).metrics.comparisons, 0);
assert.throws(() => run('unrecognized', [1]), /Unknown sort/);
assert.throws(() => run('constructor', [1]), /Unknown sort/);
assert.throws(() => run('bubble', [1], 'sideways'), /Choose asc or desc/);
assert.throws(() => run('bubble', Array(maxLength + 1)), /at most/);
for (const invalid of [null, new Int16Array([1, 2]), [1.5], [NaN], [Infinity], ['1'], Array(1), [Number.MAX_SAFE_INTEGER + 1]]) {
  assert.throws(() => run('bubble', invalid), /safe integers/);
}

const browser = vm.createContext({});
vm.runInContext(fs.readFileSync(require.resolve('./sort-engine.js'), 'utf8'), browser);
assert.equal(browser.SortStudioEngine.algorithms.length, 20);
assert.equal(Array.from(browser.SortStudioEngine.run('merge', [4, 1, -1]).at(-1).values).join(','), '-1,1,4');

console.log(`Verified ${algorithms.length} algorithms across ${runsChecked.toLocaleString('en-US')} runs and ${framesChecked.toLocaleString('en-US')} replay frames.`);

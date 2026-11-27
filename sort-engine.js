/* SortStudio's shared, replayable sorting model. Works without a server. */
(function (root, factory) {
  'use strict';
  const engine = factory();
  if (typeof module === 'object' && module.exports) module.exports = engine;
  else root.SortStudioEngine = engine;
})(globalThis, function () {
  'use strict';

  const maxLength = 128;
  const maxResearchLength = 4096;
  const maxCountingSpan = 16384;
  const checkpointSize = 128;

  const definitions = [
    ['bubble', 'Bubble Sort', 'Exchange', true, 'O(n)', 'O(n²)', 'O(n²)', 'O(1)',
      'Compare neighbors and move the extreme value toward the end of each pass. An unchanged pass ends the run.',
      ['Sweep the unsorted prefix', 'Swap an out-of-order adjacent pair', 'Shorten the unsorted prefix', 'Stop early if nothing moved']],
    ['selection', 'Selection Sort', 'Selection', false, 'O(n²)', 'O(n²)', 'O(n²)', 'O(1)',
      'Scan the remaining range for its next extreme. A long-distance swap can reverse equal records.',
      ['Pick a position to fill', 'Scan the remaining range for its extreme', 'Exchange that record with the current position']],
    ['insertion', 'Insertion Sort', 'Insertion', true, 'O(n)', 'O(n²)', 'O(n²)', 'O(1)',
      'Hold a record, shift larger predecessors in ascending order, and place the record after any equal keys.',
      ['Hold the next record', 'Shift predecessors that belong after it', 'Write it after equal keys']],
    ['binary-insertion', 'Binary Insertion Sort', 'Insertion', true, 'O(n log n)', 'O(n²)', 'O(n²)', 'O(1)',
      'Find the insertion point by binary search. Moving the records to open that position can still take quadratic time.',
      ['Hold the next record', 'Find the upper bound in the sorted prefix', 'Shift the gap open', 'Insert the held record']],
    ['cocktail', 'Cocktail Shaker Sort', 'Exchange', true, 'O(n)', 'O(n²)', 'O(n²)', 'O(1)',
      'Alternate forward and backward neighbor sweeps so outliers can travel toward either end.',
      ['Sweep forward through the current range', 'Shrink the right boundary', 'Sweep backward through the current range', 'Shrink the left boundary']],
    ['gnome', 'Gnome Sort', 'Exchange', true, 'O(n)', 'O(n²)', 'O(n²)', 'O(1)',
      'Advance across ordered neighbors. Exchange an inverted pair and step back to inspect the new neighbor.',
      ['Compare with the previous position', 'Advance if ordered', 'Otherwise swap and step backward']],
    ['odd-even', 'Odd–Even Sort', 'Exchange', true, 'O(n)', 'O(n²)', 'O(n²)', 'O(1)',
      'Alternate disjoint even-start and odd-start neighbor pairs. Two phases without an exchange finish the array.',
      ['Compare even-start neighbor pairs', 'Compare odd-start neighbor pairs', 'Repeat if any pair exchanged']],
    ['comb', 'Comb Sort', 'Exchange', false, 'O(n log n)', 'Gap-dependent', 'O(n²)', 'O(1)',
      'Shrink a gap between compared positions to move outliers faster. At gap one, continue until a pass makes no exchange.',
      ['Start with a wide gap', 'Reduce the gap by a factor of 1.3', 'Exchange out-of-order pairs at the gap', 'Finish with passes at gap one']],
    ['shell', 'Shell Sort', 'Insertion', false, 'O(n) with fixed gaps', 'Gap-dependent', 'O(n²) upper bound', 'O(1)',
      'Perform insertion sorts along gap-spaced subsequences. This implementation uses the Ciura gaps and ends at one.',
      ['Choose a decreasing gap', 'Insert within the gap-spaced subsequences', 'Finish with ordinary insertion at gap one']],
    ['merge', 'Merge Sort', 'Divide and conquer', true, 'O(n log n)', 'O(n log n)', 'O(n log n)', 'O(n)',
      'Recursively split the input into smaller ranges, then merge sorted halves with the left record winning ties.',
      ['Split the range in half', 'Sort each half recursively', 'Copy the range into a buffer', 'Merge heads, favoring the left on ties']],
    ['natural-merge', 'Natural Merge Sort', 'Divide and conquer', true, 'O(n)', 'O(n log n)', 'O(n log n)', 'O(n)',
      'Detect runs already in the requested order and merge adjacent runs in rounds. A single run requires no merge.',
      ['Scan for already ordered runs', 'Record the run boundaries', 'Merge adjacent runs in rounds', 'Finish when a single run remains']],
    ['quick', 'Quicksort', 'Divide and conquer', false, 'O(n log n)', 'O(n log n)', 'O(n²)', 'O(log n) stack',
      'Use the last record as a pivot. Lomuto partitioning places it at its final position before the two side ranges are sorted.',
      ['Choose the final record as pivot', 'Place records preceding the pivot on the left', 'Place the pivot at the boundary', 'Sort the two remaining ranges']],
    ['quick-three-way', 'Three-Way Quicksort', 'Divide and conquer', false, 'O(n)', 'O(n log n)', 'O(n²)', 'O(log n) stack',
      'Partition each range into keys before, equal to, and after a middle pivot. The equal band needs no further sorting.',
      ['Hold the middle key as a pivot', 'Partition into before, equal, and after bands', 'Sort the two outer bands']],
    ['heap', 'Heapsort', 'Selection', false, 'O(n) with all equal keys', 'O(n log n)', 'O(n log n)', 'O(1)',
      'Build a heap, then move the root to the final free slot. Restore order only in the shrinking heap.',
      ['Build a heap from the bottom up', 'Exchange its root with the last free slot', 'Restore the heap in the remaining range']],
    ['cycle', 'Cycle Sort', 'Selection', false, 'O(n²)', 'O(n²)', 'O(n²)', 'O(1)',
      'Rank a held record among the remaining keys and rotate displaced records through their destinations. Skip occupied equal-key slots.',
      ['Count records that precede the held key', 'Skip equal-key destinations', 'Write and hold the displaced record', 'Continue until the cycle returns to its start']],
    ['pancake', 'Pancake Sort', 'Selection', false, 'O(n²)', 'O(n²)', 'O(n²)', 'O(1)',
      'Move the next extreme to its final position with up to two prefix reversals. No individual record can be moved directly.',
      ['Find the extreme in the unsorted prefix', 'Flip it to the first position', 'Flip the whole remaining prefix', 'Shorten the remaining prefix']],
    ['tree', 'Tree Sort', 'Tree', true, 'O(n) with all equal keys', 'O(n log n)', 'O(n²)', 'O(n)',
      'Insert records into an unbalanced search tree. Equal keys share a queue, so the in-order traversal keeps their order.',
      ['Insert each key into the search tree', 'Queue records with an equal key in arrival order', 'Traverse the tree in the requested order']],
    ['counting', 'Counting Sort', 'Distribution', true, 'O(n + k)', 'O(n + k)', 'O(n + k)', 'O(n + k)',
      'Count integer frequencies in a dense interval of size k. After the range scan, cumulative counts give output positions without ordering comparisons.',
      ['Normalize keys to ordered frequency bins', 'Count how many records use each bin', 'Accumulate the frequencies into positions', 'Scatter from right to left for stability']],
    ['radix', 'LSD Radix Sort', 'Distribution', true, 'O(d(n + 10))', 'O(d(n + 10))', 'O(d(n + 10))', 'O(n + 10)',
      'Perform stable base-ten distribution from the least significant digit upward. Ordered integer offsets handle signed keys.',
      ['Normalize keys to nonnegative offsets', 'Distribute records by the current digit', 'Collect the bins in digit order', 'Advance to the next digit']],
    ['bucket', 'Bucket Sort', 'Distribution', true, 'O(n + b)', 'Input-dependent', 'O(n² + b)', 'O(n + b)',
      'Assign values to b ordered intervals. Stable insertion sorts each interval before the buckets are concatenated.',
      ['Normalize keys to ordered ranges', 'Place each record into a bucket', 'Sort each bucket by stable insertion', 'Read the buckets in order']],
  ];

  const algorithms = Object.freeze(definitions.map(([id, name, family, stable, best, average, worst, space, description, pseudocode]) =>
    Object.freeze({id, name, family, stable, best, average, worst, space, description, pseudocode: Object.freeze(pseudocode)})));
  const byId = Object.freeze(Object.fromEntries(algorithms.map(algorithm => [algorithm.id, algorithm])));
  const metricDefinitions = Object.freeze({
    comparisons: 'Ordering comparisons during sorting, including records in auxiliary storage. Input validation and distribution range scans are excluded.',
    writes: 'Assignments to the main array. Each swap writes two records.',
    swaps: 'Exchanges between distinct main-array positions.',
    auxWrites: 'Recorded updates to working storage, such as merge buffers, frequency counts, run lists, buckets, and tree nodes.',
  });

  function copyInput(input, direction, limit) {
    if (!Array.isArray(input)) throw new TypeError('Use a list of safe integers.');
    if (input.length > limit) throw new RangeError(`Use at most ${limit} integers per run.`);
    if (direction !== 'asc' && direction !== 'desc') throw new RangeError('Choose asc or desc.');
    const copy = Array.from({length: input.length}, (_, index) => input[index]);
    if (copy.some(value => !Number.isSafeInteger(value))) throw new TypeError('Use a list of safe integers.');
    return Object.freeze(copy);
  }

  function uniformRecords(length = 1000, seed = 138) {
    if (!Number.isSafeInteger(length) || length < 0 || length > maxResearchLength) {
      throw new RangeError(`Use 0 to ${maxResearchLength} research records.`);
    }
    if (!Number.isSafeInteger(seed) || seed < 0 || seed > 0xffffffff) {
      throw new RangeError('Use an unsigned 32-bit seed.');
    }
    let state = seed;
    return Array.from({length}, () => {
      state = (state + 0x6d2b79f5) >>> 0;
      let mixed = Math.imul(state ^ (state >>> 15), state | 1);
      mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
      return ((mixed ^ (mixed >>> 14)) >>> 20) - 2048;
    });
  }

  function makeRecorder(input, direction, trace) {
    const a = input.map((value, id) => Object.freeze({value, id}));
    const events = [];
    const checkpoints = [];
    const metrics = {comparisons: 0, writes: 0, swaps: 0, auxWrites: 0};
    let eventCount = 0;

    function emit(phase, indices, message, detail = {}, patches = [], operands = []) {
      const index = eventCount++;
      if (!trace) return;
      const event = Object.freeze({
        index, phase, message,
        indices: Object.freeze([...new Set(indices.filter(i => Number.isInteger(i) && i >= 0 && i < a.length))]),
        metrics: Object.freeze({...metrics}),
        patches: Object.freeze(patches),
        operands: Object.freeze(operands.map(record => record.value)),
        operandIds: Object.freeze(operands.map(record => record.id)),
        detail: Object.freeze(detail),
      });
      events.push(event);
      if (index % checkpointSize === 0) checkpoints.push(a.slice());
    }

    function compare(left, right, indices = [], note) {
      metrics.comparisons++;
      emit('compare', indices, note || `Compare ${left.value} with ${right.value}.`, {}, [], [left, right]);
      if (left.value === right.value) return 0;
      const order = left.value < right.value ? -1 : 1;
      return direction === 'asc' ? order : -order;
    }

    function swap(i, j, note) {
      if (i === j) return;
      const left = a[i];
      const right = a[j];
      a[i] = right;
      a[j] = left;
      metrics.writes += 2;
      metrics.swaps++;
      emit('swap', [i, j], note || `Exchange positions ${i + 1} and ${j + 1}.`, {},
        [Object.freeze({index: i, ...right}), Object.freeze({index: j, ...left})]);
    }

    function write(i, record, phase = 'write', note, detail) {
      a[i] = record;
      metrics.writes++;
      emit(phase, [i], note || `Write ${record.value} at position ${i + 1}.`, detail,
        [Object.freeze({index: i, ...record})]);
    }

    function auxiliary(count, indices, note, detail) {
      metrics.auxWrites += count;
      emit('auxiliary', indices, note, detail);
    }

    function at(index) {
      if (!Number.isInteger(index)) return undefined;
      const position = index >= 0 ? index : events.length + index;
      if (position < 0 || position >= events.length) return undefined;
      const checkpoint = Math.floor(position / checkpointSize);
      const frame = checkpoints[checkpoint].slice();
      for (let i = checkpoint * checkpointSize + 1; i <= position; i++) {
        for (const patch of events[i].patches) frame[patch.index] = patch;
      }
      return {...events[position], values: frame.map(record => record.value), ids: frame.map(record => record.id)};
    }

    return {a, emit, compare, swap, write, auxiliary, at, events, metrics, get eventCount() { return eventCount; }};
  }

  function bubble({a, compare, swap, emit}) {
    for (let end = a.length - 1; end > 0; end--) {
      let changed = false;
      for (let j = 0; j < end; j++) {
        if (compare(a[j], a[j + 1], [j, j + 1]) <= 0) continue;
        swap(j, j + 1);
        changed = true;
      }
      emit('range', [end], changed ? `Position ${end + 1} is settled.` : 'The pass made no exchanges.');
      if (!changed) break;
    }
  }

  function selection({a, compare, swap, emit}) {
    for (let i = 0; i < a.length - 1; i++) {
      let best = i;
      for (let j = i + 1; j < a.length; j++) {
        if (compare(a[j], a[best], [j, best]) >= 0) continue;
        best = j;
        emit('select', [best], `Select ${a[best].value} as the next candidate.`);
      }
      swap(i, best);
    }
  }

  function gappedInsertion({a, compare, write, emit}, gap, low = 0, high = a.length) {
    for (let i = low + gap; i < high; i++) {
      const held = a[i];
      let j = i;
      emit('hold', [i], `Hold ${held.value} for insertion.`, {held, gap});
      while (j >= low + gap && compare(a[j - gap], held, [j - gap], `Compare ${a[j - gap].value} with held key ${held.value}.`) > 0) {
        write(j, a[j - gap], 'shift', `Shift ${a[j - gap].value} forward by ${gap}.`, {held, gap});
        j -= gap;
      }
      write(j, held, 'insert');
    }
  }

  function binaryInsertion({a, compare, write, emit}, start = 0, end = a.length) {
    for (let i = start + 1; i < end; i++) {
      const held = a[i];
      emit('hold', [i], `Hold ${held.value} and binary-search the sorted prefix.`, {held});
      let low = start;
      let high = i;
      while (low < high) {
        const middle = Math.floor((low + high) / 2);
        if (compare(a[middle], held, [middle, i]) <= 0) low = middle + 1;
        else high = middle;
      }
      for (let j = i; j > low; j--) write(j, a[j - 1], 'shift', undefined, {held});
      write(low, held, 'insert');
    }
  }

  function cocktail({a, compare, swap, emit}) {
    let start = 0;
    let end = a.length - 1;
    while (start < end) {
      let changed = false;
      emit('range', [start, end], 'Sweep forward.');
      for (let i = start; i < end; i++) {
        if (compare(a[i], a[i + 1], [i, i + 1]) > 0) {
          swap(i, i + 1);
          changed = true;
        }
      }
      if (!changed) break;
      end--;
      changed = false;
      if (start < end) emit('range', [start, end], 'Sweep backward.');
      for (let i = end; i > start; i--) {
        if (compare(a[i - 1], a[i], [i - 1, i]) > 0) {
          swap(i - 1, i);
          changed = true;
        }
      }
      if (!changed) break;
      start++;
    }
  }

  function gnome({a, compare, swap}) {
    let i = 1;
    while (i < a.length) {
      if (i === 0 || compare(a[i - 1], a[i], [i - 1, i]) <= 0) i++;
      else {
        swap(i - 1, i);
        i--;
      }
    }
  }

  function oddEven({a, compare, swap, emit}) {
    if (a.length < 2) return;
    let changed;
    do {
      changed = false;
      for (let parity = 0; parity < 2; parity++) {
        emit('range', [], parity ? 'Compare odd-index neighbor pairs.' : 'Compare even-index neighbor pairs.', {parity});
        for (let i = parity; i + 1 < a.length; i += 2) {
          if (compare(a[i], a[i + 1], [i, i + 1]) > 0) {
            swap(i, i + 1);
            changed = true;
          }
        }
      }
    } while (changed);
  }

  function comb({a, compare, swap, emit}) {
    if (a.length < 2) return;
    let gap = a.length;
    let changed;
    do {
      gap = Math.max(1, Math.floor(gap / 1.3));
      changed = false;
      emit('range', [0, a.length - 1], `Run a pass with gap ${gap}.`, {gap});
      for (let i = 0; i + gap < a.length; i++) {
        if (compare(a[i], a[i + gap], [i, i + gap]) > 0) {
          swap(i, i + gap);
          changed = true;
        }
      }
    } while (gap > 1 || changed);
  }

  function shell(recorder) {
    for (const gap of [701, 301, 132, 57, 23, 10, 4, 1]) {
      if (gap >= recorder.a.length) continue;
      recorder.emit('range', [0, recorder.a.length - 1], `Insert along subsequences at gap ${gap}.`, {gap});
      gappedInsertion(recorder, gap);
    }
  }

  function mergeRange({a, compare, write, auxiliary, emit}, low, middle, high) {
    const buffer = a.slice(low, high);
    auxiliary(buffer.length, [low, high - 1], 'Copy both ordered runs into the merge buffer.', {low, middle, high});
    let left = 0;
    let right = middle - low;
    const split = right;
    for (let output = low; output < high; output++) {
      let record;
      if (left >= split) record = buffer[right++];
      else if (right >= buffer.length) record = buffer[left++];
      else if (compare(buffer[left], buffer[right], [], `Compare buffer heads ${buffer[left].value} and ${buffer[right].value}.`) <= 0) {
        record = buffer[left++];
      } else record = buffer[right++];
      write(output, record, 'merge', undefined, {low, middle, high});
    }
    emit('range', [low, high - 1], 'The merged range is ordered.', {low, high});
  }

  function mergeSort(recorder, _direction, leaf, cutoff = 0) {
    function divide(low, high) {
      if (high - low < 2) return;
      if (high - low <= cutoff) {
        leaf(recorder, low, high);
        return;
      }
      const middle = Math.floor((low + high) / 2);
      recorder.emit('split', [low, middle, high - 1], 'Split the range into two halves.', {low, middle, high});
      divide(low, middle);
      divide(middle, high);
      mergeRange(recorder, low, middle, high);
    }
    divide(0, recorder.a.length);
  }

  function naturalMerge(recorder) {
    const {a, compare, emit, auxiliary} = recorder;
    if (a.length < 2) return;
    let runs = [];
    let start = 0;
    for (let i = 1; i < a.length; i++) {
      if (compare(a[i - 1], a[i], [i - 1, i]) <= 0) continue;
      runs.push([start, i]);
      auxiliary(1, [start, i - 1], 'Record an existing ordered run.', {low: start, high: i});
      start = i;
    }
    runs.push([start, a.length]);
    auxiliary(1, [start, a.length - 1], 'Record the final ordered run.', {low: start, high: a.length});
    while (runs.length > 1) {
      const next = [];
      emit('range', [], `Merge adjacent runs. This round starts with ${runs.length}.`);
      for (let i = 0; i < runs.length; i += 2) {
        const [low, middle] = runs[i];
        const high = runs[i + 1]?.[1] ?? middle;
        if (middle < high) mergeRange(recorder, low, middle, high);
        next.push([low, high]);
        auxiliary(1, [low, high - 1], 'Record a run for the next merge round.', {low, high});
      }
      runs = next;
    }
  }

  function quick({a, compare, swap, emit}) {
    function sort(low, high) {
      while (low < high) {
        const pivot = a[high];
        emit('pivot', [high], `Use ${pivot.value} as the pivot.`, {pivot, low, high: high + 1});
        let boundary = low;
        for (let i = low; i < high; i++) {
          if (compare(a[i], pivot, [i, high]) < 0) swap(boundary++, i);
        }
        swap(boundary, high, `Place pivot ${pivot.value} at position ${boundary + 1}.`);
        if (boundary - low < high - boundary) {
          sort(low, boundary - 1);
          low = boundary + 1;
        } else {
          sort(boundary + 1, high);
          high = boundary - 1;
        }
      }
    }
    sort(0, a.length - 1);
  }

  function quickThreeWay(recorder, _direction, cutoff = 0) {
    const {a, compare, swap, emit} = recorder;
    function sort(low, high) {
      while (low < high) {
        if (high - low + 1 <= cutoff) {
          gappedInsertion(recorder, 1, low, high + 1);
          return;
        }
        const middle = Math.floor((low + high) / 2);
        const pivot = a[middle];
        emit('pivot', [middle], `Partition around the held pivot ${pivot.value}.`, {pivot, low, high: high + 1});
        let before = low;
        let after = high;
        let i = low;
        while (i <= after) {
          const order = compare(a[i], pivot, [i], `Compare ${a[i].value} with held pivot ${pivot.value}.`);
          if (order < 0) swap(i++, before++);
          else if (order > 0) swap(i, after--);
          else i++;
        }
        emit('range', [before, after], 'The middle band contains all keys equal to the pivot.', {low: before, high: after + 1});
        if (before - low < high - after) {
          sort(low, before - 1);
          low = after + 1;
        } else {
          sort(after + 1, high);
          high = before - 1;
        }
      }
    }
    sort(0, a.length - 1);
  }

  function heap({a, compare, swap, emit}) {
    function down(root, size) {
      while (2 * root + 1 < size) {
        let child = 2 * root + 1;
        if (child + 1 < size && compare(a[child + 1], a[child], [child + 1, child]) > 0) child++;
        if (compare(a[child], a[root], [child, root]) <= 0) break;
        swap(child, root, 'Move the later key toward the heap root.');
        root = child;
      }
    }
    if (a.length < 2) return;
    emit('range', [0, a.length - 1], 'Build the heap bottom-up.');
    for (let i = Math.floor(a.length / 2) - 1; i >= 0; i--) down(i, a.length);
    for (let end = a.length - 1; end > 0; end--) {
      swap(0, end, 'Move the heap root into its final position.');
      down(0, end);
    }
  }

  function cycle({a, compare, write, emit}) {
    function rank(start, held) {
      let target = start;
      for (let i = start + 1; i < a.length; i++) {
        if (compare(a[i], held, [i], `Rank held key ${held.value} against ${a[i].value}.`) < 0) target++;
      }
      return target;
    }
    for (let start = 0; start < a.length - 1; start++) {
      let held = a[start];
      let target = rank(start, held);
      if (target === start) continue;
      emit('hold', [start], `Start a placement cycle with ${held.value}.`, {held});
      do {
        while (target < a.length && compare(a[target], held, [target], `Skip a slot already occupied by ${held.value}.`) === 0) target++;
        if (target >= a.length) throw new Error('Cycle Sort could not locate a free-ranked position.');
        const displaced = a[target];
        write(target, held, 'write', `Place ${held.value} and hold displaced ${displaced.value}.`, {held: displaced});
        held = displaced;
        if (target === start) break;
        target = rank(start, held);
      } while (true);
    }
  }

  function pancake({a, compare, swap, emit}) {
    function flip(end) {
      if (!end) return;
      emit('range', [0, end], `Flip the first ${end + 1} positions.`, {low: 0, high: end + 1});
      for (let left = 0, right = end; left < right; left++, right--) swap(left, right);
    }
    for (let end = a.length - 1; end > 0; end--) {
      let best = 0;
      for (let i = 1; i <= end; i++) {
        if (compare(a[i], a[best], [i, best]) > 0) best = i;
      }
      if (best === end) continue;
      flip(best);
      flip(end);
    }
  }

  function tree({a, compare, auxiliary, write}) {
    if (a.length < 2) return;
    let root;
    for (let i = 0; i < a.length; i++) {
      const record = a[i];
      let node = root;
      let parent;
      let branch;
      while (node) {
        const comparison = compare(record, node.items[0], [i, node.items[0].id]);
        if (!comparison) break;
        parent = node;
        branch = comparison < 0 ? 'left' : 'right';
        node = node[branch];
      }
      if (node) {
        node.items.push(record);
        auxiliary(1, [i], `Queue ${record.value} with its equal tree keys.`);
      } else {
        const entry = {items: [record], left: null, right: null};
        if (parent) parent[branch] = entry;
        else root = entry;
        auxiliary(2, [i], `Create a tree node for ${record.value} and attach it.`);
      }
    }
    let position = 0;
    function collect(node) {
      if (!node) return;
      collect(node.left);
      for (const record of node.items) write(position++, record);
      collect(node.right);
    }
    collect(root);
  }

  function offsets(a, direction) {
    let min = BigInt(a[0].value);
    let max = min;
    for (const record of a) {
      const key = BigInt(record.value);
      if (key < min) min = key;
      if (key > max) max = key;
    }
    return {maxOffset: max - min, key: record => direction === 'desc' ? max - BigInt(record.value) : BigInt(record.value) - min};
  }

  function counting({a, auxiliary, write}, direction) {
    if (a.length < 2) return;
    const {maxOffset, key} = offsets(a, direction);
    if (maxOffset >= BigInt(maxCountingSpan)) {
      throw new RangeError(`Counting Sort needs at most ${maxCountingSpan.toLocaleString('en-US')} consecutive integer bins.`);
    }
    const counts = Array(Number(maxOffset) + 1).fill(0);
    auxiliary(counts.length, [], `Initialize ${counts.length} frequency bins.`);
    for (let i = 0; i < a.length; i++) {
      const bin = Number(key(a[i]));
      counts[bin]++;
      auxiliary(1, [i], `Count key ${a[i].value} in bin ${bin}.`, {bucket: bin});
    }
    for (let i = 1; i < counts.length; i++) counts[i] += counts[i - 1];
    if (counts.length > 1) auxiliary(counts.length - 1, [], 'Accumulate the count bins into ranked destinations.');
    const output = Array(a.length);
    for (let i = a.length - 1; i >= 0; i--) {
      const bin = Number(key(a[i]));
      output[--counts[bin]] = a[i];
      auxiliary(2, [i], `Scatter ${a[i].value} stably from right to left.`, {bucket: bin});
    }
    output.forEach((record, i) => write(i, record));
  }

  function radix({a, emit, auxiliary, write}, direction) {
    if (a.length < 2) return;
    const {maxOffset, key} = offsets(a, direction);
    for (let place = 1n, digit = 0; place <= maxOffset; place *= 10n, digit++) {
      const groups = Array.from({length: 10}, () => []);
      emit('range', [0, a.length - 1], `Read decimal digit ${digit + 1} from the right.`, {digit});
      for (let i = 0; i < a.length; i++) {
        const bucket = Number(key(a[i]) / place % 10n);
        groups[bucket].push(a[i]);
        auxiliary(1, [i], `Set ${a[i].value} in digit bin ${bucket}.`, {bucket, digit});
      }
      let index = 0;
      groups.forEach((group, bucket) => {
        for (const record of group) write(index++, record, 'collect', undefined, {bucket, digit});
      });
    }
  }

  function bucket({a, compare, auxiliary, write, emit}, direction, binary = false) {
    if (a.length < 2) return;
    const {maxOffset, key} = offsets(a, direction);
    const count = Math.ceil(Math.sqrt(a.length));
    const groups = Array.from({length: count}, () => []);
    for (let i = 0; i < a.length; i++) {
      const bin = Number(key(a[i]) * BigInt(count) / (maxOffset + 1n));
      groups[bin].push(a[i]);
      auxiliary(1, [i], `Place ${a[i].value} in interval ${bin + 1}.`, {bucket: bin});
    }
    groups.forEach((group, bin) => {
      if (binary) {
        binaryInsertion({a: group, compare, emit, write(i, record) {
          group[i] = record;
          auxiliary(1, [record.id], `Write a record in interval ${bin + 1}.`, {bucket: bin});
        }});
        return;
      }
      for (let i = 1; i < group.length; i++) {
        const held = group[i];
        let j = i;
        while (j > 0 && compare(group[j - 1], held, [group[j - 1].id, held.id]) > 0) {
          group[j] = group[j - 1];
          auxiliary(1, [group[j].id], `Shift a record in interval ${bin + 1}.`, {bucket: bin});
          j--;
        }
        group[j] = held;
        auxiliary(1, [held.id], `Insert ${held.value} in interval ${bin + 1}.`, {bucket: bin});
      }
    });
    let index = 0;
    groups.forEach((group, bin) => {
      for (const record of group) write(index++, record, 'collect', undefined, {bucket: bin});
    });
  }

  const runners = {
    bubble, selection, insertion: recorder => gappedInsertion(recorder, 1),
    'binary-insertion': recorder => binaryInsertion(recorder),
    cocktail, gnome, 'odd-even': oddEven, comb, shell, merge: mergeSort, 'natural-merge': naturalMerge,
    quick, 'quick-three-way': quickThreeWay, heap, cycle, pancake, tree, counting, radix, bucket,
  };

  function countingOrMerge(recorder, direction, binsPerRecord) {
    if (recorder.a.length < 2) return;
    const {maxOffset} = offsets(recorder.a, direction);
    const binLimit = Math.min(maxCountingSpan, binsPerRecord * recorder.a.length);
    if (maxOffset < BigInt(binLimit)) counting(recorder, direction);
    else mergeSort(recorder, direction, (state, low, high) => gappedInsertion(state, 1, low, high), 16);
  }

  const cutoffs = [8, 16, 32, 64];
  const hybridDefinitions = [
    ...cutoffs.map(cutoff => [`merge-insertion-${cutoff}`, `Merge + insertion (${cutoff})`, true,
      (recorder, direction) => mergeSort(recorder, direction,
        (state, low, high) => gappedInsertion(state, 1, low, high), cutoff)]),
    ...cutoffs.map(cutoff => [`merge-binary-insertion-${cutoff}`, `Merge + binary insertion (${cutoff})`, true,
      (recorder, direction) => mergeSort(recorder, direction, binaryInsertion, cutoff)]),
    ...cutoffs.map(cutoff => [`quick-three-way-insertion-${cutoff}`, `3-way quick + insertion (${cutoff})`, false,
      (recorder, direction) => quickThreeWay(recorder, direction, cutoff)]),
    ['bucket-binary-insertion', 'Bucket + binary insertion', true,
      (recorder, direction) => bucket(recorder, direction, true)],
    ...[2, 8].map(limit => [`counting-or-merge-${limit}`, `Counting or merge + insertion (${limit} bins per record)`, true,
      (recorder, direction) => countingOrMerge(recorder, direction, limit)]),
  ];
  const researchAlgorithms = Object.freeze([
    ...algorithms,
    ...hybridDefinitions.map(([id, name, stable]) => Object.freeze({id, name, stable, family: 'Research hybrid'})),
  ]);
  const researchRunners = {...runners, ...Object.fromEntries(hybridDefinitions.map(([id, , , runner]) => [id, runner]))};

  function execute(id, input, direction, trace, limit, methods) {
    if (!Object.prototype.hasOwnProperty.call(methods, id)) throw new RangeError(`Unknown sort: ${id}`);
    const initial = copyInput(input, direction, limit);
    const recorder = makeRecorder(initial, direction, trace);
    recorder.emit('ready', [], 'Ready to sort.');
    methods[id](recorder, direction);
    recorder.emit('done', [], 'All keys are in the requested order.');
    return Object.freeze({
      id, direction, initial, result: Object.freeze(recorder.a.map(record => record.value)),
      resultIds: Object.freeze(recorder.a.map(record => record.id)), metrics: Object.freeze({...recorder.metrics}),
      eventCount: recorder.eventCount, events: Object.freeze(recorder.events), at: recorder.at,
    });
  }

  function run(id, input, direction = 'asc', {trace = true} = {}) {
    return execute(id, input, direction, trace, maxLength, runners);
  }

  function runResearch(id, input, direction = 'asc') {
    return execute(id, input, direction, false, maxResearchLength, researchRunners);
  }

  return Object.freeze({algorithms, byId, run, maxLength, maxCountingSpan, metricDefinitions,
    researchAlgorithms, runResearch, uniformRecords, maxResearchLength});
});

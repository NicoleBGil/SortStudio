# SortStudio sorting trials

Run the uniform-record comparison from the SortStudio repository with Node.js 18.14 or newer.

```sh
node research/sort-trials.cjs --workers 12 --records 1000 --seed 138 --output research/results/uniform-1000
```

Choose a fresh output directory for each run. The command needs no npm packages, API credentials, or GPU.

A separate dense-key trial uses the same 1,000 records per seed but samples uniformly from just 64 key values.

```sh
node research/sort-trials.cjs --workers 12 --records 1000 --seed 138 --key-bits 6 --output research/results/uniform-dense-1000
```

## Colab A100

[The Colab notebook](SortStudio_A100.ipynb) reproduces the first CPU workload from a pinned Git commit, then compares CuPy's stable index sort with a packed integer-key sort on the same 1,000 records. It verifies that the assigned GPU is an A100 and checks both results against NumPy's stable reference before timing. It records device timings and separate end-to-end timings with transfers.

Choose A100 in Colab's runtime settings and run the notebook. The final cell exports the CSV, timing samples, and run metadata as a ZIP.

The [recorded Colab A100 trial](results/colab-a100-uniform-1000/summary.md) includes both GPU timing series and the companion Colab CPU run.

## Inputs and checks

One tuning dataset contains 1,000 records. Mulberry32 generates 12-bit keys in the inclusive range −2048 to 2047. Equal keys can occur, so each row has a separate original ID. Five additional seeds provide separate samples from the same distribution.

The runner calls the original 20 SortStudio implementations and 15 research hybrids through `runResearch()`. The research entry point disables trace collection and supports up to 4,096 records. The interactive visualization still uses its 128-record limit.

Every method runs in ascending and descending order on every seed. Validation checks key order, the complete set of IDs, and key-to-ID association. Methods that declare stability must preserve the original ID order of equal keys. Observed tie order is saved for the other methods as well.

## Hybrids and timing

- Merge sort switches to insertion or binary insertion for subarrays of size 8, 16, 32, or 64.
- Three-way quicksort switches to insertion at the same cutoffs.
- Bucket sort uses binary insertion inside each ordered bucket.
- Two density rules choose counting sort when the key span fits 2 or 8 bins per record and the engine’s bin limit. The dense path reuses its range scan and uses exact numeric offsets. Wider spans use merge sort with an insertion cutoff of 16.

The worker pool uses up to 12 threads for verification. Timed calls run serially in seeded order, after one warm-up for each method and input. Timing includes the full SortStudio call and its operation counters. The runtime’s built-in `Array.sort` is a separate reference with no SortStudio instrumentation.

The minimum tuning median selects the hybrid before timing the five additional seeds. The report gives each seed’s timings and compares the selected hybrid with the fastest original on that seed. The six seeds share a distribution and record count. Results describe this engine and machine and cannot establish performance on other datasets or on an A100.

## Files

- `tuning-input.csv` contains the original `id,key` pairs.
- `trials.json` contains input and source hashes, validation receipts, operation counts, raw timings, and ranked summaries.
- `summary.md` reports the selected hybrid, fastest original method, and built-in reference.

The initial full-range run is archived under `results/uniform-1000` and matches the source at commit `994f44f`. The dense run uses the same seed offsets and a different key distribution. Each trial JSON hashes the exact source file bytes from the execution checkout. Git line-ending conversion can change a source digest across Windows and Colab, while the generated CSV uses LF on both systems.

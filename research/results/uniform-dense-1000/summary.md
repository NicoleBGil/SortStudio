# SortStudio uniform-record trials

Validated **432 cases** using 12 workers. Each input contains 1000 signed integer records in [-32, 31].

All timed tests ran serially on the CPU. The timings include the normal record construction and metrics in the SortStudio engine. JavaScript Array.sort is listed separately as a runtime reference.

The tuning seed selected **Counting or merge + insertion (2 bins per record)**. The table summarizes the held-out seeds without changing the selection.

| Method | Held-out median (ms) | Held-out wins against best original on each seed |
| --- | ---: | ---: |
| Counting Sort | 0.339 | — |
| Counting or merge + insertion (2 bins per record) | 0.252 | 5 / 5 |
| JavaScript Array.sort | 0.156 | 5 / 5 |

These timings describe this implementation, key range, input size, and local CPU. They establish neither general sorting superiority nor A100 performance.

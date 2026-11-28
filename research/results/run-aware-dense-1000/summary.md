# SortStudio uniform-record trials

Validated **444 cases** using 4 workers. Each input contains 1000 signed integer records in [-32, 31].

All timed tests ran serially on the CPU. The timings include the normal record construction and metrics in the SortStudio engine. JavaScript Array.sort is listed separately as a runtime reference.

The tuning seed selected **Run-Aware Counting**. The table summarizes the held-out seeds without changing the selection.

| Method | Held-out median (ms) | Held-out wins against best original on each seed |
| --- | ---: | ---: |
| Counting Sort | 0.709 | — |
| Run-Aware Counting | 0.670 | 2 / 5 |
| JavaScript Array.sort | 0.283 | 5 / 5 |

These timings describe this implementation, key range, input size, and local CPU. They establish neither general sorting superiority nor A100 performance.

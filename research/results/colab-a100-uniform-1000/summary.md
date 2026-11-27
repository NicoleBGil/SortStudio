# SortStudio Colab A100 trial

Run on November 27, 2026, with an NVIDIA A100-SXM4-40GB, CuPy 14.0.1, and source commit `994f44f6b1d9ba95677360bd8976b93d97a24bb0`.

Both GPU methods returned the exact stable ordering produced by NumPy on the same 1,000 uniform signed integer records used for the first local workload. The notebook timed 40 warm samples per method, alternating their order. Host timing includes the upload of keys to the GPU and the download of the sorted indices.

| GPU method | CUDA stream median (ms) | Host median with transfers (ms) |
| --- | ---: | ---: |
| CuPy stable argsort | 0.105 | 0.201 |
| Packed integer key and stable position | 0.325 | 0.420 |

CuPy's stable argsort was faster in both measurements. These results cover one 1,000-record dataset and this Colab runtime. The 20 SortStudio methods and 15 hybrids ran on the Colab host CPU.

The [CPU summary](cpu-summary.md) and [CPU records](trials.json) document 432 passing checks with 12 workers. [GPU samples](gpu-a100.json) contain both timing series and the runtime details. [The input CSV](tuning-input.csv) has SHA-256 `b6f091a334204d9ebbe816e2dfc3e701c949f4cbf1e21eca4bc2592787f8bfaa`.

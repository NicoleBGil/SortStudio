# SortStudio 5.0 — Final Independent Study Submission

## Project overview
SortStudio is a browser-based educational visualization laboratory for studying sorting algorithms through animated traces, controlled experiments, code explanations, and interactive practice. The application is implemented with HTML, CSS, JavaScript, and a bundled copy of D3.js. It can be opened locally; no database or user account is required.

## Research question
How can interactive visualizations and practice activities help learners explain the mechanisms and operation counts of sorting algorithms under different input arrangements?

## Main learning workflow
1. **Observe:** Explore the overview, Battle Arena, heatmap, and step-by-step algorithm behavior.
2. **Experiment:** Change arrays and arrangements in the playground, What-If Studio, and scaling experiments.
3. **Practice:** Use the existing sorting puzzle and prediction challenge.
4. **Assess:** Complete Algorithm Knowledge Quest and Debug the Algorithm; inspect explanations after each response.
5. **Analyze:** Step through the Merge Sort Tree Explorer and compare Bubble, Selection, Insertion, and Merge in Algorithm Tournament.
6. **Reflect:** Review findings, measurement definitions, reproducibility, and limitations in Scientific Notes.

## Methodology and measurement
The implementation uses deterministic sorting logic to count value comparisons and array operations. The tournament compares *comparisons* and *array writes* across the same input. It does **not** measure actual CPU time or memory use. Sorting animations and operation counts should not be interpreted as hardware performance benchmarks. Seeded random inputs support reproducibility.

## New final modules
- **Algorithm Knowledge Quest:** 10 questions across fundamental and advanced topics, with answer explanations and scores.
- **Debug the Algorithm:** four pseudocode debugging exercises with feedback.
- **Merge Sort Tree Explorer:** interactive recursion/divide/merge event navigation, editable numeric input (2–12 values), and comparison/merge counters.
- **Algorithm Tournament:** compares four algorithms using the same sorted, reversed, nearly sorted, or seeded random input, with size controls.

## Verification
- `node verify.cjs`: 630 checks, 0 errors (run on November 22, 2026).
- `node verify-experience.cjs`: 90 checks, 0 errors (run on November 22, 2026).
- `node --check final-modules.js` and `node --check games.js`: syntax checks passed.
- Interactive testing: the project owner reported all new modules working in their browser. This is not a substitute for independent automated end-to-end testing.

## Limitations and future work
The quiz is a formative assessment, not evidence of learning gains without a study. No participant data or pre/post-study results are included. The Merge Sort tree shows array states by recursion depth, not a spatially linked node-and-edge diagram. The tournament compares algorithm operation counts, not elapsed time. Future work could include accessibility audits, a controlled usability study, and additional algorithms.

## Academic integrity and attribution
ChatGPT (OpenAI) assisted with design, implementation, debugging, and documentation. The project includes a bundled D3.js library and its license. Refer to Scientific Notes and `D3-LICENSE.txt` for attribution. Review all claims and test results before submission.

## How to run
Extract the ZIP and open `SortStudio-main/index.html` in a modern browser. For local development, open the folder in VS Code and use Live Server. Keep all JS, CSS, and HTML files in the same folder.

## Suggested final submission
Submit the complete ZIP, this summary, screenshots of the four new modules, and a final written report. The existing `PRESENTATION-NOTES.md` and `notes.html` are useful starting points, but review and update them to cover the new modules before presenting.

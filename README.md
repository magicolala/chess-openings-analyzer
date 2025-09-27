# Chess Openings Analyzer

Chess Openings Analyzer is a TypeScript application for exploring chess openings and annotating games. It parses PGN input, normalizes SAN tokens, and enriches openings with theory data sourced from the Lichess masters database. The project bundles to a lightweight browser application served from `dist/main.js`.

## Features
- **Robust PGN parsing** – Handles noisy SAN notation, figurines, and annotated moves while producing canonical move tokens.
- **Opening aggregation** – Groups similar openings and provides summary statistics derived from processed PGNs.
- **GM theory enrichment** – Queries the Lichess Masters API to highlight theoretical deviations during analysis.
- **Type-safe codebase** – Written in modern TypeScript with Vitest coverage and esbuild bundling.

## Getting Started
1. Install dependencies:
   ```bash
   npm install
   ```
2. Build the bundle:
   ```bash
   npm run build
   ```
3. Open `index.html` in a browser or run the development server:
   ```bash
   npm run dev
   ```
   The `dev` script watches the source files, rebuilds `dist/main.js`, and serves the project locally.

## Available Scripts
| Command | Description |
| --- | --- |
| `npm run build` | Type-checks the codebase and bundles `src/main.ts` to `dist/main.js`. |
| `npm run dev` | Starts a watch build and local static server for interactive development. |
| `npm run test` | Executes the Vitest unit test suite. |

## Project Structure
- `src/` – Application source code including analysis services and UI bindings.
- `tests/` – Vitest unit tests that validate PGN normalization and service integration.
- `index.html` – Entry point that loads the generated bundle.

## Testing
Run the full unit test suite before submitting changes:
```bash
npm test
```

## License
This project is licensed under the ISC License. See the `LICENSE` file if available.

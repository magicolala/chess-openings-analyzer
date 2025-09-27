# Agent Instructions

These guidelines apply to the entire repository.

- Use the existing npm scripts (`npm run build`, `npm run dev`, `npm test`) for building, serving, and testing instead of calling underlying tools directly.
- Keep documentation in `README.md` synchronized with any changes to developer workflows or npm scripts.
- When modifying TypeScript inside `src/`, prefer named exports and maintain existing coding conventions (async/await, modern TypeScript features).
- Always run `npm test` before submitting changes that affect runtime behavior.

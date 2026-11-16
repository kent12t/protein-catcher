# Protein Catcher

## Standalone results explorer

On the `results-visualisation` branch, run `npm install` and `npm run dev`, then
open **http://localhost:5173/results.html**. The game remains at `/`; the explorer
has its own HTML entry and does not load the game or record gameplay.

The page reads CSV files in `offline-results/` at build time and displays only
October 30–31, 2026 (UTC+8), including when opening replacement CSVs. Original
CSV files remain unchanged. Run
`npm run build` and `npm run preview` to view the production page at
**http://localhost:4173/results.html**. Both HTML entries are included in `dist/`.
Rebuild to include changed CSV data, or use **Open CSVs** to replace the loaded
dataset with one or more current local CSVs without rebuilding. Parsing happens
in the browser; selected files are not uploaded or written back to disk.

Filter by UTC+8 date range (inclusive), age group, language, outcome, source file,
and weight range. Summary cards, daily stacked bars, age-group success rates,
and the paginated/sortable records table reflect the same filters. **Export
filtered** downloads matching records, including their source filenames.
Displayed timestamps and daily chart groups use fixed UTC+8, regardless of the
browser timezone. Source CSVs and exported `time_start_iso` timestamps remain UTC.
Blank historical languages appear as **Not recorded**. Invalid rows are skipped
with a visible warning; unusual but valid weights are retained. Each row is a
game, not necessarily a unique player. Opening overlapping CSVs counts their
rows separately; choose only one copy of each dataset.

**Privacy:** the bundled CSV data is readable by anyone who can access the built
page. Keep results deployments private; `noindex` is not access control. The
explorer needs an HTTP server (it is not a double-click `file://` page).

## Offline game tracking

Run `npm install`, then `npm run dev` and open the localhost URL. For a built
version, run `npm run build` followed by `npm run preview`.

When served on `localhost`, `127.0.0.1`, or `[::1]`, each completed game is
automatically appended in the background to a local file:

```text
offline-results/protein-catcher-<device-id>.csv
```

The folder and CSV are created on the first completed game. Later games append
to the same file, including after restarting the server. There are no tracking
controls or downloads to manage. You can open and edit the CSV locally.

A unique device ID is generated once and saved in `.protein-catcher-device.local`.
This identity file is ignored by Git, while the CSVs can be committed. Each local
installation gets its own filename, so results collected from different devices
can coexist in the repository. Keep the identity file to continue using the same
CSV; removing it generates a new ID and file on the next completed game.

The `offline-results/` folder lives at the project root. Both `npm run dev` and
`npm run preview` provide the local file-writing endpoint, with no internet
connection required. A plain static file server does not provide this endpoint.

CSV columns:

- `weight_kg`: weight entered before the game.
- `age_group`: `Below 50` or `50 and above`, matching the game's age selection.
- `score_grams`: total protein caught.
- `target_grams`: protein goal for that game.
- `success`: `true` when the goal was reached, otherwise `false`.
- `time_taken_seconds`: elapsed gameplay time, excluding the countdown and result animation.
- `time_start_iso`: gameplay start time in ISO 8601 UTC.
- `language`: selected game language: `en` (English), `ms` (Malay), `zh` (Chinese), or `ta` (Tamil).

Existing CSVs are upgraded automatically on the next completed game. Older rows
have a blank language because their selected language was not recorded.

Interrupted games are not recorded. Tracking is disabled on hosted domains and
LAN IP addresses, and the endpoint only accepts local requests. File-writing
errors are reported in the browser and server consoles.

## Development template

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.

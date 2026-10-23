# Protein Catcher

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

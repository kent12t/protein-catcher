# Protein Muncher

A touch-friendly game that teaches how much protein a day takes. Players enter their weight, say whether they are below 50 or 50 and over, and move a catcher to collect falling foods toward their daily protein target before fifteen seconds run out. The repo and package are still named `protein-catcher`.

Protein Muncher was one of the games at the **National Celebration of Seniors 2026**, a two-day event in the Toa Payoh Hub atrium run by the Agency for Integrated Care (30–31 October 2026). It recorded 438 plays at the event.

Live: [protein-catcher.vercel.app](https://protein-catcher.vercel.app/) · Case study: [kentlimanza.co/work/aic-ncos-2026](https://kentlimanza.co/work/aic-ncos-2026)

## How it plays

- The target is 0.8 g of protein per kg of body weight (1.2 g/kg for players 50 and over), rounded to whole grams. Reaching it ends the round early.
- Eleven foods fall, each with its own protein value. The round ends with a breakdown of what was caught and a food-reference guide.
- English, Chinese, Malay, and Tamil, with localised artwork and fonts. Sources and food-name choices for the copy are in [src/copy/SOURCES.md](src/copy/SOURCES.md).
- Built for a touch screen in kiosk mode. `EdgeKioskLauncher.bat` and `ProteinCatcher_Autorun.bat` launch it unattended on Windows; edit the paths inside them first.

## Running it

```bash
npm install
npm run dev       # development server
npm run build     # type-check and build
npm run preview   # serve the build
npm test          # tracking and results-explorer tests
npm run lint
```

## Offline game tracking

When served on `localhost`, `127.0.0.1`, or `[::1]`, each completed game is appended in the background to a CSV on disk:

```text
offline-results/protein-catcher-<device-id>.csv
```

The folder and file are created on the first completed game, and later games append to the same file, including after a restart. Both `npm run dev` and `npm run preview` provide the file-writing endpoint. A plain static server does not, and the hosted game does not log anything.

The device ID is generated once and saved in `.protein-catcher-device.local`, which Git ignores. Each installation therefore writes its own file, so logs from several machines can sit side by side. Keep that file to keep writing to the same CSV.

| Column | Meaning |
| --- | --- |
| `weight_kg` | Weight entered before the game |
| `age_group` | `Below 50` or `50 and above` |
| `score_grams` | Protein caught |
| `target_grams` | The goal for that game |
| `success` | `true` if the goal was reached |
| `time_taken_seconds` | Gameplay time, excluding the countdown and result animation |
| `time_start_iso` | Gameplay start, ISO 8601 UTC |
| `language` | `en`, `ms`, `zh`, or `ta` (blank in older rows) |

Interrupted games are not recorded, and each row is one game, not necessarily one person. The endpoint only accepts local requests. Errors show in the browser and server consoles.

**Treat these files as event data.** They hold the weights that players typed in. They have no names, but keep them out of public repositories and public deployments.

## Results explorer

`results.html` is a separate page that reads the CSVs in `offline-results/` and shows them as summary cards, daily bars, success rates by age group, and a sortable table. It does not load the game or record anything.

```bash
npm run dev   # then open http://localhost:5173/results.html
```

- Shows 30–31 October 2026 (UTC+8) only. Dates and daily groups use fixed UTC+8 whatever the browser's timezone. The CSVs and exported `time_start_iso` stay in UTC.
- Filters by date, age group, language, outcome, source file, and weight. **Export filtered** downloads the matching rows with their source filenames.
- **Open CSVs** swaps in other local files without a rebuild. Parsing happens in the browser, and nothing is uploaded or written back. Choose each dataset only once, because overlapping files count twice.
- Invalid rows are skipped with a warning, and older rows with no language show as "Not recorded".
- It needs an HTTP server and won't work from `file://`. Anyone who can load a built copy can read the bundled CSVs, so don't deploy it publicly.

## Stack

React, TypeScript, Vite, pointer input, browser audio, Oxlint.

## Credits

Clarita planned the event and directed the visuals, and Nadiah designed the final UI. Raja and Tammy handled client servicing and the event.

I (Kent, [@kent12t](https://github.com/kent12t)) proposed the game, planned its educational content, drew the wireframes, and built it, largely with AI-assisted coding that I directed. `elnathanhung` committed event data.

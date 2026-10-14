# CodingCat.dev Stream Deck Plugins

Official monorepo for **CodingCat.dev** Elgato Stream Deck plugins, built with Node.js 20, TypeScript, `@elgato/streamdeck` v2, and `sdpi-components` v4.

Each plugin in `plugins/*` packages into its own standalone `.streamDeckPlugin` product for the Elgato Marketplace.

---

## 📂 Plugin Directory

| Plugin Name | Directory | Stream Deck ID (`UUID`) | Category | Controllers | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **[LIFX](./plugins/lifx/README.md)** | [`plugins/lifx`](./plugins/lifx) | `dev.codingcat.lifx` | `LIFX` | Keypad, Encoder (Stream Deck+ Dials) | Control LIFX smart lights, groups, locations, multi-scene On/Off toggles, color/Kelvin state, relative dial adjustments, state cycling, effects, and HEV Clean via the LIFX HTTP Cloud API v1. |

---

## 🚀 Quick Start (Workspace Development)

### Prerequisites
- **Node.js** `>= 20`
- **pnpm** `>= 9`
- **Elgato Stream Deck** `>= 7.1`

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Enable Stream Deck Developer Mode
Required once on your machine so Stream Deck allows local plugin linking and hot-reloading:
```bash
npx streamdeck dev
```

### 3. Build, Typecheck, Validate, and Package All Plugins
```bash
# Typecheck all plugins
pnpm run typecheck

# Build all plugins
pnpm run build

# Validate all .sdPlugin bundles with @elgato/cli
pnpm run validate

# Package all plugins into .streamDeckPlugin installers
pnpm run pack
```

---

## 🛠️ Working on an Individual Plugin

### LIFX (`plugins/lifx`)
Read the full action directory and setup guide in **[`plugins/lifx/README.md`](./plugins/lifx/README.md)**.

```bash
# Link the LIFX plugin into your local Stream Deck app and restart it
pnpm run lifx:link

# Run Rollup in watch mode and automatically restart the plugin on changes
pnpm run lifx:watch

# Package plugins/lifx/dev.codingcat.lifx.streamDeckPlugin for Elgato Maker Console
pnpm run lifx:pack
```

---

## ➕ Adding a New Plugin

1. Create a new folder under `plugins/<name>` with its own `package.json`, `tsconfig.json`, `rollup.config.mjs`, `src/plugin.ts`, and `dev.codingcat.<name>.sdPlugin/`.
2. Add a `README.md` inside `plugins/<name>/README.md` documenting its setup and actions.
3. Add an entry to the **Plugin Directory** table above.

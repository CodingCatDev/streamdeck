# CodingCat.dev Stream Deck Plugin

Official **CodingCat.dev** Elgato Stream Deck plugin (`dev.codingcat.streamdeck`), built with Node.js 20, TypeScript, `@elgato/streamdeck` v2, and `sdpi-components` v4.

All integrations live under `src/plugins/<integration>` and appear under the **CodingCat.dev** category in the Elgato Stream Deck app.

---

## 📂 Integrations Directory

| Integration | Directory | Action Prefix | Controllers | Description |
| :--- | :--- | :--- | :--- | :--- |
| **[LIFX](./src/plugins/lifx/README.md)** | [`src/plugins/lifx`](./src/plugins/lifx) | `dev.codingcat.streamdeck.lifx-*` | Keypad, Encoder (Stream Deck+ Dials) | Control LIFX smart lights, groups, locations, cloud scenes, color/Kelvin state, relative dial adjustments, state cycling, effects, and HEV Clean via the LIFX HTTP Cloud API v1. |

---

## 🚀 Quick Start (Local Development)

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

### 3. Build, Link, and Watch Locally
```bash
# Typecheck TypeScript
pnpm run typecheck

# Build dev.codingcat.streamdeck.sdPlugin/bin/plugin.js
pnpm run build

# Validate the .sdPlugin bundle with @elgato/cli
pnpm run validate

# Link into local Stream Deck app and restart the plugin
pnpm run link

# Watch for changes and automatically restart the plugin
pnpm run watch
```

### 4. Package for Elgato Marketplace
```bash
# Builds and packages dev.codingcat.streamdeck.streamDeckPlugin
pnpm run pack
```

---

## ➕ Adding a New Integration

1. Create a new folder under `src/plugins/<name>` with its client, types, `actions/`, and `README.md`.
2. Register the new actions in [`src/plugin.ts`](./src/plugin.ts) and add their action definitions to [`dev.codingcat.streamdeck.sdPlugin/manifest.json`](./dev.codingcat.streamdeck.sdPlugin/manifest.json).
3. Add a link to `src/plugins/<name>/README.md` in the **Integrations Directory** table above.

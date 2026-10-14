# CodingCat.dev LIFX — Stream Deck Plugin

Control your **LIFX** smart lights, groups, locations, cloud scenes, effects, and HEV Clean bulbs directly from your Elgato Stream Deck keys and Stream Deck+ rotary dials using the **LIFX HTTP Cloud API v1**.

- **Plugin UUID:** `dev.codingcat.streamdeck-lifx`
- **Category:** `CodingCat.dev LIFX`
- **Supported Controllers:** `Keypad` (all Stream Deck models) & `Encoder` (Stream Deck+ rotary dials & touch strip)

---

## 🔑 Getting Your LIFX Personal Access Token

1. Sign in to your LIFX Cloud account at **[https://cloud.lifx.com/access_tokens](https://cloud.lifx.com/access_tokens)**.
2. Click **Generate New Token**, give it a label (e.g., `Stream Deck`), and copy the token.
3. In the Elgato Stream Deck app, drag any **CodingCat.dev LIFX** action onto a key or dial.
4. Paste your token into the **API Token** field in the Property Inspector at the bottom of the Stream Deck window.
   - *Note:* The **API Token** is saved in Stream Deck **Global Settings**, so you only need to paste it once—it is shared automatically across all LIFX actions.
5. Click the **Refresh (↻)** button next to the **Target** (or **Scene**) dropdown to load your lights, groups, locations, and scenes.

---

## 🎛️ Action Directory

| Action Name | UUID | Controllers | Summary |
| :--- | :--- | :--- | :--- |
| **[1. Toggle Power](#1-toggle-power)** | `dev.codingcat.streamdeck-lifx.toggle` | Keypad | Toggle power or explicitly turn lights, groups, or locations On/Off. |
| **[2. Set Light State](#2-set-light-state)** | `dev.codingcat.streamdeck-lifx.set-state` | Keypad | Set power, color (hex picker, Kelvin white temperature, or custom string), brightness, and infrared. |
| **[3. Adjust Light (Delta / Dial)](#3-adjust-light-delta--dial)** | `dev.codingcat.streamdeck-lifx.state-delta` | Keypad, Encoder | Step brightness, Kelvin, hue, saturation, or infrared up/down via button press or Stream Deck+ rotary dial. |
| **[4. Activate Scene](#4-activate-scene)** | `dev.codingcat.streamdeck-lifx.activate-scene` | Keypad | Activate any saved scene from your LIFX Cloud account. |
| **[5. Light Effects](#5-light-effects)** | `dev.codingcat.streamdeck-lifx.effects` | Keypad | Trigger Breathe, Pulse, Move, Morph, Flame, Clouds, Sunrise, Sunset, or stop active effects. |
| **[6. Cycle States](#6-cycle-states)** | `dev.codingcat.streamdeck-lifx.cycle` | Keypad | Cycle a light or group through a list of color/Kelvin presets on each button press. |
| **[7. HEV Clean](#7-hev-clean)** | `dev.codingcat.streamdeck-lifx.clean` | Keypad | Start or stop an antibacterial HEV Clean cycle on compatible LIFX Clean bulbs. |

---

### 1. Toggle Power
**UUID:** `dev.codingcat.streamdeck-lifx.toggle` | **API:** `POST /v1/lights/:selector/toggle` & `PUT /v1/lights/:selector/state`

Toggles power or forces lights On or Off for any target selector (`All Lights`, a `Location`, a `Group`, or an individual `Light`).
- **Target:** Select `All Lights`, a Location, a Group, or a specific Light.
- **Power Action:**
  - `Toggle Power`: Toggles the current power state.
  - `Turn On`: Explicitly turns the target lights on.
  - `Turn Off`: Explicitly turns the target lights off.
- **Duration (s):** Smooth fade transition time in seconds (`0`–`10s`).
- **Visual State:** Automatically syncs the button icon between off and glowing yellow when the button appears or is pressed.

---

### 2. Set Light State
**UUID:** `dev.codingcat.streamdeck-lifx.set-state` | **API:** `PUT /v1/lights/:selector/state`

Applies a complete light state in a single button press.
- **Target:** `All Lights`, Location, Group, or individual Light.
- **Power:** `On`, `Off`, or `Unchanged`.
- **Color Mode:**
  - `Color Picker (Hex)`: Pick any RGB color using the native color picker.
  - `White Temperature (Kelvin)`: Set white color temperature from `1500K` (candlelight) to `9000K` (cool daylight) with `saturation:0`.
  - `Custom LIFX Color String`: Pass any valid LIFX color specifier (e.g., `hue:120 saturation:1.0`, `kelvin:4000`, `blue`).
  - `Keep Current Color`: Leaves color unchanged (useful for brightness-only presets).
- **Brightness (%):** Set brightness from `0%` to `100%` (toggle **Apply Brightness** to include/exclude).
- **Infrared (%):** Set infrared brightness (`0%`–`100%`) for LIFX Night Vision bulbs.
- **Duration (s) & Fast Mode:** Transition time and optional fast fire-and-forget execution.

---

### 3. Adjust Light (Delta / Dial)
**UUID:** `dev.codingcat.streamdeck-lifx.state-delta` | **API:** `POST /v1/lights/:selector/state/delta`

Adjusts a light property by a relative delta (`+/-`). Works on both standard **Keypad** buttons and **Stream Deck+ Rotary Dials (Encoders)**.
- **Property:**
  - `Brightness (%)` (e.g., `+10` or `-10`)
  - `Color Temperature (Kelvin)` (e.g., `+300` or `-300`)
  - `Hue (°)` (e.g., `+15` or `-15`)
  - `Saturation (%)` (e.g., `+10` or `-10`)
  - `Infrared (%)` (e.g., `+10` or `-10`)
- **Step / Delta:**
  - **On Keypad:** Pressing the key applies the signed step (use positive values like `10` for a "Brightness Up" button and negative values like `-10` for a "Brightness Down" button).
  - **On Stream Deck+ Dial:** Rotating clockwise increases by `ticks × |step|`, rotating counter-clockwise decreases by `ticks × |step|`, and **pressing the dial** or **tapping the touch strip** toggles power on the target lights.

---

### 4. Activate Scene
**UUID:** `dev.codingcat.streamdeck-lifx.activate-scene` | **API:** `PUT /v1/scenes/scene_id::uuid/activate`

Activates any scene saved in your LIFX Cloud account.
- **Scene:** Dynamically populated dropdown of all scenes in your LIFX account (with state counts).
- **Duration (s):** Transition duration in seconds (`0`–`15s`).
- **Ignore Options:** Optionally ignore `Power`, `Brightness`, or `Color` from the scene so only the remaining attributes are applied.
- **Fast Mode:** Skip state verification for lower latency.

---

### 5. Light Effects
**UUID:** `dev.codingcat.streamdeck-lifx.effects` | **API:** `POST /v1/lights/:selector/effects/*`

Starts or stops dynamic LIFX effects:
- **`Breathe`:** Smoothly fades between `Primary Color` and `From Color` over `Period (s)` for `Cycles` repetitions.
- **`Pulse`:** Quickly flashes between `Primary Color` and `From Color`.
- **`Move`:** Shifts colors along multizone devices (LIFX Z Strip, LIFX Beam) `Forward` or `Backward`.
- **`Morph`:** Runs a morphing color animation on matrix devices (LIFX Tile, Candle, Ceiling) with an optional comma-separated `Morph Palette`.
- **`Flame`:** Runs a warm flame effect on matrix devices (LIFX Tile, Candle).
- **`Clouds`:** Runs a drifting clouds effect on matrix devices (LIFX Ceiling, Luna).
- **`Sunrise` / `Sunset`:** Runs a sunrise or sunset transition over `Duration (s)`.
- **`Stop Active Effects (Off)`:** Stops any running effect on the target lights (with an option to also power off the lights).

---

### 6. Cycle States
**UUID:** `dev.codingcat.streamdeck-lifx.cycle` | **API:** `POST /v1/lights/:selector/cycle`

Advances the target light(s) to the next state in a list each time you press the key.
- **States to Cycle:** Provide either:
  - A comma- or newline-separated list of LIFX color strings (e.g., `red, green, blue, kelvin:2700, kelvin:6500, off`), or
  - A JSON array of LIFX state objects (e.g., `[{"color": "kelvin:2700", "brightness": 0.3}, {"color": "kelvin:5000", "brightness": 1.0}]`).
- **Direction:** `Forward` or `Backward`.
- **Duration (s):** Transition time between states.

---

### 7. HEV Clean
**UUID:** `dev.codingcat.streamdeck-lifx.clean` | **API:** `POST /v1/lights/:selector/clean`

Controls High-Energy Visible (HEV) antibacterial cleaning cycles on compatible **LIFX Clean** bulbs.
- **Clean Action:** `Start HEV Clean Cycle` or `Stop HEV Clean Cycle`.
- **Duration (s):** Duration in seconds (default `3600` = 1 hour).

---

## 💻 Local Development & Packaging

From `plugins/lifx` (or from the repository root using `pnpm --filter @codingcatdev/streamdeck-lifx`):

```bash
# Typecheck
pnpm run typecheck

# Build production bundle (dev.codingcat.streamdeck-lifx.sdPlugin/bin/plugin.js)
pnpm run build

# Validate plugin manifest and assets
pnpm run validate

# Link to local Stream Deck and restart
pnpm run link

# Watch for changes and auto-restart in Stream Deck
pnpm run watch

# Create distributable .streamDeckPlugin package
pnpm run pack
```

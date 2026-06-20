# AC Card

A Lovelace card for Home Assistant climate entities, designed to match the visual style of the official thermostat card while adding inline HVAC mode switching and fan speed control.

[![GitHub Release][releases-shield]][releases]
[![License][license-shield]](LICENSE.md)
[![hacs_badge](https://img.shields.io/badge/HACS-Custom-orange.svg?style=for-the-badge)](https://github.com/hacs/integration)

---

## Features

- **Arc slider** — uses the official `ha-control-circular-slider` component with mode-specific colors (blue for cool, deep-orange for heat, etc.)
- **Large temperature display** — uses `ha-big-number`, identical to the official thermostat card
- **Current temperature** — shown in the arc's action color, matching official styling
- **+/− buttons** — adjust target temperature in the entity's configured step
- **HVAC mode buttons** — inline off / cool / heat switcher with active highlight
- **Fan speed slider** — shows current fan mode with a spinning fan icon when set to auto
- **Radial glow** — subtle color glow behind the arc that responds to the active mode
- Supports any `climate` entity

---

## Preview

| Cooling | Off |
|---------|-----|
| Arc and labels in blue | Arc dimmed, controls disabled |

---

## Installation

### HACS (recommended)

1. Open HACS in your Home Assistant instance.
2. Go to **Frontend** → **⋮** → **Custom repositories**.
3. Add `https://github.com/g199209/lovelace-ac-card` with category **Dashboard**.
4. Find **AC Card** in the list and click **Download**.
5. Hard-refresh your browser (`Ctrl+Shift+R`).

### Manual

1. Download `lovelace-ac-card.js` from the [latest release][releases].
2. Copy it to `<config>/www/lovelace-ac-card.js`.
3. Add a resource in **Settings → Dashboards → Resources**:

```yaml
resources:
  - url: /local/lovelace-ac-card.js
    type: module
```

---

## Configuration

### Minimal

```yaml
type: custom:lovelace-ac-card
entity: climate.living_room_ac
```

### Full

```yaml
type: custom:lovelace-ac-card
entity: climate.living_room_ac
name: 客厅空调
```

### Options

| Name     | Type   | Required     | Description                              | Default              |
| -------- | ------ | ------------ | ---------------------------------------- | -------------------- |
| `type`   | string | **Required** | `custom:lovelace-ac-card`                |                      |
| `entity` | string | **Required** | A `climate` entity ID                    |                      |
| `name`   | string | **Optional** | Card title override                      | Entity friendly name |

---

## Development

### Prerequisites

| Tool    | Version | Notes               |
| ------- | ------- | ------------------- |
| Node.js | 24+     |                     |
| Yarn    | 4       | Managed via Corepack |

### Setup

```bash
git clone https://github.com/g199209/lovelace-ac-card.git
cd lovelace-ac-card
corepack enable
yarn install
```

### Scripts

| Command       | Description                           |
| ------------- | ------------------------------------- |
| `yarn build`  | Lint + production bundle              |
| `yarn rollup` | Production bundle only (skips lint)   |
| `yarn start`  | Development watcher with hot reload   |
| `yarn lint`   | ESLint across all `src/` files        |

Build output is `dist/lovelace-ac-card.js`.

---

## Troubleshooting

**Card not appearing after install**
Hard-refresh your browser (`Ctrl+Shift+R` / `Cmd+Shift+R`) or clear the cache.

**Fan speed slider not showing**
The entity must expose `fan_modes` in its attributes. Entities that don't support fan control will not show the slider.

**Colors look wrong**
The card uses HA's standard state color CSS variables (`--state-climate-cool-color`, etc.). These are defined by your active theme. With the default theme, cool = blue (`#2196f3`) and heat = deep-orange (`#ff6f22`).

---

[license-shield]: https://img.shields.io/github/license/g199209/lovelace-ac-card.svg?style=for-the-badge
[releases-shield]: https://img.shields.io/github/release/g199209/lovelace-ac-card.svg?style=for-the-badge
[releases]: https://github.com/g199209/lovelace-ac-card/releases

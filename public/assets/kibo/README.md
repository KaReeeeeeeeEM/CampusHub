# Kibo Mascot Assets

Kibo is the official CampusHub mascot: a friendly fictional creature inspired by Kibo Peak on Mount Kilimanjaro.

These assets are intentionally vector-first so Kibo works at favicon, widget, and celebration sizes.

## Brand Colors

- CampusHub Gold: `#F5B642`
- Deep Navy: `#071326`
- White: `#FFFFFF`
- Warm Shadow: `#D87900`

## Structure

- `expressions/` contains static SVG expression states.
- Animation folders contain `kibo.svg` animated SVG fallbacks and reserve `kibo.riv` for future Rive exports.
- `manifest.json` is the canonical registry for supported expressions and animations.

## Rive Handoff

The `.riv` files are binary exports from Rive and should be added at each animation path when produced:

- `/assets/kibo/idle/kibo.riv`
- `/assets/kibo/wave/kibo.riv`
- `/assets/kibo/peek/kibo.riv`
- `/assets/kibo/celebrate/kibo.riv`
- `/assets/kibo/thinking/kibo.riv`
- `/assets/kibo/streak_warning/kibo.riv`
- `/assets/kibo/achievement_unlock/kibo.riv`

Until then, the matching animated SVGs are production-safe fallbacks.

---
project: orchid-control
register: product
aesthetic_direction: technical / utilitarian
color_strategy: restrained
design_system: bespoke React + Tailwind components
design_variance: 4
motion_intensity: 2
visual_density: 7
---

# Orchid Control Design Lock

## Design Read

Quiet workshop control room on deep blue liquid glass. The interface feels calm, tactile, and operational, with no decorative glow.

## Signature

Layered dark-blue glass: translucent panels, hairline borders, soft inner highlights, and sober depth from neutral shadows only. No neon, no aura, no colored glow.

## Color

| role       | OKLCH                     | hex                       | use                                 |
| ---------- | ------------------------- | ------------------------- | ----------------------------------- |
| background | 13% 0.035 255             | #020710                   | app base, page background           |
| surface    | 18% 0.04 255              | #071120                   | panels and navigation               |
| elevated   | 24% 0.045 252             | #0d2036                   | hovered and raised surfaces         |
| text       | 96% 0.012 250             | #f3f7fb                   | primary copy                        |
| muted      | 74% 0.025 250             | #a9b7c7                   | secondary copy                      |
| subtle     | 56% 0.022 250             | #76879b                   | metadata                            |
| border     | 78% 0.025 250 @ 14% alpha | rgba(176, 193, 214, 0.14) | glass edges                         |
| accent     | 78% 0.055 205             | #9fcfd4                   | primary action, focus, active state |
| success    | 74% 0.075 178             | #8fcfbd                   | paid/complete                       |
| warning    | 78% 0.075 78              | #d6bd8b                   | attention, remaining balance        |
| danger     | 70% 0.085 12              | #d98a97                   | destructive/error                   |
| info       | 77% 0.055 240             | #a9bedf                   | informational                       |

Contrast targets: primary text on background is above 14:1; muted text on surface is above 5:1; accent on background is above 8:1; dark text on accent is above 8:1.

## Type

| role    | family                  | use                     | notes                                    |
| ------- | ----------------------- | ----------------------- | ---------------------------------------- |
| display | Manrope + system stack  | page and panel headings | restrained weights, no negative tracking |
| body    | Manrope + system stack  | normal UI text          | compact, readable, Russian-friendly      |
| utility | Manrope tabular numerals | money, dates, IDs      | tabular nums for scanning                |

## Scales

Spacing uses the existing 4px Tailwind rhythm. Radius uses one softened app scale: 8px controls, 12px panels, 16px major glass surfaces, 9999px pills. Motion uses 120-200ms transitions with `ease-out`; no bounce and no decorative looping motion. Focus is always visible.

## Voice

Plain operational Russian. Labels say what the user can do or what state the order is in. No marketing copy, no vague design words in the UI.

Every screen must read as the same product if placed side by side.

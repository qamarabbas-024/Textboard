# ⚡ IMPECCABLE — TextBoard Design & Craft Specification

> **Version**: 3.0.0  
> **Status**: ACTIVE / CANONICAL  
> **Standard**: Impeccable Design Engineering & Visual Intelligence Protocol

---

## 🏛️ 1. Design Philosophy & Brand Archetype

TextBoard is a **high-precision, local-first visual intelligence workstation**. Its visual identity fuses:
1. **Cybernetic Command Deck Precision**: Sharp monospace data telemetry, illuminated signal pins, high-density information architecture.
2. **Luxury 3D Glassmorphism**: Multi-layer frosted acrylic depth (`backdrop-blur-2xl`), ambient luminous edge gradients, and subtle spatial elevation.
3. **Zero-Fatigue Visual Ergonomics**: Carefully balanced contrast ratios, non-glare void backdrops, and harmonic multi-palette color themes.

---

## 🎨 2. The 5 Canonical Visual Theme Engines

```
  ┌──────────────────────────────────────────────────────────────────────────┐
  │                           CANONICAL THEME SUITE                          │
  ├──────────────────────┬──────────────────────┬────────────────────────────┤
  │ Theme Key            │ Identity             │ Dominant Color Accents     │
  ├──────────────────────┼──────────────────────┼────────────────────────────┤
  │ ⚡ cyberpunk (Default)│ Cyber Hyperdrive     │ #00f0ff (Cyan), #a855f7 (Violet) │
  │ 🌆 tokyo             │ Tokyo Syndicate 2077 │ #ff0055 (Magenta), #ffe600 (Gold)│
  │ 🟢 matrix            │ Emerald Quantum      │ #00ff88 (Mint), #a3e635 (Lime)   │
  │ 🌌 nebula            │ Nebula Sunset        │ #ff6b6b (Coral), #ff9f43 (Peach) │
  │ 💎 diamond           │ Executive Diamond    │ #38bdf8 (Sky), #818cf8 (Indigo)  │
  └──────────────────────┴──────────────────────┴────────────────────────────┘
```

### Dynamic Token Variables (`globals.css`)
- `--bg-base`: Primary canvas floor (`#04060c` to `#0f172a`).
- `--bg-surface`: Acrylic card background with `80%` opacity + `20px` backdrop blur.
- `--bg-surface-raised`: Interactive hover elevated panel state.
- `--border-subtle`: Subtle structural edge (`rgba(0, 240, 255, 0.12)`).
- `--border-highlight`: Primary neon focus ring and card hover perimeter.
- `--accent-glow`: Multi-stage radial drop-shadow (`0 0 24px var(--accent)`).

---

## 📐 3. Spacing & Spatial Layout Grid

- **Base Rhythm**: 4px / 8px scale.
- **Card Padding**: `p-5` (20px) on standard widgets, `p-6` (24px) on analytical decks, `p-8` (32px) on hero banners.
- **Border Radius**:
  - Small Controls / Pills: `rounded-full` or `rounded-lg` (8px).
  - Main Cards / Charts: `rounded-2xl` (16px).
  - Hero Decks & Modals: `rounded-3xl` (24px).
- **Elevation Layers**:
  - `Layer 0 (Canvas)`: Particle mesh & 3D perspective grid.
  - `Layer 1 (Cards)`: `glass-card-3d` with `1px solid var(--card-border)`.
  - `Layer 2 (Hover/Focus)`: Hover elevation `-2px` with luminous rim glow.
  - `Layer 3 (Overlays & Modals)`: `z-50` backdrop blur `24px` with high-contrast border.

---

## 📊 4. Data Visualization & Chart Graphics Standards

All data visualizations in TextBoard adhere to the **Zero-Clutter Luminous Visual Standard**:
1. **Spline Interpolation**: Use cubic bezier smoothing rather than jagged straight line segments.
2. **Multi-Stop Gradients**: Fill chart areas with 3-stage vertical gradients (45% top opacity $\rightarrow$ 12% mid $\rightarrow$ 0% floor).
3. **Interactive Crosshairs**: Provide real-time mouse scrub indicators with floating frosted glass tooltips.
4. **Circadian Polar Alignment**: 24-hour clocks must partition late-night hiatus zones (00:00 – 05:00) with dedicated color cues.
5. **Dynamic Physics Bubbles**: Thematic cluster nodes must scale continuously with keyword density and offer hover popouts.

---

## ⚡ 5. Micro-Interactions & Motion Curves

- **Spring Transitions**: `transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1)`.
- **Button Hover States**:
  - `Primary`: Glow intensity boost + `scale-[1.01]`.
  - `Ghost / Secondary`: Subtle border highlight + background tint.
  - `Active Press`: `scale-[0.98]` tactile spring compression.
- **Pulse Indicators**: Ambient heartbeat animations on live data streams (`animate-pulse` / `animate-ping`).
- **Accessibility**: Automatic fallback for users with `prefers-reduced-motion`.

---

## 🔒 6. Invariant Architectural Guardrails

- **Zero Cloud Invariant**: No external telemetry, tracking, or remote fonts at runtime.
- **Constant O(1) Memory**: Streaming parsers and chart renders must never block UI thread.
- **TypeScript Strictness**: 0 compiler errors allowed on any release.
- **Test Integrity**: 100% pass rate across all unit and integration test suites.

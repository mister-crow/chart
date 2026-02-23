# CDF/PDF Charting SDK

JavaScript SDK for drawing CDF and PDF curves on canvas.

## Repository Layout

```text
chart/
  sdk/
    chart.js           # core API and chart engine
    themes.js          # theme registry and theme helpers
    common-distributions.js # common PDF/CDF constructors
    chart.css          # SDK component styles and default CSS variables
  examples/
    example.html       # runnable demo page
    example.css        # demo page layout styles
    example.js         # demo bootstrap
    README.md          # example-specific parameter reference
```

## Quick Start

Open `examples/example.html`, or serve the repo:

```bash
cd ~/dev/git/chart
python3 -m http.server 8000
```

Then open `http://localhost:8000/examples/example.html`.

For example-specific details, see `examples/README.md`.

## SDK Public API

### Globals exported by `sdk/chart.js`

- `window.DistributionDomain`
- `window.ChartFunctions`
- `window.ChartDefaults`
- `window.createDistributionChart(container, options)`

### Globals exported by `sdk/common-distributions.js`

- `window.CommonDistributions`

### `DistributionDomain`

- `FINITE_AB`: support `[a, b]`
- `A_INF`: support `[a, +inf)`
- `NINF_B`: support `(-inf, b]`
- `NINF_INF`: support `(-inf, +inf)`

### `CommonDistributions`

- `normalPdf(mu, sigma) -> (x) => number`
- `normalCdf(mu, sigma) -> (x) => number`
- `uniformPdf(a, b) -> (x) => number`
- `uniformCdf(a, b) -> (x) => number`
- `expPdf(lambda) -> (x) => number`
- `expCdf(lambda) -> (x) => number`

`CommonDistributions` points to the above function set when `common-distributions.js` is loaded.

### `createDistributionChart(container, options)`

Creates and mounts a chart inside `container`.

`container` requirements:

- Must be a DOM element.
- Must contain a `<canvas>`.
- Optional HUD controls are auto-detected by class names:
  - `.chart-hud`
  - `.toggle-grid-numbers`
  - `.toggle-curve-labels`
  - `.action-restore-zoom`

#### `options`

- `curves` (required): `Curve[]`
- `scale` (optional): initial zoom scalar, default `90`
- `palette` (optional): color fallback array for curves missing `color`
- `showGridNumbers` (optional): initial grid-number visibility
- `showCurveLabels` (optional): initial in-plot curve label visibility
- `controls` (optional): control visibility config
  - `showGridNumbersControl` (default `true`)
  - `showCurveListControl` (default `true`)
  - `showCurveLabelsControl` (default `true`)
- `camera` (optional): camera/bounds behavior
  - `activePdfEps` (default `1e-5`)
  - `activeCdfEps` (default `1e-5`)
  - `scanMaxAbsX` (default `1e5`)
  - `xPadFraction` (default `0.2`)
  - `xPadMin` (default `1`)
  - `yPadFraction` (default `0.35`)
  - `yPadMin` (default `0.25`)
  - `minScale` (default `1e-4`)
  - `maxScale` (default `1e7`)
- `theme` (optional): canvas style tokens
  - `canvasBg`
  - `gridLine`
  - `axisLine`
  - `refLine`
  - `tickText`
  - `labelConnector`
  - `labelBox`
  - `hoverBox`
  - `hoverBorder`

#### `Curve` object schema

Each curve in `options.curves` supports:

- `kind`: `'pdf' | 'cdf'`
- `mode`: one of `DistributionDomain.*`
- `a`: number (or `NaN` when not used by mode)
- `b`: number (or `NaN` when not used by mode)
- `fn`: function `(x) => number`
- `label` (optional): display name
- `color` (optional): stroke color
- `visible` (optional): initial visibility, default `true`
- `_curveId` (optional): stable internal id for visibility controls

### Chart instance return value

`createDistributionChart(...)` returns an object with:

- `canvas`: chart canvas element
- `curves`: normalized curve list used internally
- `requestRender()`
- `setControlVisibility(next)`
- `setCurveVisibility(curveIndexOrId, visible) -> boolean`
- `setTheme(nextTheme)`
- `getCameraConfig() -> object`
- `getThemeConfig() -> object`
- `destroy()`

### `ChartDefaults`

`window.ChartDefaults` provides frozen defaults:

- `ChartDefaults.camera`
- `ChartDefaults.controls`
- `ChartDefaults.theme`

## Theme API (`sdk/themes.js`)

Globals exported:

- `window.ChartThemes`
- `window.resolveChartThemeName(name)`
- `window.getChartTheme(name)`
- `window.applyChartUiTheme(target, nameOrTheme)`

Theme shape:

- `theme.canvas`: tokens for chart canvas drawing
- `theme.ui`: CSS custom properties (for UI shell/components)

Built-in theme names:

- `dark`
- `light`
- `blueish`
- `greenish`

Unknown theme names resolve to `dark`.

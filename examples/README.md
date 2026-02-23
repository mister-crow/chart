# Example App Reference

This document covers only the demo application under `examples/`.

## Files

- `example.html`: page structure and script/style imports
- `example.css`: page-level layout styles
- `example.js`: chart bootstrap, presets, and theme switching

## `example.html` Parameters / Hooks

| Element / Attribute | Value(s) | Meaning |
|---|---|---|
| `link[rel=stylesheet]` #1 | `../sdk/chart.css` | SDK component styles + default CSS variables. |
| `link[rel=stylesheet]` #2 | `./example.css` | Example page layout styles. |
| `select#theme-select` option values | `dark`, `light`, `blueish`, `greenish` | Theme names passed into `applyTheme(...)`. |
| `section#chart-window-a` | `id="chart-window-a"` | Container for chart instance A. |
| `section#chart-window-b` | `id="chart-window-b"` | Container for chart instance B. |
| `canvas.chart-canvas` | class only | Required canvas target inside each chart section. |
| `.chart-hud` | class only | Optional HUD read by SDK for controls. |
| `.action-restore-zoom` | button | Resets that chart view to startup framing. |
| `.toggle-grid-numbers` | checkbox | Initial `showGridNumbers` state for that chart. |
| `.toggle-curve-labels` | checkbox | Initial `showCurveLabels` state for that chart. |
| Script order | `themes.js -> common-distributions.js -> chart.js -> example.js` | Ensures globals exist before bootstrap runs. |

## `example.css` Parameters

| Selector | Parameter(s) | Meaning |
|---|---|---|
| `html, body` | `margin: 0; height: 100%` | Full-height demo page. |
| `body` | `display: grid; grid-template-rows: auto 1fr; gap: 12px; padding: 12px` | App shell layout. |
| `body` | `background: var(--app-bg); color: var(--app-fg)` | Uses theme variables from SDK theme system. |
| `.topbar` | flex layout with wrapping | Header arrangement. |
| `.theme-control` | inline-flex + gap | Theme selector row. |
| `.theme-control select` | uses `--input-*` vars | Theme-adaptive select visuals. |
| `.chart-grid` | 2-column grid | Desktop arrangement of two charts. |
| media `(max-width: 980px)` | `.chart-grid` -> 1 column | Mobile/tablet layout. |

## `example.js` Parameters

### Top-level constants

| Name | Value / Source | Meaning |
|---|---|---|
| `D` | `window.DistributionDomain` | Distribution domain enum alias. |
| `F` | `window.CommonDistributions` | Distribution function factory alias. |
| `palette` | `[#7ee787, #ff7b72, #d2a8ff, #ffa657, #79c0ff, #f2cc60, #a5d6ff]` | Default demo color rotation for unlabeled curve colors. |
| `themes` | `window.ChartThemes || {}` | Theme registry from SDK. |
| `fallbackCanvasTheme` | `window.ChartDefaults.theme` | Canvas theme fallback. |

### Helper functions

| Function | Parameters | Meaning |
|---|---|---|
| `resolveThemeName(themeName)` | `themeName: string` | Resolves invalid theme names to `dark`. |
| `getTheme(themeName)` | `themeName: string` | Returns `{ canvas, ui }` theme object. |
| `applyUiTheme(target, theme)` | `target: Element`, `theme: object` | Applies `theme.ui` CSS variables to target element. |
| `withPalette(curves)` | `curves: Curve[]` | Auto-fills missing curve colors. |
| `createMixedDemoCurves()` | none | Window A preset curves (mixed CDF/PDF). |
| `createPdfDemoCurves()` | none | Window B preset curves (PDF-focused). |
| `applyTheme(themeName)` | `themeName: string` | Applies theme to body and both chart instances. |

### Curve schema used in this example

| Field | Type | Used value patterns | Meaning |
|---|---|---|---|
| `kind` | `'pdf' | 'cdf'` | both | Function type. |
| `mode` | support enum | `D.FINITE_AB`, `D.A_INF`, `D.NINF_INF` | Support interval strategy. |
| `a` | number or `NaN` | `-2`, `0`, `NaN` | Left support boundary/anchor. |
| `b` | number or `NaN` | `2`, `NaN` | Right support boundary/anchor. |
| `fn` | `(x)=>number` | from `F.*(...)` | Evaluator function. |
| `label` | string | e.g. `Normal(0,1) PDF` | Legend/label text. |
| `color` | string (optional) | one explicit override `#f97316` | Line color override. |

### Chart creation values used in this example

`example.js` creates two instances via `window.createDistributionChart(container, options)`.

| Option | Window A | Window B | Meaning |
|---|---|---|---|
| `container` | `#chart-window-a` | `#chart-window-b` | Root section element for each chart. |
| `curves` | `createMixedDemoCurves()` | `createPdfDemoCurves()` | Curve preset list. |
| `theme` | `getTheme('dark').canvas` | `getTheme('dark').canvas` | Initial canvas theme. |
| `scale` | `90` | `85` | Initial zoom level. |
| `controls.showGridNumbersControl` | `true` | `false` | Show/hide grid-number control row. |
| `controls.showCurveListControl` | `true` | `true` | Show/hide generated curve checkbox list. |
| `controls.showCurveLabelsControl` | `true` | `true` | Show/hide curve-label control row. |
| `camera.xPadFraction` | default | `0.15` | Horizontal camera padding ratio. |
| `camera.yPadFraction` | default | `0.25` | Vertical camera padding ratio. |

### Debug globals exposed by example

| Global | Meaning |
|---|---|
| `window.chartA` | Chart instance A handle. |
| `window.chartB` | Chart instance B handle. |
| `window.chartThemes` | Loaded theme registry reference. |
| `window.applyChartTheme` | Callable theme switch helper. |

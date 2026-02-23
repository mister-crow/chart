(function initCharts() {
  const D = window.DistributionDomain;
  const F = window.CommonDistributions;
  const palette = ["#7ee787", "#ff7b72", "#d2a8ff", "#ffa657", "#79c0ff", "#f2cc60", "#a5d6ff"];
  const themes = window.ChartThemes || {};
  const fallbackCanvasTheme = (window.ChartDefaults && window.ChartDefaults.theme) || {};

  function resolveThemeName(themeName) {
    if (typeof window.resolveChartThemeName === "function") {
      return window.resolveChartThemeName(themeName);
    }
    return Object.prototype.hasOwnProperty.call(themes, themeName) ? themeName : "dark";
  }

  function getTheme(themeName) {
    if (typeof window.getChartTheme === "function") {
      return window.getChartTheme(themeName);
    }
    const resolved = resolveThemeName(themeName);
    return themes[resolved] || { canvas: fallbackCanvasTheme, ui: {} };
  }

  function applyUiTheme(target, theme) {
    if (typeof window.applyChartUiTheme === "function") {
      window.applyChartUiTheme(target, theme);
      return;
    }
    if (!target || !target.style || !theme || !theme.ui) return;
    for (const [key, value] of Object.entries(theme.ui)) {
      target.style.setProperty(key, value);
    }
  }

  function withPalette(curves) {
    return curves.map((curve, index) => ({ ...curve, color: curve.color || palette[index % palette.length] }));
  }

  function erfApprox(x) {
    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x);
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;
    const t = 1 / (1 + p * x);
    const y = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    return sign * y;
  }

  function createCustomCdfCurve() {
    return {
      kind: "cdf",
      mode: D.NINF_INF,
      a: NaN,
      b: NaN,
      fn: (x) => 0.5 * (1 + erfApprox(x)),
      label: "Custom CDF"
    };
  }

  function createCustomPdfCurve() {
    return {
      kind: "pdf",
      mode: D.NINF_INF,
      a: NaN,
      b: NaN,
      fn: (x) => Math.exp(-x * x) / Math.sqrt(Math.PI),
      label: "Custom PDF"
    };
  }

  function createMixedDemoCurves() {
    return withPalette([
      { kind: "cdf", mode: D.FINITE_AB, a: -2, b: 2, fn: F.uniformCdf(-2, 2), label: "Uniform CDF [-2,2]" },
      { kind: "cdf", mode: D.A_INF, a: 0, b: NaN, fn: F.expCdf(1.2), label: "Exp(lambda=1.2) CDF [0,+inf)" },
      { kind: "cdf", mode: D.NINF_INF, a: NaN, b: NaN, fn: F.normalCdf(0, 1), label: "Normal(0,1) CDF" },
      createCustomCdfCurve()
    ]);
  }

  function createPdfDemoCurves() {
    return withPalette([
      { kind: "pdf", mode: D.FINITE_AB, a: -2, b: 2, fn: F.uniformPdf(-2, 2), label: "Uniform PDF [-2,2]" },
      { kind: "pdf", mode: D.A_INF, a: 0, b: NaN, fn: F.expPdf(1.2), label: "Exp(lambda=1.2) PDF [0,+inf)" },
      { kind: "pdf", mode: D.NINF_INF, a: NaN, b: NaN, fn: F.normalPdf(0, 1), label: "Normal(0,1) PDF" },
      createCustomPdfCurve(),
      { kind: "pdf", mode: D.A_INF, a: 0, b: NaN, fn: F.expPdf(2.2), label: "Exp(lambda=2.2) PDF [0,+inf)", color: "#f97316" }
    ]);
  }

  const chartAEl = document.getElementById("chart-window-a");
  const chartBEl = document.getElementById("chart-window-b");
  const themeSelect = document.getElementById("theme-select");

  if (!chartAEl || !chartBEl || !window.createDistributionChart || !D || !F) return;

  // Window A: default mixed set.
  const chartA = window.createDistributionChart(chartAEl, {
    curves: createMixedDemoCurves(),
    theme: getTheme("dark").canvas,
    scale: 90,
    controls: {
      showGridNumbersControl: true,
      showCurveListControl: true,
      showCurveLabelsControl: true
    }
  });

  // Window B: independent graph with PDF (density) curves.
  const chartB = window.createDistributionChart(chartBEl, {
    curves: createPdfDemoCurves(),
    theme: getTheme("dark").canvas,
    scale: 85,
    controls: {
      showGridNumbersControl: false,
      showCurveListControl: true,
      showCurveLabelsControl: true
    },
    camera: {
      xPadFraction: 0.15,
      yPadFraction: 0.25
    }
  });

  function applyTheme(themeName) {
    const resolvedTheme = resolveThemeName(themeName);
    const theme = getTheme(resolvedTheme);
    document.body.dataset.theme = resolvedTheme;
    if (themeSelect && themeSelect.value !== resolvedTheme) {
      themeSelect.value = resolvedTheme;
    }
    applyUiTheme(document.body, theme);
    chartA.setTheme(theme.canvas || fallbackCanvasTheme);
    chartB.setTheme(theme.canvas || fallbackCanvasTheme);
  }

  if (themeSelect) {
    themeSelect.addEventListener("change", () => {
      applyTheme(themeSelect.value);
    });
  }

  applyTheme(themeSelect ? themeSelect.value : "dark");

  // Optional: debug handles in browser console.
  window.chartA = chartA;
  window.chartB = chartB;
  window.chartThemes = themes;
  window.applyChartTheme = applyTheme;
})();

(function initCharts() {
  const S = window.ChartSupportMode;
  const F = window.ChartFunctions;
  const palette = ["#7ee787", "#ff7b72", "#d2a8ff", "#ffa657", "#79c0ff", "#f2cc60", "#a5d6ff"];
  const themes = {
    dark: {
      canvas: {
        canvasBg: "#101620",
        gridLine: "rgba(255,255,255,0.07)",
        axisLine: "rgba(255,255,255,0.35)",
        refLine: "rgba(255,255,255,0.12)",
        tickText: "rgba(255,255,255,0.76)",
        labelConnector: "rgba(255,255,255,0.28)",
        labelBox: "rgba(0,0,0,0.55)",
        hoverBox: "rgba(0,0,0,0.78)",
        hoverBorder: "rgba(255,255,255,0.26)"
      }
    },
    light: {
      canvas: {
        canvasBg: "#ffffff",
        gridLine: "rgba(15,28,55,0.12)",
        axisLine: "rgba(15,28,55,0.46)",
        refLine: "rgba(15,28,55,0.2)",
        tickText: "rgba(15,28,55,0.82)",
        labelConnector: "rgba(15,28,55,0.34)",
        labelBox: "rgba(255,255,255,0.88)",
        hoverBox: "rgba(255,255,255,0.92)",
        hoverBorder: "rgba(15,28,55,0.36)"
      }
    },
    blueish: {
      canvas: {
        canvasBg: "#112840",
        gridLine: "rgba(184,220,255,0.12)",
        axisLine: "rgba(196,228,255,0.42)",
        refLine: "rgba(184,220,255,0.24)",
        tickText: "rgba(221,242,255,0.86)",
        labelConnector: "rgba(188,224,255,0.38)",
        labelBox: "rgba(8,28,50,0.58)",
        hoverBox: "rgba(7,25,44,0.8)",
        hoverBorder: "rgba(184,220,255,0.35)"
      }
    },
    greenish: {
      canvas: {
        canvasBg: "#123026",
        gridLine: "rgba(170,230,192,0.12)",
        axisLine: "rgba(180,236,201,0.42)",
        refLine: "rgba(170,230,192,0.24)",
        tickText: "rgba(214,245,225,0.86)",
        labelConnector: "rgba(177,234,198,0.38)",
        labelBox: "rgba(9,33,22,0.58)",
        hoverBox: "rgba(9,30,20,0.8)",
        hoverBorder: "rgba(177,234,198,0.35)"
      }
    }
  };

  function withPalette(curves) {
    return curves.map((curve, index) => ({ ...curve, color: curve.color || palette[index % palette.length] }));
  }

  function createMixedDemoCurves() {
    return withPalette([
      { kind: "cdf", mode: S.FINITE_AB, a: -2, b: 2, fn: F.uniformCdf(-2, 2), label: "Uniform CDF [-2,2]" },
      { kind: "pdf", mode: S.FINITE_AB, a: -2, b: 2, fn: F.uniformPdf(-2, 2), label: "Uniform PDF [-2,2]" },
      { kind: "cdf", mode: S.A_INF, a: 0, b: NaN, fn: F.expCdf(1.2), label: "Exp(lambda=1.2) CDF [0,+inf)" },
      { kind: "pdf", mode: S.A_INF, a: 0, b: NaN, fn: F.expPdf(1.2), label: "Exp(lambda=1.2) PDF [0,+inf)" },
      { kind: "cdf", mode: S.NINF_INF, a: NaN, b: NaN, fn: F.normalCdf(0, 1), label: "Normal(0,1) CDF" },
      { kind: "pdf", mode: S.NINF_INF, a: NaN, b: NaN, fn: F.normalPdf(0, 1), label: "Normal(0,1) PDF" }
    ]);
  }

  function createPdfDemoCurves() {
    return withPalette([
      { kind: "pdf", mode: S.FINITE_AB, a: -2, b: 2, fn: F.uniformPdf(-2, 2), label: "Uniform PDF [-2,2]" },
      { kind: "pdf", mode: S.A_INF, a: 0, b: NaN, fn: F.expPdf(1.2), label: "Exp(lambda=1.2) PDF [0,+inf)" },
      { kind: "pdf", mode: S.NINF_INF, a: NaN, b: NaN, fn: F.normalPdf(0, 1), label: "Normal(0,1) PDF" },
      { kind: "pdf", mode: S.A_INF, a: 0, b: NaN, fn: F.expPdf(2.2), label: "Exp(lambda=2.2) PDF [0,+inf)", color: "#f97316" }
    ]);
  }

  const chartAEl = document.getElementById("chart-window-a");
  const chartBEl = document.getElementById("chart-window-b");
  const themeSelect = document.getElementById("theme-select");

  if (!chartAEl || !chartBEl || !window.createDistributionChart || !S || !F) return;

  // Window A: default mixed set.
  const chartA = window.createDistributionChart(chartAEl, {
    curves: createMixedDemoCurves(),
    theme: themes.dark.canvas,
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
    theme: themes.dark.canvas,
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
    const resolvedTheme = themes[themeName] ? themeName : "dark";
    document.body.dataset.theme = resolvedTheme;
    if (themeSelect && themeSelect.value !== resolvedTheme) {
      themeSelect.value = resolvedTheme;
    }
    chartA.setTheme(themes[resolvedTheme].canvas);
    chartB.setTheme(themes[resolvedTheme].canvas);
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

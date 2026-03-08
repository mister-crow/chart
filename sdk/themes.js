(() => {
  const themes = Object.freeze({
    dark: Object.freeze({
      canvas: Object.freeze({
        canvasBg: "#101620",
        gridLine: "rgba(255,255,255,0.07)",
        axisLine: "rgba(255,255,255,0.35)",
        refLine: "rgba(255,255,255,0.12)",
        tickText: "rgba(255,255,255,0.76)",
        labelConnector: "rgba(255,255,255,0.28)",
        labelBox: "rgba(0,0,0,0.55)",
        hoverBox: "rgba(0,0,0,0.78)",
        hoverBorder: "rgba(255,255,255,0.26)"
      }),
      ui: Object.freeze({
        "--app-bg": "#0b0f14",
        "--app-fg": "rgba(255,255,255,0.86)",
        "--muted-fg": "rgba(255,255,255,0.7)",
        "--panel-bg": "#101620",
        "--panel-border": "rgba(255,255,255,0.13)",
        "--hud-bg": "rgba(0,0,0,0.38)",
        "--hud-fg": "rgba(255,255,255,0.82)",
        "--divider": "rgba(255,255,255,0.14)",
        "--input-bg": "rgba(255,255,255,0.08)",
        "--input-fg": "rgba(255,255,255,0.92)",
        "--input-border": "rgba(255,255,255,0.28)"
      })
    }),
    light: Object.freeze({
      canvas: Object.freeze({
        canvasBg: "#ffffff",
        gridLine: "rgba(15,28,55,0.12)",
        axisLine: "rgba(15,28,55,0.46)",
        refLine: "rgba(15,28,55,0.2)",
        tickText: "rgba(15,28,55,0.82)",
        labelConnector: "rgba(15,28,55,0.34)",
        labelBox: "rgba(255,255,255,0.88)",
        hoverBox: "rgba(255,255,255,0.92)",
        hoverBorder: "rgba(15,28,55,0.36)"
      }),
      ui: Object.freeze({
        "--app-bg": "#f3f7ff",
        "--app-fg": "rgba(16,21,33,0.92)",
        "--muted-fg": "rgba(16,21,33,0.62)",
        "--panel-bg": "#ffffff",
        "--panel-border": "rgba(26,42,73,0.2)",
        "--hud-bg": "rgba(255,255,255,0.9)",
        "--hud-fg": "rgba(15,28,55,0.9)",
        "--divider": "rgba(26,42,73,0.18)",
        "--input-bg": "#ffffff",
        "--input-fg": "rgba(15,28,55,0.95)",
        "--input-border": "rgba(26,42,73,0.35)"
      })
    }),
    blueish: Object.freeze({
      canvas: Object.freeze({
        canvasBg: "#112840",
        gridLine: "rgba(184,220,255,0.12)",
        axisLine: "rgba(196,228,255,0.42)",
        refLine: "rgba(184,220,255,0.24)",
        tickText: "rgba(221,242,255,0.86)",
        labelConnector: "rgba(188,224,255,0.38)",
        labelBox: "rgba(8,28,50,0.58)",
        hoverBox: "rgba(7,25,44,0.8)",
        hoverBorder: "rgba(184,220,255,0.35)"
      }),
      ui: Object.freeze({
        "--app-bg": "#0a1a2b",
        "--app-fg": "rgba(231,244,255,0.9)",
        "--muted-fg": "rgba(192,222,248,0.74)",
        "--panel-bg": "#112840",
        "--panel-border": "rgba(132,194,245,0.28)",
        "--hud-bg": "rgba(8,29,50,0.62)",
        "--hud-fg": "rgba(226,242,255,0.9)",
        "--divider": "rgba(136,200,255,0.25)",
        "--input-bg": "rgba(132,194,245,0.12)",
        "--input-fg": "rgba(230,243,255,0.95)",
        "--input-border": "rgba(151,208,255,0.45)"
      })
    }),
    greenish: Object.freeze({
      canvas: Object.freeze({
        canvasBg: "#123026",
        gridLine: "rgba(170,230,192,0.12)",
        axisLine: "rgba(180,236,201,0.42)",
        refLine: "rgba(170,230,192,0.24)",
        tickText: "rgba(214,245,225,0.86)",
        labelConnector: "rgba(177,234,198,0.38)",
        labelBox: "rgba(9,33,22,0.58)",
        hoverBox: "rgba(9,30,20,0.8)",
        hoverBorder: "rgba(177,234,198,0.35)"
      }),
      ui: Object.freeze({
        "--app-bg": "#0c1f16",
        "--app-fg": "rgba(228,248,239,0.9)",
        "--muted-fg": "rgba(185,226,203,0.72)",
        "--panel-bg": "#123026",
        "--panel-border": "rgba(132,228,173,0.27)",
        "--hud-bg": "rgba(8,36,22,0.6)",
        "--hud-fg": "rgba(223,246,234,0.9)",
        "--divider": "rgba(147,234,184,0.25)",
        "--input-bg": "rgba(132,228,173,0.12)",
        "--input-fg": "rgba(226,246,236,0.94)",
        "--input-border": "rgba(150,235,190,0.44)"
      })
    })
  });

  function resolveChartThemeName(name) {
    return Object.prototype.hasOwnProperty.call(themes, name) ? name : "dark";
  }

  function getChartTheme(name) {
    return themes[resolveChartThemeName(name)];
  }

  function applyChartUiTheme(target, nameOrTheme) {
    const theme = typeof nameOrTheme === "string"
      ? getChartTheme(nameOrTheme)
      : (nameOrTheme || getChartTheme("dark"));
    if (!target || !target.style || !theme.ui) return theme;

    for (const [key, value] of Object.entries(theme.ui)) {
      target.style.setProperty(key, value);
    }
    return theme;
  }

  window.ChartThemes = themes;
  window.resolveChartThemeName = resolveChartThemeName;
  window.getChartTheme = getChartTheme;
  window.applyChartUiTheme = applyChartUiTheme;
})();

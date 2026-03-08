(() => {
  const SupportMode = Object.freeze({
    FINITE_AB: 1,   // [a,b]
    A_INF: 2,       // [a, +inf)
    NINF_B: 3,      // (-inf, b]
    NINF_INF: 4     // (-inf, +inf)
  });

  const DEFAULT_PALETTE = ["#7ee787", "#ff7b72", "#d2a8ff", "#ffa657", "#79c0ff", "#f2cc60", "#a5d6ff"];
  const DEFAULT_CAMERA_OPTIONS = Object.freeze({
    activePdfEps: 1e-5,
    activeCdfEps: 1e-5,
    scanMaxAbsX: 1e5,
    xPadFraction: 0.2,
    xPadMin: 1,
    yPadFraction: 0.35,
    yPadMin: 0.25,
    minScale: 1e-4,
    maxScale: 1e7
  });
  const DEFAULT_CONTROL_OPTIONS = Object.freeze({
    showGridNumbersControl: true,
    showCurveListControl: true,
    showCurveLabelsControl: true
  });
  const DEFAULT_VISUAL_THEME = Object.freeze({
    canvasBg: "#101620",
    gridLine: "rgba(255,255,255,0.07)",
    axisLine: "rgba(255,255,255,0.35)",
    refLine: "rgba(255,255,255,0.12)",
    tickText: "rgba(255,255,255,0.76)",
    labelConnector: "rgba(255,255,255,0.28)",
    labelBox: "rgba(0,0,0,0.55)",
    hoverBox: "rgba(0,0,0,0.78)",
    hoverBorder: "rgba(255,255,255,0.26)"
  });

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function inSupport(x, mode, a, b) {
    switch (mode) {
      case SupportMode.FINITE_AB: return x >= a && x <= b;
      case SupportMode.A_INF: return x >= a;
      case SupportMode.NINF_B: return x <= b;
      case SupportMode.NINF_INF: return true;
      default: return true;
    }
  }

  function evalExtended(kind, x, mode, a, b, fn) {
    if (inSupport(x, mode, a, b)) return fn(x);
    if (kind === "pdf") return 0;

    switch (mode) {
      case SupportMode.FINITE_AB:
        if (x < a) return 0;
        if (x > b) return 1;
        return fn(x);
      case SupportMode.A_INF:
        if (x < a) return 0;
        return fn(x);
      case SupportMode.NINF_B:
        if (x > b) return 1;
        return fn(x);
      case SupportMode.NINF_INF:
        return fn(x);
      default:
        return fn(x);
    }
  }

  function applyPalette(curves, palette) {
    let paletteIndex = 0;
    return curves.map((curve) => {
      const next = { ...curve };
      if (!next.color) {
        next.color = palette[paletteIndex % palette.length];
        paletteIndex += 1;
      }
      return next;
    });
  }

  // options.controls: { showGridNumbersControl, showCurveListControl, showCurveLabelsControl }
  // options.showGridNumbers / options.showCurveLabels set initial checkbox states
  // options.camera: { activePdfEps, activeCdfEps, scanMaxAbsX, xPadFraction, xPadMin, yPadFraction, yPadMin, minScale, maxScale }
  // options.theme: { canvasBg, gridLine, axisLine, refLine, tickText, labelConnector, labelBox, hoverBox, hoverBorder }
  function createDistributionChart(container, options = {}) {
    if (!container) throw new Error("createDistributionChart: container is required");

    const canvas = container.querySelector("canvas");
    if (!canvas) throw new Error("createDistributionChart: container must include a canvas");

    const ctx = canvas.getContext("2d", { alpha: false });
    const hud = container.querySelector(".chart-hud");
    const toggleNumbers = container.querySelector(".toggle-grid-numbers");
    const toggleNumbersRow = toggleNumbers ? toggleNumbers.closest("label") : null;
    const toggleCurveLabels = container.querySelector(".toggle-curve-labels");
    const toggleCurveLabelsRow = toggleCurveLabels ? toggleCurveLabels.closest("label") : null;
    const actionRestoreZoom = container.querySelector(".action-restore-zoom");

    const controlOptions = {
      ...DEFAULT_CONTROL_OPTIONS,
      ...(options.controls || {})
    };
    if (typeof options.showGridNumbersControl === "boolean") {
      controlOptions.showGridNumbersControl = options.showGridNumbersControl;
    }
    if (typeof options.showCurveListControl === "boolean") {
      controlOptions.showCurveListControl = options.showCurveListControl;
    }
    if (typeof options.showCurveLabelsControl === "boolean") {
      controlOptions.showCurveLabelsControl = options.showCurveLabelsControl;
    }

    const cameraOptions = {
      ...DEFAULT_CAMERA_OPTIONS,
      ...(options.camera || {})
    };
    let visualTheme = {
      ...DEFAULT_VISUAL_THEME,
      ...(options.theme || {})
    };

    let showGridNumbers = typeof options.showGridNumbers === "boolean"
      ? options.showGridNumbers
      : (toggleNumbers ? toggleNumbers.checked : true);
    let showCurveLabels = typeof options.showCurveLabels === "boolean"
      ? options.showCurveLabels
      : (toggleCurveLabels ? toggleCurveLabels.checked : true);
    if (toggleNumbers) toggleNumbers.checked = showGridNumbers;
    if (toggleCurveLabels) toggleCurveLabels.checked = showCurveLabels;
    if (toggleNumbersRow) toggleNumbersRow.style.display = controlOptions.showGridNumbersControl ? "" : "none";
    if (toggleCurveLabelsRow) toggleCurveLabelsRow.style.display = controlOptions.showCurveLabelsControl ? "" : "none";
    let hoverInfo = null;
    let scale = Number.isFinite(options.scale) ? options.scale : 90;
    let offsetX = 0;
    let offsetY = 0;
    let hasPlacedCamera = false;
    let rafPending = false;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let cameraBounds = null;
    let curveControlList = null;
    let curveToggleInputs = [];

    const palette = Array.isArray(options.palette) && options.palette.length > 0
      ? options.palette
      : DEFAULT_PALETTE;

    if (!Array.isArray(options.curves) || options.curves.length === 0) {
      throw new Error("createDistributionChart: options.curves is required and must be a non-empty array");
    }

    const curves = applyPalette(
      options.curves.slice(),
      palette
    ).map((curve, index) => ({
      ...curve,
      visible: curve.visible !== false,
      _curveId: curve._curveId || `curve-${index + 1}`
    }));

    function getVisibleCurves() {
      return curves.filter((curve) => curve.visible);
    }

    function getCurvesForBounds() {
      const visible = getVisibleCurves();
      return visible.length > 0 ? visible : curves;
    }

    function curveDisplayName(curve, index) {
      return curve.label || `${curve.kind.toUpperCase()} ${index + 1}`;
    }

    function rebuildCurveControlList() {
      for (const input of curveToggleInputs) {
        input.removeEventListener("change", onCurveToggleChange);
      }
      curveToggleInputs = [];

      if (curveControlList) {
        curveControlList.remove();
        curveControlList = null;
      }

      if (!hud || !controlOptions.showCurveListControl) return;

      const wrapper = document.createElement("div");
      wrapper.className = "curve-toggle-list";

      const title = document.createElement("div");
      title.className = "curve-toggle-title";
      title.textContent = "Functions";
      wrapper.appendChild(title);

      curves.forEach((curve, index) => {
        const row = document.createElement("label");
        row.className = "curve-toggle-row";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = curve.visible;
        checkbox.dataset.curveId = curve._curveId;
        checkbox.addEventListener("change", onCurveToggleChange);

        const text = document.createElement("span");
        text.textContent = curveDisplayName(curve, index);
        text.style.color = curve.color;

        row.appendChild(checkbox);
        row.appendChild(text);
        wrapper.appendChild(row);
        curveToggleInputs.push(checkbox);
      });

      curveControlList = wrapper;
      hud.appendChild(curveControlList);
    }

    function placeInitialCamera() {
      if (hasPlacedCamera) return;
      offsetX = canvas.clientWidth * 0.5;
      offsetY = canvas.clientHeight * 0.65;
      hasPlacedCamera = true;
    }

    function worldToScreen(x, y) {
      return { x: offsetX + x * scale, y: offsetY - y * scale };
    }

    function screenToWorld(px, py) {
      return { x: (px - offsetX) / scale, y: (offsetY - py) / scale };
    }

    function visibleWorldXRange() {
      const w = canvas.clientWidth;
      return {
        left: screenToWorld(0, 0).x,
        right: screenToWorld(w, 0).x
      };
    }

    function visibleWorldYRange() {
      const h = canvas.clientHeight;
      return {
        bottom: screenToWorld(0, h).y,
        top: screenToWorld(0, 0).y
      };
    }

    function chooseGridStep() {
      const targetPx = 80;
      const raw = targetPx / scale;
      if (!Number.isFinite(raw) || raw <= 0) return 1;
      const pow10 = Math.pow(10, Math.floor(Math.log10(raw)));
      const candidates = [1, 2, 5, 10].map((value) => value * pow10);
      return candidates.reduce((best, value) => {
        return Math.abs(value - raw) < Math.abs(best - raw) ? value : best;
      }, candidates[0]);
    }

    function formatNumber(value, decimals = 3) {
      if (!Number.isFinite(value)) return "NaN";
      const abs = Math.abs(value);
      if (abs > 0 && (abs >= 1e5 || abs < 1e-4)) return value.toExponential(2);
      return value.toFixed(decimals).replace(/\.?0+$/, "");
    }

    function formatTick(value, step) {
      const absStep = Math.abs(step);
      const decimals = absStep >= 1 ? 0 : Math.min(6, Math.ceil(-Math.log10(absStep)));
      const normalized = Math.abs(value) < 1e-12 ? 0 : value;
      return formatNumber(normalized, decimals);
    }

    function isCurveActiveAtX(curve, x) {
      const y = evalExtended(curve.kind, x, curve.mode, curve.a, curve.b, curve.fn);
      if (!Number.isFinite(y)) return false;
      if (curve.kind === "pdf") return y > cameraOptions.activePdfEps;
      return y > cameraOptions.activeCdfEps && y < (1 - cameraOptions.activeCdfEps);
    }

    function estimateCenterX(curvesList) {
      const anchors = [0];
      for (const curve of curvesList) {
        if (Number.isFinite(curve.a)) anchors.push(curve.a);
        if (Number.isFinite(curve.b)) anchors.push(curve.b);
      }
      anchors.sort((a, b) => a - b);
      return anchors[Math.floor(anchors.length * 0.5)];
    }

    function findActiveBoundary(curvesList, centerX, direction) {
      let x = centerX;
      let step = 0.5;
      let lastActive = curvesList.some((curve) => isCurveActiveAtX(curve, x)) ? x : null;

      for (let i = 0; i < 72; i += 1) {
        x += direction * step;
        const isActive = curvesList.some((curve) => isCurveActiveAtX(curve, x));
        if (isActive) {
          lastActive = x;
        } else if (lastActive !== null) {
          const probe1 = x + direction * step;
          const probe2 = x + direction * step * 2;
          const stillInactive = !curvesList.some((curve) => isCurveActiveAtX(curve, probe1))
            && !curvesList.some((curve) => isCurveActiveAtX(curve, probe2));
          if (stillInactive) return x;
        }

        step *= 1.45;
        if (Math.abs(x) > cameraOptions.scanMaxAbsX) break;
      }

      if (lastActive !== null) return lastActive + direction * Math.max(1, step * 0.5);
      return centerX + direction * 10;
    }

    function computeCameraBounds(curvesList) {
      const centerX = estimateCenterX(curvesList);
      let left = findActiveBoundary(curvesList, centerX, -1);
      let right = findActiveBoundary(curvesList, centerX, 1);

      if (!Number.isFinite(left) || !Number.isFinite(right) || left === right) {
        left = centerX - 10;
        right = centerX + 10;
      }
      if (left > right) [left, right] = [right, left];

      const xSpanRaw = Math.max(1e-6, right - left);
      const xPad = Math.max(cameraOptions.xPadMin, xSpanRaw * cameraOptions.xPadFraction);
      const xMin = left - xPad;
      const xMax = right + xPad;

      let yMin = Infinity;
      let yMax = -Infinity;
      const sampleCount = 320;

      for (let i = 0; i <= sampleCount; i += 1) {
        const t = i / sampleCount;
        const x = xMin + (xMax - xMin) * t;
        for (const curve of curvesList) {
          const y = evalExtended(curve.kind, x, curve.mode, curve.a, curve.b, curve.fn);
          if (!Number.isFinite(y)) continue;
          if (y < yMin) yMin = y;
          if (y > yMax) yMax = y;
        }
      }

      if (!Number.isFinite(yMin) || !Number.isFinite(yMax) || yMin === yMax) {
        yMin = -1;
        yMax = 1;
      }

      yMin = Math.min(yMin, 0);
      if (curvesList.some((curve) => curve.kind === "cdf")) yMax = Math.max(yMax, 1);

      const ySpanRaw = Math.max(1e-6, yMax - yMin);
      const yPad = Math.max(cameraOptions.yPadMin, ySpanRaw * cameraOptions.yPadFraction);

      return {
        xMin,
        xMax,
        yMin: yMin - yPad,
        yMax: yMax + yPad
      };
    }

    function refreshCameraBounds() {
      cameraBounds = computeCameraBounds(getCurvesForBounds());
      applyCameraBounds();
    }

    function restoreDefaultView() {
      scale = Number.isFinite(options.scale) ? options.scale : 90;
      hasPlacedCamera = false;
      placeInitialCamera();
      cameraBounds = computeCameraBounds(curves);
      applyCameraBounds();
    }

    function applyCameraBounds(anchor = null) {
      if (!cameraBounds) return;

      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (w <= 0 || h <= 0) return;

      const boundsWidth = Math.max(1e-9, cameraBounds.xMax - cameraBounds.xMin);
      const boundsHeight = Math.max(1e-9, cameraBounds.yMax - cameraBounds.yMin);
      const fitScaleX = w / boundsWidth;
      const fitScaleY = h / boundsHeight;
      const configuredMinScale = Number.isFinite(cameraOptions.minScale)
        ? Math.max(1e-9, cameraOptions.minScale)
        : DEFAULT_CAMERA_OPTIONS.minScale;
      const configuredMaxScale = cameraOptions.maxScale === Infinity
        ? Infinity
        : (Number.isFinite(cameraOptions.maxScale) ? cameraOptions.maxScale : DEFAULT_CAMERA_OPTIONS.maxScale);
      const fitMinScale = Math.max(1e-9, Math.min(fitScaleX, fitScaleY));
      const minScale = Math.max(configuredMinScale, fitMinScale);
      const maxScale = Math.max(minScale, configuredMaxScale);
      scale = clamp(scale, minScale, maxScale);

      let xCenter = (w * 0.5 - offsetX) / scale;
      let yCenter = (offsetY - h * 0.5) / scale;
      if (
        anchor
        && Number.isFinite(anchor.screenX)
        && Number.isFinite(anchor.screenY)
        && Number.isFinite(anchor.worldX)
        && Number.isFinite(anchor.worldY)
      ) {
        xCenter = anchor.worldX - (anchor.screenX - w * 0.5) / scale;
        yCenter = anchor.worldY + (anchor.screenY - h * 0.5) / scale;
      }
      const halfViewW = (w * 0.5) / scale;
      const halfViewH = (h * 0.5) / scale;

      let minCenterX = cameraBounds.xMin + halfViewW;
      let maxCenterX = cameraBounds.xMax - halfViewW;
      if (minCenterX > maxCenterX) {
        const midX = (cameraBounds.xMin + cameraBounds.xMax) * 0.5;
        minCenterX = midX;
        maxCenterX = midX;
      }

      let minCenterY = cameraBounds.yMin + halfViewH;
      let maxCenterY = cameraBounds.yMax - halfViewH;
      if (minCenterY > maxCenterY) {
        const midY = (cameraBounds.yMin + cameraBounds.yMax) * 0.5;
        minCenterY = midY;
        maxCenterY = midY;
      }

      const clampedXCenter = clamp(xCenter, minCenterX, maxCenterX);
      const clampedYCenter = clamp(yCenter, minCenterY, maxCenterY);

      offsetX = w * 0.5 - clampedXCenter * scale;
      offsetY = clampedYCenter * scale + h * 0.5;
    }

    function drawGridAndAxes() {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = visualTheme.canvasBg;
      ctx.fillRect(0, 0, w, h);

      const step = chooseGridStep();
      const xr = visibleWorldXRange();
      const yr = visibleWorldYRange();

      ctx.lineWidth = 1;
      ctx.strokeStyle = visualTheme.gridLine;

      const xStart = Math.floor(xr.left / step) * step;
      const xEnd = Math.ceil(xr.right / step) * step;
      for (let x = xStart; x <= xEnd; x += step) {
        const p = worldToScreen(x, 0);
        ctx.beginPath();
        ctx.moveTo(p.x, 0);
        ctx.lineTo(p.x, h);
        ctx.stroke();
      }

      const yStart = Math.floor(yr.bottom / step) * step;
      const yEnd = Math.ceil(yr.top / step) * step;
      for (let y = yStart; y <= yEnd; y += step) {
        const p = worldToScreen(0, y);
        ctx.beginPath();
        ctx.moveTo(0, p.y);
        ctx.lineTo(w, p.y);
        ctx.stroke();
      }

      ctx.lineWidth = 2;
      ctx.strokeStyle = visualTheme.axisLine;
      const yAxisX = worldToScreen(0, 0).x;
      const xAxisY = worldToScreen(0, 0).y;

      ctx.beginPath();
      ctx.moveTo(0, xAxisY);
      ctx.lineTo(w, xAxisY);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(yAxisX, 0);
      ctx.lineTo(yAxisX, h);
      ctx.stroke();

      ctx.lineWidth = 1;
      ctx.strokeStyle = visualTheme.refLine;
      for (const y of [0, 1]) {
        const p = worldToScreen(0, y);
        ctx.beginPath();
        ctx.moveTo(0, p.y);
        ctx.lineTo(w, p.y);
        ctx.stroke();
      }

      if (!showGridNumbers) return;

      ctx.fillStyle = visualTheme.tickText;
      ctx.font = "11px system-ui, -apple-system, Segoe UI, Roboto";

      const xLabelY = (xAxisY >= 18 && xAxisY <= h - 10) ? xAxisY + 12 : h - 8;
      for (let x = xStart; x <= xEnd; x += step) {
        const p = worldToScreen(x, 0);
        if (p.x < 8 || p.x > w - 8) continue;
        const text = formatTick(x, step);
        const tw = ctx.measureText(text).width;
        ctx.fillText(text, p.x - tw * 0.5, xLabelY);
      }

      const yLabelX = (yAxisX >= 0 && yAxisX <= w - 36) ? yAxisX + 7 : 6;
      ctx.textBaseline = "middle";
      for (let y = yStart; y <= yEnd; y += step) {
        const p = worldToScreen(0, y);
        if (p.y < 10 || p.y > h - 10) continue;
        ctx.fillText(formatTick(y, step), yLabelX, p.y);
      }
      ctx.textBaseline = "alphabetic";
    }

    function plotCurve(curve) {
      const xr = visibleWorldXRange();
      const pxStep = 1.25;
      const dx = pxStep / scale;

      ctx.strokeStyle = curve.color;
      ctx.lineWidth = 2;
      ctx.beginPath();

      let first = true;
      for (let x = xr.left; x <= xr.right; x += dx) {
        const y = evalExtended(curve.kind, x, curve.mode, curve.a, curve.b, curve.fn);
        if (!Number.isFinite(y)) {
          first = true;
          continue;
        }
        const p = worldToScreen(x, y);
        if (first) {
          ctx.moveTo(p.x, p.y);
          first = false;
        } else {
          ctx.lineTo(p.x, p.y);
        }
      }
      ctx.stroke();
    }

    function drawCurveLabels(candidates) {
      if (!candidates.length) return;

      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const topPad = 12;
      const bottomPad = 8;
      const lineGap = 16;

      const placed = candidates
        .map((item) => ({
          ...item,
          y: Math.max(topPad, Math.min(h - bottomPad, item.targetY))
        }))
        .sort((a, b) => a.y - b.y);

      for (let i = 1; i < placed.length; i += 1) {
        const minY = placed[i - 1].y + lineGap;
        if (placed[i].y < minY) placed[i].y = minY;
      }

      const overflow = placed[placed.length - 1].y - (h - bottomPad);
      if (overflow > 0) {
        for (const item of placed) item.y -= overflow;
        for (let i = placed.length - 2; i >= 0; i -= 1) {
          const maxY = placed[i + 1].y - lineGap;
          if (placed[i].y > maxY) placed[i].y = maxY;
        }
      }

      const underflow = topPad - placed[0].y;
      if (underflow > 0) {
        for (const item of placed) item.y += underflow;
      }

      ctx.font = "12px system-ui, -apple-system, Segoe UI, Roboto";
      const maxLabelWidth = placed.reduce((maxW, item) => {
        return Math.max(maxW, ctx.measureText(item.label).width);
      }, 0);
      const textX = Math.max(8, w - maxLabelWidth - 24);

      for (const item of placed) {
        const labelWidth = ctx.measureText(item.label).width;

        ctx.strokeStyle = visualTheme.labelConnector;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(item.anchorX, item.anchorY);
        ctx.lineTo(textX - 8, item.y - 4);
        ctx.stroke();

        ctx.fillStyle = visualTheme.labelBox;
        ctx.fillRect(textX - 8, item.y - 12, labelWidth + 16, 16);

        ctx.fillStyle = item.color;
        ctx.fillText(item.label, textX, item.y);
      }
    }

    function drawHoverTooltip() {
      if (!hoverInfo) return;

      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const text = `${hoverInfo.label}: x=${formatNumber(hoverInfo.x, 4)}, y=${formatNumber(hoverInfo.y, 4)}`;

      ctx.strokeStyle = hoverInfo.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(hoverInfo.sx, hoverInfo.sy, 4, 0, Math.PI * 2);
      ctx.stroke();

      ctx.font = "12px system-ui, -apple-system, Segoe UI, Roboto";
      const textWidth = ctx.measureText(text).width;
      const boxW = textWidth + 14;
      const boxH = 22;

      let boxX = hoverInfo.mx + 12;
      let boxY = hoverInfo.my - boxH - 12;

      if (boxX + boxW > w - 8) boxX = hoverInfo.mx - boxW - 12;
      if (boxY < 8) boxY = hoverInfo.my + 12;

      boxX = Math.max(8, Math.min(w - boxW - 8, boxX));
      boxY = Math.max(8, Math.min(h - boxH - 8, boxY));

      ctx.fillStyle = visualTheme.hoverBox;
      ctx.fillRect(boxX, boxY, boxW, boxH);

      ctx.strokeStyle = visualTheme.hoverBorder;
      ctx.lineWidth = 1;
      ctx.strokeRect(boxX + 0.5, boxY + 0.5, boxW - 1, boxH - 1);

      ctx.fillStyle = hoverInfo.color;
      ctx.fillText(text, boxX + 7, boxY + 15);
    }

    function updateHoverInfo(mx, my) {
      const world = screenToWorld(mx, my);
      const thresholdPx = 14;
      let best = null;

      for (const curve of getVisibleCurves()) {
        const y = evalExtended(curve.kind, world.x, curve.mode, curve.a, curve.b, curve.fn);
        if (!Number.isFinite(y)) continue;
        const p = worldToScreen(world.x, y);
        const distance = Math.abs(p.y - my);
        if (distance > thresholdPx) continue;
        if (!best || distance < best.distance) {
          best = { curve, x: world.x, y, sx: p.x, sy: p.y, distance };
        }
      }

      if (!best) {
        if (hoverInfo) {
          hoverInfo = null;
          requestRender();
        }
        return;
      }

      const next = {
        label: best.curve.label || `${best.curve.kind.toUpperCase()} curve`,
        color: best.curve.color,
        x: best.x,
        y: best.y,
        sx: best.sx,
        sy: best.sy,
        curveId: best.curve._curveId,
        mx,
        my
      };

      const changed = !hoverInfo
        || hoverInfo.label !== next.label
        || hoverInfo.curveId !== next.curveId
        || Math.abs(hoverInfo.mx - next.mx) > 0.5
        || Math.abs(hoverInfo.my - next.my) > 0.5
        || Math.abs(hoverInfo.y - next.y) > 1e-6;

      hoverInfo = next;
      if (changed) requestRender();
    }

    function render() {
      rafPending = false;
      drawGridAndAxes();

      const xr = visibleWorldXRange();
      const labelX = xr.left + (xr.right - xr.left) * 0.78;
      const labelCandidates = [];
      const visibleCurves = getVisibleCurves();

      for (const curve of visibleCurves) {
        plotCurve(curve);
        if (!showCurveLabels) continue;
        if (!curve.label) continue;
        const y = evalExtended(curve.kind, labelX, curve.mode, curve.a, curve.b, curve.fn);
        if (!Number.isFinite(y)) continue;
        const p = worldToScreen(labelX, y);
        labelCandidates.push({
          label: curve.label,
          color: curve.color,
          targetY: p.y,
          anchorX: p.x,
          anchorY: p.y
        });
      }

      if (showCurveLabels) drawCurveLabels(labelCandidates);
      drawHoverTooltip();
    }

    function requestRender() {
      if (rafPending) return;
      rafPending = true;
      requestAnimationFrame(render);
    }

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(canvas.clientWidth * dpr);
      canvas.height = Math.floor(canvas.clientHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      placeInitialCamera();
      applyCameraBounds();
      requestRender();
    }

    function onWheel(event) {
      event.preventDefault();

      const rect = canvas.getBoundingClientRect();
      const mx = event.clientX - rect.left;
      const my = event.clientY - rect.top;

      const anchor = screenToWorld(mx, my);
      const zoomFactor = Math.exp((-event.deltaY) * 0.001);
      scale *= zoomFactor;
      applyCameraBounds({
        screenX: mx,
        screenY: my,
        worldX: anchor.x,
        worldY: anchor.y
      });
      updateHoverInfo(mx, my);
      requestRender();
    }

    function onPointerDown(event) {
      dragging = true;
      lastX = event.clientX;
      lastY = event.clientY;
      if (hoverInfo) {
        hoverInfo = null;
        requestRender();
      }
      canvas.setPointerCapture(event.pointerId);
    }

    function onPointerMove(event) {
      const rect = canvas.getBoundingClientRect();
      const mx = event.clientX - rect.left;
      const my = event.clientY - rect.top;

      if (dragging) {
        const dx = event.clientX - lastX;
        const dy = event.clientY - lastY;
        lastX = event.clientX;
        lastY = event.clientY;
        offsetX += dx;
        offsetY += dy;
        applyCameraBounds();
        requestRender();
        return;
      }

      updateHoverInfo(mx, my);
    }

    function onPointerUp(event) {
      dragging = false;
      const rect = canvas.getBoundingClientRect();
      updateHoverInfo(event.clientX - rect.left, event.clientY - rect.top);
    }

    function onPointerCancel() {
      dragging = false;
      if (hoverInfo) {
        hoverInfo = null;
        requestRender();
      }
    }

    function onPointerLeave() {
      if (hoverInfo) {
        hoverInfo = null;
        requestRender();
      }
    }

    function onToggleNumbersChange(event) {
      showGridNumbers = event.target.checked;
      requestRender();
    }

    function onToggleCurveLabelsChange(event) {
      showCurveLabels = event.target.checked;
      requestRender();
    }

    function onCurveToggleChange(event) {
      const curveId = event.target.dataset.curveId;
      const curve = curves.find((item) => item._curveId === curveId);
      if (!curve) return;

      curve.visible = event.target.checked;
      if (hoverInfo && !curve.visible && hoverInfo.curveId === curve._curveId) {
        hoverInfo = null;
      }

      refreshCameraBounds();
      requestRender();
    }

    function onRestoreZoomClick() {
      if (hoverInfo) hoverInfo = null;
      restoreDefaultView();
      requestRender();
    }

    function setControlVisibility(next = {}) {
      if (typeof next.showGridNumbersControl === "boolean") {
        controlOptions.showGridNumbersControl = next.showGridNumbersControl;
        if (toggleNumbersRow) {
          toggleNumbersRow.style.display = controlOptions.showGridNumbersControl ? "" : "none";
        }
      }

      if (typeof next.showCurveListControl === "boolean") {
        controlOptions.showCurveListControl = next.showCurveListControl;
        rebuildCurveControlList();
      }

      if (typeof next.showCurveLabelsControl === "boolean") {
        controlOptions.showCurveLabelsControl = next.showCurveLabelsControl;
        if (toggleCurveLabelsRow) {
          toggleCurveLabelsRow.style.display = controlOptions.showCurveLabelsControl ? "" : "none";
        }
      }
    }

    function setCurveVisibility(curveIndexOrId, visible) {
      const desired = Boolean(visible);
      let curve = null;
      if (typeof curveIndexOrId === "number") {
        curve = curves[curveIndexOrId] || null;
      } else {
        curve = curves.find((item) => item._curveId === curveIndexOrId) || null;
      }
      if (!curve) return false;

      curve.visible = desired;
      for (const input of curveToggleInputs) {
        if (input.dataset.curveId === curve._curveId) {
          input.checked = desired;
          break;
        }
      }
      if (hoverInfo && !curve.visible && hoverInfo.curveId === curve._curveId) {
        hoverInfo = null;
      }

      refreshCameraBounds();
      requestRender();
      return true;
    }

    function setTheme(nextTheme = {}) {
      visualTheme = {
        ...visualTheme,
        ...(nextTheme || {})
      };
      requestRender();
    }

    rebuildCurveControlList();
    refreshCameraBounds();

    let resizeObserver = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => resize());
      resizeObserver.observe(canvas);
    }

    window.addEventListener("resize", resize);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerCancel);
    canvas.addEventListener("pointerleave", onPointerLeave);
    if (toggleNumbers) toggleNumbers.addEventListener("change", onToggleNumbersChange);
    if (toggleCurveLabels) toggleCurveLabels.addEventListener("change", onToggleCurveLabelsChange);
    if (actionRestoreZoom) actionRestoreZoom.addEventListener("click", onRestoreZoomClick);

    resize();

    return {
      canvas,
      curves,
      requestRender,
      setControlVisibility,
      setCurveVisibility,
      setTheme,
      getCameraConfig() {
        return { ...cameraOptions };
      },
      getThemeConfig() {
        return { ...visualTheme };
      },
      destroy() {
        if (resizeObserver) resizeObserver.disconnect();
        window.removeEventListener("resize", resize);
        canvas.removeEventListener("wheel", onWheel);
        canvas.removeEventListener("pointerdown", onPointerDown);
        canvas.removeEventListener("pointermove", onPointerMove);
        canvas.removeEventListener("pointerup", onPointerUp);
        canvas.removeEventListener("pointercancel", onPointerCancel);
        canvas.removeEventListener("pointerleave", onPointerLeave);
        if (toggleNumbers) toggleNumbers.removeEventListener("change", onToggleNumbersChange);
        if (toggleCurveLabels) toggleCurveLabels.removeEventListener("change", onToggleCurveLabelsChange);
        if (actionRestoreZoom) actionRestoreZoom.removeEventListener("click", onRestoreZoomClick);
        for (const input of curveToggleInputs) {
          input.removeEventListener("change", onCurveToggleChange);
        }
        curveToggleInputs = [];
        if (curveControlList) curveControlList.remove();
      }
    };
  }

  window.ChartSupportMode = SupportMode;
  const chartFunctions = window.ChartCommonDistributions || window.ChartFunctions || Object.freeze({});
  window.ChartFunctions = chartFunctions;
  window.ChartDefaults = {
    camera: { ...DEFAULT_CAMERA_OPTIONS },
    controls: { ...DEFAULT_CONTROL_OPTIONS },
    theme: { ...DEFAULT_VISUAL_THEME }
  };
  window.createDistributionChart = createDistributionChart;
})();

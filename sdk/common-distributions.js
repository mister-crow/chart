(() => {
  function normalPdf(mu, sigma) {
    const s2 = sigma * sigma;
    const c = 1 / (Math.sqrt(2 * Math.PI) * sigma);
    return (x) => c * Math.exp(-((x - mu) * (x - mu)) / (2 * s2));
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

  function normalCdf(mu, sigma) {
    return (x) => 0.5 * (1 + erfApprox((x - mu) / (sigma * Math.sqrt(2))));
  }

  function uniformPdf(a, b) {
    return (x) => (x >= a && x <= b) ? 1 / (b - a) : 0;
  }

  function uniformCdf(a, b) {
    return (x) => {
      if (x <= a) return 0;
      if (x >= b) return 1;
      return (x - a) / (b - a);
    };
  }

  function expPdf(lambda) {
    return (x) => lambda * Math.exp(-lambda * x);
  }

  function expCdf(lambda) {
    return (x) => 1 - Math.exp(-lambda * x);
  }

  const commonDistributions = Object.freeze({
    normalPdf,
    normalCdf,
    uniformPdf,
    uniformCdf,
    expPdf,
    expCdf
  });

  window.ChartCommonDistributions = commonDistributions;
  // Backward-compatible alias used by existing example/app code.
  window.ChartFunctions = commonDistributions;
})();

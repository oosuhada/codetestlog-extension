(function () {
  const chartInstances = {};

  const SITE_COLOR_VARS = ['--accent', '--timeout', '--compile', '--wrong', '--memory', '--correct'];

  function cssVar(name, fallback) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
  }

  function resultColor(result) {
    const map = {
      correct: '--correct',
      wrong: '--wrong',
      timeout: '--timeout',
      runtime_error: '--runtime',
      compile_error: '--compile',
      memory_exceeded: '--memory',
      partial: '--partial',
      run: '--muted',
    };
    return cssVar(map[result] || '--muted', '#8f8678');
  }

  function destroyChart(key) {
    if (chartInstances[key]) {
      chartInstances[key].destroy();
      chartInstances[key] = null;
    }
  }

  function renderCanvasFallback(canvas, message) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = cssVar('--muted', '#8f8678');
    ctx.font = '13px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(message, canvas.width / 2, Math.max(24, canvas.height / 2));
  }

  function createChart(key, canvasId, config) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    destroyChart(key);

    if (!window.Chart) {
      renderCanvasFallback(canvas, 'Chart.js를 불러오지 못했습니다.');
      return;
    }

    chartInstances[key] = new Chart(canvas, config);
  }

  function defaultOptions(extra = {}) {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: cssVar('--text', '#f2f2ef'), boxWidth: 12, padding: 14 },
        },
        tooltip: {
          backgroundColor: cssVar('--surface', '#191919'),
          borderColor: cssVar('--border', '#333333'),
          borderWidth: 1,
        },
      },
      scales: extra.scales,
    };
  }

  function renderDailyChart(dailySeries) {
    createChart('daily', 'chart-daily', {
      type: 'bar',
      data: {
        labels: dailySeries.map((item) => item.label),
        datasets: [{
          label: '제출',
          data: dailySeries.map((item) => item.count),
          backgroundColor: cssVar('--accent', '#d8b26e'),
          borderRadius: 4,
        }],
      },
      options: defaultOptions({
        scales: {
          x: { ticks: { color: cssVar('--muted', '#aaa39a'), maxRotation: 0 }, grid: { color: cssVar('--border', '#333333') } },
          y: { beginAtZero: true, ticks: { color: cssVar('--muted', '#aaa39a'), precision: 0 }, grid: { color: cssVar('--border', '#333333') } },
        },
      }),
    });
  }

  function renderResultChart(byResult) {
    const labels = Object.keys(byResult);
    createChart('result', 'chart-result', {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data: labels.map((key) => byResult[key]),
          backgroundColor: labels.map((key) => resultColor(key)),
          borderColor: cssVar('--surface', '#191919'),
          borderWidth: 2,
        }],
      },
      options: defaultOptions(),
    });
  }

  function renderSiteChart(bySite) {
    const labels = Object.keys(bySite);
    createChart('site', 'chart-site', {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: '제출',
          data: labels.map((key) => bySite[key]),
          backgroundColor: labels.map((_, index) => cssVar(SITE_COLOR_VARS[index % SITE_COLOR_VARS.length], '#d8b26e')),
          borderRadius: 4,
        }],
      },
      options: defaultOptions({
        scales: {
          x: { ticks: { color: cssVar('--muted', '#aaa39a') }, grid: { display: false } },
          y: { beginAtZero: true, ticks: { color: cssVar('--muted', '#aaa39a'), precision: 0 }, grid: { color: cssVar('--border', '#333333') } },
        },
      }),
    });
  }

  function renderDashboardCharts(stats) {
    renderDailyChart(stats.dailySeries || []);
    renderResultChart(stats.byResult || {});
    renderSiteChart(stats.bySite || {});
  }

  window.DashboardCharts = { renderDashboardCharts, destroyChart };
})();

(function () {
  const chartInstances = {};

  const RESULT_COLORS = {
    correct: '#3fb950',
    wrong: '#f85149',
    timeout: '#d29922',
    runtime_error: '#f97316',
    compile_error: '#a78bfa',
    memory_exceeded: '#38bdf8',
    partial: '#eab308',
    run: '#8b949e',
  };

  const SITE_COLORS = ['#4fd1c5', '#f59e0b', '#a78bfa', '#f43f5e', '#60a5fa', '#84cc16'];

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
    ctx.fillStyle = '#8b949e';
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
          labels: { color: '#e6edf3', boxWidth: 12, padding: 14 },
        },
        tooltip: {
          backgroundColor: '#171a21',
          borderColor: '#30363d',
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
          backgroundColor: '#4fd1c5',
          borderRadius: 4,
        }],
      },
      options: defaultOptions({
        scales: {
          x: { ticks: { color: '#8b949e', maxRotation: 0 }, grid: { color: 'rgba(139, 148, 158, 0.12)' } },
          y: { beginAtZero: true, ticks: { color: '#8b949e', precision: 0 }, grid: { color: 'rgba(139, 148, 158, 0.14)' } },
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
          backgroundColor: labels.map((key) => RESULT_COLORS[key] || '#8b949e'),
          borderColor: '#171a21',
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
          backgroundColor: labels.map((_, index) => SITE_COLORS[index % SITE_COLORS.length]),
          borderRadius: 4,
        }],
      },
      options: defaultOptions({
        scales: {
          x: { ticks: { color: '#8b949e' }, grid: { display: false } },
          y: { beginAtZero: true, ticks: { color: '#8b949e', precision: 0 }, grid: { color: 'rgba(139, 148, 158, 0.14)' } },
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

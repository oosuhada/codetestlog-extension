(function () {
  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function formatPercent(value) {
    return `${Number(value || 0).toLocaleString('ko-KR')}%`;
  }

  function renderStatsCards(stats) {
    setText('stat-total', Number(stats.total || 0).toLocaleString('ko-KR'));
    setText('stat-solved', Number(stats.solved || 0).toLocaleString('ko-KR'));
    setText('stat-accuracy', formatPercent(stats.accuracy));
    setText('stat-streak', `${Number(stats.streak || 0).toLocaleString('ko-KR')}일`);
  }

  window.DashboardStatsCards = { renderStatsCards };
})();

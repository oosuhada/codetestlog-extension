(function () {
  const CTL_RESULTS = [
    'correct',
    'wrong',
    'timeout',
    'runtime_error',
    'compile_error',
    'memory_exceeded',
    'partial',
    'run',
  ];
  const CTL_RESULT_PATTERN = CTL_RESULTS.join('|');
  const EXT_LANG = {
    py: 'Python',
    java: 'Java',
    js: 'JavaScript',
    ts: 'TypeScript',
    cpp: 'C++',
    c: 'C',
    kt: 'Kotlin',
    swift: 'Swift',
    go: 'Go',
    rs: 'Rust',
    rb: 'Ruby',
  };

  const state = {
    submissions: [],
    owner: '',
    repo: '',
  };

  const $ = (id) => document.getElementById(id);

  function setHidden(id, hidden) {
    const el = $(id);
    if (el) el.classList.toggle('hidden', hidden);
  }

  function setError(message) {
    const errorEl = $('error');
    if (!errorEl) return;
    errorEl.textContent = message || '';
    setHidden('error', !message);
  }

  function parseRepoInput(value) {
    const match = `${value || ''}`.trim().match(/^([^/\s]+)\/([^/\s]+)$/);
    if (!match) return null;
    return { owner: match[1], repo: match[2] };
  }

  function buildGithubBlobUrl(owner, repo, path) {
    const encodedPath = path.split('/').map(encodeURIComponent).join('/');
    return `https://github.com/${owner}/${repo}/blob/HEAD/${encodedPath}`;
  }

  /**
   * GitHub 레포의 파일 트리를 CTL 규칙으로 파싱합니다.
   * @param {string} owner
   * @param {string} repo
   * @returns {Promise<Array>}
   */
  async function fetchSubmissions(owner, repo) {
    const url = `https://api.github.com/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`;
    const res = await fetch(url, { headers: { Accept: 'application/vnd.github.v3+json' } });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `GitHub API 오류: ${res.status}`);
    }

    const data = await res.json();
    return (data.tree || [])
      .filter((file) => file.type === 'blob' && isCtlFile(file.path))
      .map((file) => parseCtlPath(file.path))
      .filter(Boolean)
      .sort((a, b) => b.submittedAt - a.submittedAt);
  }

  function isCtlFile(path) {
    const pattern = new RegExp(`/\\d{8}_\\d{6}_(${CTL_RESULT_PATTERN})_`);
    return pattern.test(path);
  }

  function parseCtlPath(path) {
    const parts = path.split('/');
    if (parts.length < 4) return null;

    const fileName = parts[parts.length - 1];
    const problemFolder = parts[parts.length - 2];
    const level = parts[parts.length - 3];
    const site = parts[parts.length - 4];
    const fileMatch = fileName.match(new RegExp(`^(\\d{8})_(\\d{6})_(${CTL_RESULT_PATTERN})_(.+)\\.([^.]+)$`));
    if (!fileMatch) return null;

    const [, dateStr, timeStr, result, , ext] = fileMatch;
    const problemMatch = problemFolder.match(/^(.+?)\.\s*(.+)$/);
    const problemId = problemMatch?.[1] || problemFolder;
    const title = problemMatch?.[2] || problemFolder;
    const submittedAt = parseCtlDate(dateStr, timeStr);
    if (Number.isNaN(submittedAt.getTime())) return null;

    return {
      site,
      level,
      problemId,
      title,
      result,
      language: extToLang(ext),
      submittedAt,
      path,
    };
  }

  function parseCtlDate(dateStr, timeStr) {
    const year = Number(dateStr.slice(0, 4));
    const month = Number(dateStr.slice(4, 6)) - 1;
    const day = Number(dateStr.slice(6, 8));
    const hour = Number(timeStr.slice(0, 2));
    const minute = Number(timeStr.slice(2, 4));
    const second = Number(timeStr.slice(4, 6));
    return new Date(year, month, day, hour, minute, second);
  }

  function extToLang(ext) {
    return EXT_LANG[`${ext || ''}`.toLowerCase()] || `${ext || ''}`.toUpperCase();
  }

  function toDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function makeDailySeries(dailyMap) {
    const today = new Date();
    const series = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const key = toDateKey(date);
      series.push({
        key,
        label: `${date.getMonth() + 1}/${date.getDate()}`,
        count: dailyMap[key] || 0,
      });
    }
    return series;
  }

  function calcStats(submissions) {
    const total = submissions.length;
    const correct = submissions.filter((submission) => submission.result === 'correct').length;
    const accuracy = total ? Math.round((correct / total) * 100) : 0;
    const byProblem = {};

    submissions.forEach((submission) => {
      const key = `${submission.site}__${submission.problemId}`;
      if (!byProblem[key] || submission.submittedAt > byProblem[key].submittedAt) {
        byProblem[key] = submission;
      }
    });

    const uniqueProblems = Object.values(byProblem);
    const solved = uniqueProblems.filter((submission) => submission.result === 'correct').length;
    const bySite = countBy(submissions, 'site');
    const byResult = countBy(submissions, 'result');
    const solvedDays = new Set(
      submissions
        .filter((submission) => submission.result === 'correct')
        .map((submission) => toDateKey(submission.submittedAt)),
    );
    const dailyMap = {};
    const today = new Date();

    submissions.forEach((submission) => {
      const diff = Math.floor((today - submission.submittedAt) / 86400000);
      if (diff >= 0 && diff <= 30) {
        const key = toDateKey(submission.submittedAt);
        dailyMap[key] = (dailyMap[key] || 0) + 1;
      }
    });

    return {
      total,
      correct,
      accuracy,
      solved,
      unique: uniqueProblems.length,
      bySite,
      byResult,
      streak: calcStreak(solvedDays),
      dailyMap,
      dailySeries: makeDailySeries(dailyMap),
    };
  }

  function countBy(items, key) {
    return items.reduce((acc, item) => {
      const value = item[key] || 'unknown';
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    }, {});
  }

  function calcStreak(solvedDays) {
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      if (solvedDays.has(toDateKey(date))) streak += 1;
      else break;
    }
    return streak;
  }

  function getFilters() {
    return {
      site: $('filter-site')?.value || '',
      result: $('filter-result')?.value || '',
      search: $('filter-search')?.value || '',
    };
  }

  function applyFilters() {
    const filtered = DashboardProblemTable.filterSubmissions(state.submissions, getFilters());
    DashboardProblemTable.renderProblemTable(filtered);
  }

  function renderDashboard(submissions) {
    const stats = calcStats(submissions);
    DashboardStatsCards.renderStatsCards(stats);
    DashboardCharts.renderDashboardCharts(stats);
    DashboardProblemTable.populateFilters(submissions);
    DashboardProblemTable.renderProblemTable(submissions);
    setHidden('main', false);
    setHidden('empty', true);
  }

  async function loadDashboard() {
    const repoInfo = parseRepoInput($('repo-input')?.value);
    if (!repoInfo) {
      setError('저장소는 username/repo-name 형식으로 입력해주세요.');
      return;
    }

    setError('');
    setHidden('loading', false);
    setHidden('main', true);
    setHidden('empty', true);

    try {
      const submissions = await fetchSubmissions(repoInfo.owner, repoInfo.repo);
      state.owner = repoInfo.owner;
      state.repo = repoInfo.repo;
      state.submissions = submissions.map((submission) => ({
        ...submission,
        githubUrl: buildGithubBlobUrl(repoInfo.owner, repoInfo.repo, submission.path),
      }));
      localStorage.setItem('ctl_dashboard_repo', `${repoInfo.owner}/${repoInfo.repo}`);
      const url = new URL(window.location.href);
      url.searchParams.set('repo', `${repoInfo.owner}/${repoInfo.repo}`);
      window.history.replaceState(null, '', url.toString());
      renderDashboard(state.submissions);
    } catch (error) {
      setError(error.message);
      setHidden('empty', false);
    } finally {
      setHidden('loading', true);
    }
  }

  function bindEvents() {
    $('load-btn')?.addEventListener('click', loadDashboard);
    $('repo-input')?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') loadDashboard();
    });
    ['filter-site', 'filter-result', 'filter-search'].forEach((id) => {
      $(id)?.addEventListener('input', applyFilters);
      $(id)?.addEventListener('change', applyFilters);
    });
  }

  function initRepoInput() {
    const params = new URLSearchParams(window.location.search);
    const repo = params.get('repo') || localStorage.getItem('ctl_dashboard_repo') || '';
    if (repo && $('repo-input')) {
      $('repo-input').value = repo;
      if (parseRepoInput(repo)) loadDashboard();
    }
  }

  function init() {
    bindEvents();
    initRepoInput();
  }

  document.addEventListener('DOMContentLoaded', init);

  window.CTLDashboard = {
    calcStats,
    extToLang,
    fetchSubmissions,
    isCtlFile,
    parseCtlPath,
    parseRepoInput,
  };
})();

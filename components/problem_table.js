(function () {
  const RESULT_LABELS = {
    correct: '정답',
    wrong: '오답',
    timeout: '시간초과',
    runtime_error: '런타임 에러',
    compile_error: '컴파일 에러',
    memory_exceeded: '메모리 초과',
    partial: '부분 점수',
    run: '실행',
  };

  function formatDate(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '-';
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  function resultLabel(result) {
    return RESULT_LABELS[result] || result;
  }

  function escapeHtml(text) {
    return `${text || ''}`.replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    }[char]));
  }

  function populateSelect(selectId, values, defaultLabel) {
    const select = document.getElementById(selectId);
    if (!select) return;
    const currentValue = select.value;
    select.innerHTML = `<option value="">${defaultLabel}</option>`;
    values.forEach((value) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = value;
      select.appendChild(option);
    });
    if (values.includes(currentValue)) select.value = currentValue;
  }

  function populateFilters(submissions) {
    const sites = [...new Set(submissions.map((item) => item.site).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    const results = [...new Set(submissions.map((item) => item.result).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    populateSelect('filter-site', sites, '전체 사이트');
    populateSelect('filter-result', results, '전체 결과');
  }

  function filterSubmissions(submissions, filters) {
    const search = `${filters.search || ''}`.trim().toLowerCase();
    return submissions.filter((item) => {
      if (filters.site && item.site !== filters.site) return false;
      if (filters.result && item.result !== filters.result) return false;
      if (search) {
        const haystack = `${item.title} ${item.problemId} ${item.level} ${item.language}`.toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      return true;
    });
  }

  function renderProblemTable(submissions) {
    const tbody = document.getElementById('table-body');
    if (!tbody) return;

    if (submissions.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty-row">조건에 맞는 풀이 기록이 없습니다.</td></tr>';
      return;
    }

    tbody.innerHTML = submissions.map((item) => {
      const safeTitle = escapeHtml(item.title);
      const titleCell = item.githubUrl
        ? `<a href="${escapeHtml(item.githubUrl)}" target="_blank" rel="noopener noreferrer">${safeTitle}</a>`
        : safeTitle;
      return `
        <tr>
          <td>
            <span class="problem-title">${titleCell}</span>
            <span class="problem-id">${escapeHtml(item.problemId)}</span>
          </td>
          <td>${escapeHtml(item.site)}</td>
          <td>${escapeHtml(item.level)}</td>
          <td><span class="result-badge badge-${escapeHtml(item.result)}">${escapeHtml(resultLabel(item.result))}</span></td>
          <td>${escapeHtml(item.language)}</td>
          <td>${escapeHtml(formatDate(item.submittedAt))}</td>
        </tr>
      `;
    }).join('');
  }

  window.DashboardProblemTable = {
    filterSubmissions,
    populateFilters,
    renderProblemTable,
    resultLabel,
  };
})();

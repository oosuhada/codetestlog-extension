const LEETCODE_RESULT_MAP = {
  Accepted: 'correct',
  'Wrong Answer': 'wrong',
  'Time Limit Exceeded': 'timeout',
  'Memory Limit Exceeded': 'memory_exceeded',
  'Runtime Error': 'runtime_error',
  'Compile Error': 'compile_error',
  'Compilation Error': 'compile_error',
};

const LEETCODE_LEVEL_MAP = {
  Easy: 'easy',
  Medium: 'medium',
  Hard: 'hard',
};

function parseLeetCodeDifficulty() {
  try {
    const candidates = document.querySelectorAll('[diff], [data-difficulty], .difficulty-badge, [class*="difficulty"]');
    for (const el of candidates) {
      const text = el.getAttribute('diff') || el.getAttribute('data-difficulty') || el.textContent.trim();
      if (LEETCODE_LEVEL_MAP[text]) return LEETCODE_LEVEL_MAP[text];
    }
  } catch (_) {}
  return 'unknown';
}

function parseLeetCodeProblemId() {
  const slug = location.pathname.match(/problems\/([^/]+)/)?.[1] || 'unknown';
  const title = document.querySelector('[data-cy="question-title"], .text-title-large, h1')?.textContent || '';
  const idMatch = title.match(/^\s*(\d+)\./);
  return idMatch ? idMatch[1] : slug;
}

function parseLeetCodeTitle() {
  const raw = document.querySelector('[data-cy="question-title"], .text-title-large, h1')?.textContent || document.title;
  return raw.replace(/^\s*\d+\.\s*/, '').replace(/- LeetCode.*$/, '').trim() || 'unknown';
}

function parseLeetCodeLanguage() {
  const el = document.querySelector('[data-cy="lang-select"], button[id*="headlessui-listbox-button"], [class*="lang"] button');
  return el?.textContent?.trim() || 'Unknown';
}

function parseLeetCodeCode() {
  try {
    const monaco = document.querySelector('.monaco-editor textarea.inputarea');
    if (monaco?.value) return monaco.value;
    const lines = [...document.querySelectorAll('.view-lines .view-line')].map((line) => line.textContent);
    if (lines.length > 0) return lines.join('\n');
    const textarea = document.querySelector('textarea[name="code"], textarea');
    return textarea?.value || '';
  } catch (_) {
    return '';
  }
}

function parseLeetCodeResult() {
  const text = [
    ...document.querySelectorAll([
      '[data-e2e-locator*="submission-result"]',
      '[data-cy*="submission-result"]',
      '.submission-result',
      '[class*="SubmissionResult"]',
      '[class*="result-state"]',
      '[class*="status-label"]',
    ].join(', ')),
  ]
    .map((node) => node.textContent.trim())
    .filter(Boolean)
    .join(' | ');
  const raw = Object.keys(LEETCODE_RESULT_MAP).find((key) => text.includes(key));
  return raw ? LEETCODE_RESULT_MAP[raw] : null;
}

var LeetCodeAdapter = {
  isActive() {
    return location.hostname.includes('leetcode.com') && location.pathname.includes('/problems/');
  },
  async detect() {
    if (!this.isActive()) return null;
    const result = parseLeetCodeResult();
    if (!result) return null;
    const code = parseLeetCodeCode();
    if (!code) return null;
    return {
      problemId: parseLeetCodeProblemId(),
      title: parseLeetCodeTitle(),
      level: parseLeetCodeDifficulty(),
      result,
      code,
      language: parseLeetCodeLanguage(),
      siteLabel: 'LeetCode',
      siteKey: 'leetcode',
      includeReadme: result === 'correct',
    };
  },
};

SiteAdapterRegistry.register('leetcode', LeetCodeAdapter);
globalThis.LeetCodeAdapter = LeetCodeAdapter;

if (globalThis.CTLCommitHandler) {
  CTLCommitHandler.startPolling('leetcode');
}

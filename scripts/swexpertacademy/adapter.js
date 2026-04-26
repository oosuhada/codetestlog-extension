const SWEA_RESULT_MAP = {
  'correct answer': 'correct',
  pass: 'correct',
  'wrong answer': 'wrong',
  fail: 'wrong',
  'time limit': 'timeout',
  'time limit exceeded': 'timeout',
  'memory limit': 'memory_exceeded',
  'runtime error': 'runtime_error',
  'compile error': 'compile_error',
};

function normalizeSweaResult(rawResult) {
  const text = `${rawResult || ''}`.replace(/\s+/g, ' ').trim().toLowerCase();
  if (!text) return null;
  const key = Object.keys(SWEA_RESULT_MAP).find((candidate) => text.includes(candidate));
  return key ? SWEA_RESULT_MAP[key] : null;
}

function parseSweaLevel() {
  try {
    const levelEl = document.querySelector('[class*="difficulty"], [class*="level"], .badge');
    if (levelEl) {
      const match = levelEl.textContent.match(/D(\d)/i);
      if (match) return `d${match[1]}`;
    }
  } catch (_) {}
  return 'd?';
}

var SweaAdapter = {
  isActive() {
    return location.hostname.includes('swexpertacademy.com');
  },
  fromBojData(bojData, result = 'correct') {
    if (!bojData) return null;
    return {
      problemId: bojData.problemId,
      title: bojData.title || bojData.problemTitle || `문제 ${bojData.problemId}`,
      level: `${bojData.level || parseSweaLevel()}`.toLowerCase(),
      result,
      code: bojData.code || '',
      language: bojData.language || 'Unknown',
      siteLabel: 'SWEA',
      siteKey: 'swea',
      readme: bojData.readme,
      commitPath: bojData.directory,
      fileName: bojData.fileName,
      message: bojData.message,
      includeReadme: result === 'correct',
    };
  },
  async detect() {
    if (!this.isActive()) return null;
    const rawResult = typeof getSolvedResult === 'function' ? getSolvedResult() : '';
    const result = normalizeSweaResult(rawResult);
    if (!result || typeof parseData !== 'function') return null;
    return this.fromBojData(await parseData(), result);
  },
};

SiteAdapterRegistry.register('swea', SweaAdapter);
globalThis.SweaAdapter = SweaAdapter;

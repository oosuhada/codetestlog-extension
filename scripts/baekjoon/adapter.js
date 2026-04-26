var BaekjoonAdapter = {
  isActive() {
    return location.hostname.includes('acmicpc.net');
  },
  fromBojData(bojData) {
    if (!bojData) return null;
    return {
      problemId: bojData.problemId,
      title: bojData.title || bojData.problemTitle || `문제 ${bojData.problemId}`,
      level: bojData.tier || 'unrated',
      result: bojData.ctlResult || normalizeBojResult(bojData.result, bojData.resultCategory),
      code: bojData.code || '',
      language: bojData.language || 'Unknown',
      siteLabel: '백준',
      siteKey: 'baekjoon',
      readme: bojData.readme,
      commitPath: bojData.directory,
      fileName: bojData.fileName,
      message: bojData.message,
      attemptCount: bojData.attemptCount,
      submissionId: bojData.submissionId,
      includeReadme: bojData.ctlResult === 'correct',
    };
  },
  async detect() {
    if (!this.isActive() || typeof findFromResultTable !== 'function') return null;
    const table = findFromResultTable();
    if (isEmpty(table)) return null;
    const username = findUsername();
    const row = table.find((item) => item.username === username);
    if (!row || isBojPendingResult(row.resultCategory, row.result)) return null;
    return this.fromBojData(await findData(row));
  },
};

SiteAdapterRegistry.register('baekjoon', BaekjoonAdapter);
globalThis.BaekjoonAdapter = BaekjoonAdapter;

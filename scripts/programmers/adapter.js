var ProgrammersAdapter = {
  isActive() {
    return location.hostname.includes('programmers.co.kr');
  },
  fromBojData(bojData, result) {
    if (!bojData) return null;
    return {
      problemId: bojData.problemId || parseProgrammersProblemId(),
      title: bojData.title || parseProgrammersTitle(),
      level: bojData.level || parseProgrammersLevel(),
      result: result || bojData.result || 'wrong',
      code: bojData.code || '',
      language: bojData.language || parseProgrammersLanguage(),
      siteLabel: '프로그래머스',
      siteKey: 'programmers',
      readme: bojData.readme,
      commitPath: bojData.directory,
      fileName: bojData.fileName,
      message: bojData.message,
      attemptCount: bojData.attemptCount,
      includeReadme: result === 'correct' || bojData.result === 'correct',
    };
  },
  async detect() {
    if (!this.isActive() || typeof getSolvedResultInfo !== 'function') return null;
    const solvedResult = getSolvedResultInfo();
    if (!solvedResult) return null;
    const result = normalizeProgrammersResult(solvedResult.rawResult);
    if (!result) return null;
    const bojData = await parseData();
    return this.fromBojData(bojData, result);
  },
};

SiteAdapterRegistry.register('programmers', ProgrammersAdapter);
globalThis.ProgrammersAdapter = ProgrammersAdapter;

/**
 * Generic Algolog commit handler for site adapters.
 * Mature legacy sites can keep their specialized commit path and still expose
 * adapters; new sites can call `CTLCommitHandler.handleSubmission(submission)`.
 */
var CTLCommitHandler = globalThis.CTLCommitHandler || (() => {
  const processed = new Set();
  let committing = false;

  const RESULT_VALUES = new Set([
    'correct',
    'wrong',
    'timeout',
    'runtime_error',
    'compile_error',
    'memory_exceeded',
    'partial',
    'run',
  ]);

  const LANG_EXT_MAP = {
    Python: 'py',
    Python3: 'py',
    'Python 3': 'py',
    PyPy3: 'py',
    Java: 'java',
    'Java 11': 'java',
    'Java 8': 'java',
    'JavaScript': 'js',
    'JavaScript (Node.js)': 'js',
    TypeScript: 'ts',
    'C++': 'cpp',
    'C++17': 'cpp',
    'C++14': 'cpp',
    'C++11': 'cpp',
    C: 'c',
    C11: 'c',
    'Kotlin (JVM)': 'kt',
    Kotlin: 'kt',
    Swift: 'swift',
    Go: 'go',
    Rust: 'rs',
    Ruby: 'rb',
  };

  function isValidResult(result) {
    return RESULT_VALUES.has(result);
  }

  function langToExt(language) {
    if (typeof globalThis.langToExt === 'function') return globalThis.langToExt(language);
    if (typeof globalThis.getLanguageExtension === 'function') return globalThis.getLanguageExtension(language || '');
    const raw = `${language || ''}`;
    return LANG_EXT_MAP[raw] || LANG_EXT_MAP[raw.split('/')[0].trim()] || 'txt';
  }

  function sanitizeTitle(title) {
    return `${title || 'unknown'}`.replace(/[\\/:*?"<>|]/g, '').trim() || 'unknown';
  }

  function buildFileName(result, title, ext) {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const ts = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`
      + `_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    return `${ts}_${result}_${sanitizeTitle(title).replace(/\s+/g, '_')}.${ext || 'txt'}`;
  }

  function buildCommitPath(siteLabel, level, problemId, title) {
    return `${siteLabel || 'unknown'}/${level || 'unknown'}/${problemId || 'unknown'}. ${sanitizeTitle(title)}`;
  }

  function buildCommitMessage({ result, site, level, title, lang, attemptCount }) {
    return `[ALG] ${result} | ${site} | ${level} | ${title} | ${lang} | ${attemptCount}번째 시도`;
  }

  async function incrementAttemptCount(siteKey, problemId) {
    const key = CTL_STORAGE_KEYS.attemptCount(siteKey, problemId || 'unknown');
    return new Promise((resolve) => {
      chrome.storage.local.get([key], (data) => {
        const next = (data[key] || 0) + 1;
        chrome.storage.local.set({ [key]: next }, () => resolve(next));
      });
    });
  }

  function createSubmissionSignature(submission) {
    const codePart = `${submission.code || ''}`.slice(0, 80);
    return [
      submission.siteKey,
      submission.submissionId || submission.problemId,
      submission.result,
      `${submission.code || ''}`.length,
      codePart,
    ].join(':');
  }

  function sendCommitEvent(payload) {
    try {
      chrome.runtime.sendMessage({ type: 'CTL_COMMIT_EVENT', payload }, () => {
        if (chrome.runtime.lastError) {
          console.log('[ALG] Side Panel event skipped:', chrome.runtime.lastError.message);
        }
      });
    } catch (_) {}
  }

  function defaultReadme(submission, commitPath) {
    return `# ${submission.title || submission.problemId}\n\n`
      + `- Site: ${submission.siteLabel}\n`
      + `- Level: ${submission.level}\n`
      + `- Result: ${submission.result}\n`
      + `- Language: ${submission.language || 'Unknown'}\n`
      + `- Path: ${commitPath}\n`;
  }

  async function uploadToGitHub({ commitPath, fileName, code, readme, message, includeReadme = true }) {
    const token = await getToken();
    const hook = await getHook();
    if (isNull(token) || isNull(hook)) {
      throw new Error('GitHub token or repository hook is missing.');
    }

    const git = new GitHub(hook, token);
    const stats = await getStats();
    const defaultBranch = await git.getDefaultBranchOnRepo();
    stats.branches[hook] = defaultBranch;
    const { refSHA, ref } = await git.getReference(defaultBranch);

    const treeItems = [{
      path: `${commitPath}/${fileName}`,
      mode: '100644',
      type: 'blob',
      content: code,
    }];

    if (includeReadme && readme) {
      treeItems.push({
        path: `${commitPath}/README.md`,
        mode: '100644',
        type: 'blob',
        content: readme,
      });
    }

    const treeData = await git.createTree(refSHA, treeItems);
    const commitSHA = await git.createCommit(message, treeData.sha, refSHA);
    await git.updateHead(ref, commitSHA);

    treeData.tree.forEach((item) => {
      updateObjectDatafromPath(stats.submission, `${hook}/${item.path}`, item.sha);
    });
    await saveStats(stats);
  }

  async function handleSubmission(submission) {
    if (!submission || !isValidResult(submission.result) || !submission.code) return null;
    const signature = createSubmissionSignature(submission);
    if (processed.has(signature) || committing) return null;
    processed.add(signature);
    committing = true;

    const attemptCount = submission.attemptCount || await incrementAttemptCount(submission.siteKey, submission.problemId);
    const ext = submission.extension || langToExt(submission.language);
    const fileName = submission.fileName || buildFileName(submission.result, submission.title, ext);
    const commitPath = submission.commitPath || buildCommitPath(
      submission.siteLabel,
      submission.level,
      submission.problemId,
      submission.title,
    );
    const message = submission.message || buildCommitMessage({
      result: submission.result,
      site: submission.siteLabel,
      level: submission.level,
      title: submission.title,
      lang: submission.language,
      attemptCount,
    });
    const eventId = `${submission.siteKey}:${submission.problemId}:${Date.now()}`;

    sendCommitEvent({
      eventId,
      phase: 'start',
      result: submission.result,
      problemId: submission.problemId,
      problemName: submission.title,
      site: submission.siteLabel,
      level: submission.level || '',
      language: submission.language || '',
      fileName,
      commitPath,
      attemptCount,
      success: true,
      timestamp: Date.now(),
    });

    let success = false;
    try {
      await uploadToGitHub({
        commitPath,
        fileName,
        code: submission.code,
        readme: submission.readme || defaultReadme(submission, commitPath),
        message,
        includeReadme: submission.includeReadme !== false,
      });
      success = true;
      return { commitPath, fileName, attemptCount };
    } catch (error) {
      processed.delete(signature);
      console.error('[ALG] Adapter commit failed:', error);
      return null;
    } finally {
      committing = false;
      sendCommitEvent({
        eventId,
        phase: 'complete',
        result: submission.result,
        problemId: submission.problemId,
        problemName: submission.title,
        site: submission.siteLabel,
        level: submission.level || '',
        language: submission.language || '',
        code: `${submission.code || ''}`.slice(0, 2000),
        fileName,
        commitPath,
        attemptCount,
        success,
        timestamp: Date.now(),
      });
    }
  }

  function startPolling(siteKey, intervalMs = 2500) {
    const adapter = SiteAdapterRegistry.get(siteKey);
    if (!adapter || !adapter.isActive()) return null;
    return setInterval(async () => {
      try {
        await handleSubmission(await adapter.detect());
      } catch (error) {
        console.error(`[ALG] Adapter polling failed: ${siteKey}`, error);
      }
    }, intervalMs);
  }

  return {
    buildFileName,
    buildCommitPath,
    buildCommitMessage,
    handleSubmission,
    incrementAttemptCount,
    langToExt,
    startPolling,
    uploadToGitHub,
  };
})();

globalThis.CTLCommitHandler = CTLCommitHandler;

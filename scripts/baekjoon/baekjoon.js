/*
 * [CTL Analysis - P03]
 * 제출 감지 방식: /status 페이지에서 setInterval 기반 DOM 폴링으로 #status-table 최신 row를 검사한다.
 * 결과 판별 URL: https://www.acmicpc.net/status?from_mine=1&problem_id=...&user_id=...
 * 결과 판별 DOM 선택자: #status-table tbody tr 첫 번째 사용자 row, 결과 cell의 data-color와 innerText.
 * 정답/오답 분기 위치: 기존 startLoader() 내부 accepted 체크와 beginUpload() 호출부.
 * 티어 정보 취득 방법: parsing.js에서 solved.ac API를 우선 사용하고 실패 시 DOM tier 배지, 최종 fallback은 unrated.
 *
 * P01과의 차이점:
 *   - 백준은 결과 row에 submissionId가 있으므로 제출 단위 중복 방지를 로컬 스토리지 키로 처리한다.
 *
 * 발견한 버그:
 *   - BUG-1: accepted가 아닌 최종 결과를 모두 pending으로 보고 return하여 오답 제출이 커밋되지 않는다.
 *   - BUG-2: 동일 제출을 다시 보는 경우 timestamp 파일명 때문에 중복 커밋될 수 있다.
 */
// Set to true to enable console log
const debug = false;

/* 
  문제 제출 맞음 여부를 확인하는 함수
  2초마다 문제를 파싱하여 확인
*/
let loader;
let pendingProcessTimer = null;

const currentUrl = window.location.href;
log(currentUrl);

// 문제 제출 사이트의 경우에는 로더를 실행하고, 유저 페이지의 경우에는 버튼을 생성한다.
// 백준 사이트 로그인 상태이면 username이 있으며, 아니면 없다.
const username = findUsername();
if (!isNull(username)) {
  if (['status', `user_id=${username}`, 'problem_id', 'from_mine=1'].every((key) => currentUrl.includes(key))) startLoader();
  else if (currentUrl.match(/\.net\/problem\/\d+/) !== null) {
    parseProblemDescription();
    injectSaveExamplesButton();
  }
  else if (currentUrl.includes('.net/user')) {
    getStats().then((stats) => {
      if (!isEmpty(stats.version) && stats.version === getVersion()) {
        if (findUsernameOnUserInfoPage() === username) {
          insertUploadAllButton();
        }
      } else {
        versionUpdate();
      }
    });
  }
  if (currentUrl.includes('/status')) injectManualUploadButtons(username);
}

function startLoader() {
  stopLoader();
  BojSubmissionState.transition(BojSubmissionState.STATE.WAITING);
  loader = setInterval(async () => {
    // 기능 Off시 작동하지 않도록 함
    const enable = await checkEnable();
    if (!enable) stopLoader();
    else if (isExistResultTable()) {
      const table = findFromResultTable();
      if (isEmpty(table)) return;
      const data = table.find((row) => row.username === findUsername()) || table[0];
      if (data.hasOwnProperty('username') && data.hasOwnProperty('resultCategory')) {
        const { username, resultCategory, result } = data;
        if (username !== findUsername()) return;
        if (isBojPendingResult(resultCategory, result)) {
          BojSubmissionState.transition(BojSubmissionState.STATE.WAITING);
          return;
        }

        const signature = createBojSubmissionSignature(data);
        if (BojSubmissionState.hasDetected(signature) || await isProcessedBojSubmission(data.submissionId)) return;
        BojSubmissionState.markDetected(signature);
        BojSubmissionState.transition(BojSubmissionState.STATE.RESULT_READY);
        await enqueueOrUploadBoj(data, signature);
      }
    }
  }, 2000);
}

function stopLoader() {
  clearInterval(loader);
  loader = null;
}

function toastThenStopLoader(toastMessage, errorMessage) {
  Toast.raiseToast(toastMessage)
  stopLoader()
  throw new Error(errorMessage)
}

function createBojSubmissionSignature(data) {
  return `${data.submissionId || 'unknown'}:${data.resultCategory || ''}:${data.result || ''}`;
}

function getBojProcessedSubmissionKey(submissionId) {
  return `ctl_baekjoon_submission_${submissionId || 'unknown'}`;
}

function isProcessedBojSubmission(submissionId) {
  return new Promise((resolve) => {
    chrome.storage.local.get([getBojProcessedSubmissionKey(submissionId)], (data) => {
      resolve(data[getBojProcessedSubmissionKey(submissionId)] === true);
    });
  });
}

function markProcessedBojSubmission(submissionId) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [getBojProcessedSubmissionKey(submissionId)]: true }, resolve);
  });
}

function createCtlEventId(site, problemId, signature) {
  const randomPart = Math.random().toString(36).slice(2);
  return `${site}:${problemId || 'unknown'}:${signature || Date.now()}:${Date.now()}:${randomPart}`;
}

function sendCtlRuntimeMessage(message) {
  try {
    chrome.runtime.sendMessage(message, () => {
      if (chrome.runtime.lastError) {
        log('[ALG][BOJ] Side Panel 메시지 전달 생략:', chrome.runtime.lastError.message);
      }
    });
  } catch (error) {
    log('[ALG][BOJ] Side Panel 메시지 전달 실패:', error);
  }
}

function notifySidePanelCommitEvent({ phase, bojData, eventId, success, error }) {
  sendCtlRuntimeMessage({
    type: 'CTL_COMMIT_EVENT',
    payload: {
      eventId,
      phase,
      result: bojData.ctlResult || normalizeBojResult(bojData.result, bojData.resultCategory),
      problemId: bojData.problemId,
      problemName: bojData.title || bojData.problemTitle || `문제 ${bojData.problemId}`,
      site: '백준',
      level: bojData.tier || bojData.level || 'unrated',
      language: bojData.language || 'Unknown',
      code: `${bojData.code || ''}`.slice(0, 2000),
      fileName: bojData.fileName || '',
      commitPath: bojData.directory || '',
      attemptCount: bojData.attemptCount || 0,
      success,
      errorMessage: error ? error.message : '',
      timestamp: Date.now(),
    },
  });
}

function schedulePendingQueue() {
  clearTimeout(pendingProcessTimer);
  pendingProcessTimer = setTimeout(processPendingQueue, 3100);
}

async function processPendingQueue() {
  if (!BojSubmissionState.hasPending() || BojSubmissionState.get() === BojSubmissionState.STATE.COMMITTING) return;
  const next = BojSubmissionState.dequeue();
  if (!next) return;
  await enqueueOrUploadBoj(next.data, next.signature);
}

async function enqueueOrUploadBoj(data, signature) {
  if (!BojSubmissionState.canCommit()) {
    BojSubmissionState.enqueue({ data, signature });
    schedulePendingQueue();
    return;
  }

  await handleBojResult(data, signature);
}

async function handleBojResult(data, signature) {
  const bojData = await findData(data);
  await beginUpload(bojData, signature);
}

/* 파싱 직후 실행되는 함수 */
async function beginUpload(bojData, signature = '') {
  if (isNull(bojData)) {
    BojSubmissionState.unmarkDetected(signature);
    return;
  }
  bojData = preProcessEmptyObj(bojData);
  log('bojData', bojData);
  if (isEmpty(bojData.code) || isEmpty(bojData.readme) || isEmpty(bojData.directory)) {
    BojSubmissionState.unmarkDetected(signature);
    return;
  }

  const eventId = createCtlEventId('baekjoon', bojData.problemId, signature);
  uploadState.uploading = true;
  BojSubmissionState.markCommitStart(signature);
  startUpload();
  notifySidePanelCommitEvent({ phase: 'start', bojData, eventId, success: true });

  try {
    const stats = await getStats();
    const hook = await getHook();

    const currentVersion = stats.version;
    /* 버전 차이가 발생하거나, 해당 hook에 대한 데이터가 없는 경우 localstorage의 Stats 값을 업데이트하고, version을 최신으로 변경한다 */
    if (isNull(currentVersion) || currentVersion !== getVersion() || isNull(await getStatsSHAfromPath(hook))) {
      await versionUpdate();
    }

    await uploadOneSolveProblemOnGit(bojData, markUploadedCSS);
    await markProcessedBojSubmission(bojData.submissionId);
    notifySidePanelCommitEvent({ phase: 'complete', bojData, eventId, success: true });
    console.log(`[ALG] 백준 커밋 완료: ${bojData.directory}/${bojData.fileName}`);
  } catch (error) {
    markUploadFailedCSS();
    BojSubmissionState.unmarkDetected(signature);
    notifySidePanelCommitEvent({ phase: 'complete', bojData, eventId, success: false, error });
    console.error('[ALG] 백준 커밋 실패:', error);
  } finally {
    uploadState.uploading = false;
    BojSubmissionState.markCommitEnd();
    schedulePendingQueue();
  }
}

/* 수동 업로드 큐 (동기적 처리) */
const manualUploadQueue = [];
let isManualUploading = false;

async function processManualUploadQueue() {
  if (isManualUploading || manualUploadQueue.length === 0) return;
  isManualUploading = true;
  while (manualUploadQueue.length > 0) {
    const { data, button } = manualUploadQueue.shift();
    button.classList.remove('algolog-upload-icon');
    button.classList.add('algolog-progress');
    button.title = '업로드 중...';
    try {
      if (await isProcessedBojSubmission(data.submissionId)) {
        button.classList.remove('algolog-progress');
        button.classList.add('algolog-upload-success');
        button.title = '이미 업로드됨';
        continue;
      }
      const bojData = await findData(data);
      if (isNotEmpty(bojData)) {
        await uploadOneSolveProblemOnGit(bojData, markUploadedCSS);
        await markProcessedBojSubmission(bojData.submissionId);
        button.classList.remove('algolog-progress');
        button.classList.add('algolog-upload-success');
        button.title = '업로드 완료';
      } else {
        button.classList.remove('algolog-progress');
        button.classList.add('algolog-upload-fail');
        button.title = '데이터 파싱 실패';
      }
    } catch (e) {
      console.error('Manual upload failed:', e);
      button.classList.remove('algolog-progress');
      button.classList.add('algolog-upload-fail');
      button.title = '업로드 실패: ' + e.message;
    }
  }
  isManualUploading = false;
}

function injectManualUploadButtons(currentUsername) {
  if (!isExistResultTable()) return;
  const table = findFromResultTable();
  if (isEmpty(table)) return;
  for (const row of table) {
    if (isBojPendingResult(row.resultCategory, row.result)) continue;
    if (row.username !== currentUsername) continue;
    const rowEl = document.getElementById(row.elementId);
    if (!rowEl) continue;
    const resultCell = rowEl.querySelector('[data-color]')?.closest('td');
    if (!resultCell) continue;
    if (resultCell.querySelector('.algolog-manual-upload-btn')) continue;
    const btn = document.createElement('button');
    btn.className = 'algolog-manual-upload-btn algolog-upload-icon';
    btn.title = 'GitHub에 업로드';
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (btn.classList.contains('algolog-progress') || btn.classList.contains('algolog-upload-success')) return;
      manualUploadQueue.push({ data: row, button: btn });
      processManualUploadQueue();
    });
    resultCell.appendChild(btn);
  }
}

async function injectSaveExamplesButton() {
  const enabled = await getSaveExamplesOption();
  if (!enabled) return;
  const samples = parseSampleData(document);
  if (samples.length === 0) return;
  const anchor = document.getElementById('sampleinput1') || document.querySelector('#sample-input-1')?.parentElement;
  if (!anchor) return;
  const btn = document.createElement('button');
  btn.className = 'algolog-save-examples-btn';
  btn.textContent = '예제 업로드';
  btn.addEventListener('click', async () => {
    if (btn.disabled) return;
    btn.disabled = true;
    btn.classList.remove('success', 'fail');
    btn.textContent = '업로드 중...';
    try {
      await uploadExamplesFromProblemPage(samples);
      btn.classList.add('success');
      btn.textContent = '업로드 완료';
    } catch (e) {
      console.error('예제 업로드 실패:', e);
      btn.classList.add('fail');
      btn.textContent = '업로드 실패';
      btn.disabled = false;
    }
  });
  anchor.parentElement.insertBefore(btn, anchor);
}

async function versionUpdate() {
  log('start versionUpdate');
  const stats = await updateLocalStorageStats();
  // update version.
  stats.version = getVersion();
  await saveStats(stats);
  log('stats updated.', stats);
}

/*
 * [CTL Analysis - P01]
 * 제출 감지 방식: 제출 버튼 클릭 이벤트를 붙인 뒤 결과 모달 DOM을 폴링한다.
 * 결과 판별 위치: getSolvedResultInfo()가 모달/결과 테이블 텍스트를 수집하고 normalizeProgrammersResult()가 CTL_RESULT로 정규화한다.
 * 정답/오답 분기: beginUpload()가 CTL_RESULT를 uploadOneSolveProblemOnGit()에 전달한다.
 *
 * 발견한 버그:
 *   - BUG-1: 기존 startLoader()는 '정답'/'틀렸습니다'만 확인해 시간초과/런타임/컴파일 에러 제출을 놓쳤다.
 *   - BUG-2: 제출 버튼 클릭 때 uploadState.uploading을 강제로 false로 바꿔 진행 중인 커밋과 다음 제출이 충돌할 수 있었다.
 *
 * 기존 스토리지 키 목록: (마이그레이션 대상)
 *   - 'stats' → ctl_stats
 *   - 'bjhEnable' → ctl_is_enabled
 *   - 'BaekjoonHub_hook' → ctl_github_repo
 *   - 'BaekjoonHub_token' → ctl_github_token
 */

// Set to true to enable console log
const debug = false;

/* 
  문제 제출 맞음 여부를 확인하는 함수
  2초마다 문제를 파싱하여 확인
*/
let loader;
let pendingProcessTimer = null;
let submitBaselineSignature = '';
let submitStartedAt = 0;
let sawResultClearAfterSubmit = true;

const currentUrl = window.location.href;

// 프로그래머스 연습 문제 주소임을 확인하고, 맞다면 로더를 실행
if (currentUrl.includes('/learn/courses/30') && currentUrl.includes('lessons')) {
  attachRunCodeListener();
  attachSubmitListener();
}

if (currentUrl.includes('/learn/challenges')) {
  (async () => {
    const enable = await checkEnable();
    if (!enable) return;
    const stats = await getStats();
    if (isNull(stats)) return;
    if (stats.version !== getVersion()) {
      await versionUpdate();
    }
    // SPA이므로 div.total이 렌더링될 때까지 대기
    const waitForElement = (selector, timeout = 10000) => new Promise((resolve) => {
      const el = document.querySelector(selector);
      if (el) return resolve(el);
      const observer = new MutationObserver(() => {
        const el = document.querySelector(selector);
        if (el) { observer.disconnect(); resolve(el); }
      });
      observer.observe(document.body, { childList: true, subtree: true });
      setTimeout(() => { observer.disconnect(); resolve(null); }, timeout);
    });
    await waitForElement('div.total div.bookmark');
    insertUploadAllButton();
  })();
}

function startLoader() {
  stopLoader();
  SubmissionState.transition(SubmissionState.STATE.WAITING);

  loader = setInterval(async () => {
    // 기능 Off시 작동하지 않도록 함
    const enable = await checkEnable();
    if (!enable) {
      stopLoader();
      return;
    }

    const solvedResult = getSolvedResultInfo();
    if (!solvedResult) {
      sawResultClearAfterSubmit = true;
      return;
    }

    const isBaselineResult = solvedResult.signature === submitBaselineSignature;
    if (!sawResultClearAfterSubmit && isBaselineResult && Date.now() - submitStartedAt < 10000) {
      return;
    }

    const result = normalizeProgrammersResult(solvedResult.rawResult);
    if (result) {
      log(`[CTL] ${result} 결과 감지. 업로드를 시작합니다.`, solvedResult.rawResult);
      stopLoader();
      try {
        await handleProgrammersResult(solvedResult.rawResult, solvedResult.signature);
      } catch (error) {
        log(error);
      }
    }
  }, 2000);
}

function stopLoader() {
  clearInterval(loader);
  loader = null;
}

/**
 * '제출 후 채점하기' 버튼(#submit-code) 클릭 시 로더를 시작합니다.
 * 버튼이 아직 렌더링 안 됐을 수 있으므로 MutationObserver로 대기합니다.
 */
function attachSubmitListener() {
  const tryAttach = () => {
    const submitBtn = document.querySelector('button#submit-code');
    if (submitBtn && !submitBtn.dataset.bjhSubmitAttached) {
      submitBtn.dataset.bjhSubmitAttached = 'true';
      submitBtn.addEventListener('click', async () => {
        const enable = await checkEnable();
        if (!enable) return;
        log('제출 버튼 클릭 - 채점 결과 감지 시작');
        const baseline = getSolvedResultInfo();
        submitBaselineSignature = baseline ? baseline.signature : '';
        submitStartedAt = Date.now();
        sawResultClearAfterSubmit = !baseline;
        SubmissionState.transition(SubmissionState.STATE.SUBMITTED);
        startLoader();
      });
      log('제출 버튼 리스너 등록 완료');
    }
  };

  tryAttach();
  const observer = new MutationObserver(tryAttach);
  observer.observe(document.body, { childList: true, subtree: true });
}

/**
 * '코드 실행' 버튼(#run-code) 클릭 시 현재 코드를 커밋합니다.
 * 버튼이 아직 렌더링 안 됐을 수 있으므로 MutationObserver로 대기합니다.
 */
function attachRunCodeListener() {
  const tryAttach = () => {
    const runBtn = document.querySelector('button#run-code');
    if (runBtn && !runBtn.dataset.bjhAttached) {
      runBtn.dataset.bjhAttached = 'true';
      runBtn.addEventListener('click', async () => {
        const enable = await checkEnable();
        if (!enable) return;
        log('코드 실행 버튼 클릭 - 코드 커밋 시작');
        try {
          const bojData = await parseData();
          if (isNull(bojData)) return;
          // 코드 실행은 정답/오답 구분 없이 '실행' 타입으로 커밋
          await enqueueOrUpload(bojData, CTL_RESULT.RUN, `run:${Date.now()}`);
        } catch (error) {
          log('코드 실행 커밋 오류:', error);
        }
      });
      log('코드 실행 버튼 리스너 등록 완료');
    }
  };

  // 즉시 시도 후, 없으면 DOM 변화 감지
  tryAttach();
  const observer = new MutationObserver(tryAttach);
  observer.observe(document.body, { childList: true, subtree: true });
}

function isVisibleElement(el) {
  if (!el) return false;
  const style = window.getComputedStyle(el);
  return style.display !== 'none'
    && style.visibility !== 'hidden'
    && style.opacity !== '0'
    && el.getClientRects().length > 0;
}

function getSolvedResultInfo() {
  const candidates = [
    ...document.querySelectorAll('div.modal-header > h4, #modal-dialog h4, .modal-header h4, [class*="modal"] h4'),
    ...document.querySelectorAll('#output .console-message, td.result, .testcase-result'),
  ];

  const texts = candidates
    .filter(isVisibleElement)
    .map((node) => node.innerText || node.textContent || '')
    .map((text) => text.replace(/\s+/g, ' ').trim())
    .filter((text) => normalizeProgrammersResult(text));

  if (texts.length === 0) return null;

  const rawResult = texts.join(' | ');
  const codeLength = (document.querySelector('textarea#code') || {}).value?.length || 0;
  return {
    rawResult,
    signature: `${rawResult}:${codeLength}`,
  };
}

async function handleProgrammersResult(rawResult, signature) {
  const result = normalizeProgrammersResult(rawResult);
  if (!result) return;

  SubmissionState.transition(SubmissionState.STATE.RESULT_READY);
  const bojData = await parseData();
  if (isNull(bojData)) return;

  await enqueueOrUpload(bojData, result, signature);
}

async function enqueueOrUpload(bojData, result, signature) {
  if (!SubmissionState.canCommit(signature)) {
    SubmissionState.enqueue({ bojData, result, signature });
    schedulePendingQueue();
    return;
  }

  await beginUpload(bojData, result, signature);
}

function schedulePendingQueue() {
  clearTimeout(pendingProcessTimer);
  pendingProcessTimer = setTimeout(processPendingQueue, 3100);
}

async function processPendingQueue() {
  if (!SubmissionState.hasPending() || SubmissionState.get() === SubmissionState.STATE.COMMITTING) return;
  const next = SubmissionState.dequeue();
  if (!next) return;
  await enqueueOrUpload(next.bojData, next.result, next.signature);
}

/* 파싱 직후 실행되는 함수
 * result: CTL_RESULT 문자열
 */
async function beginUpload(bojData, result = CTL_RESULT.CORRECT, signature = '') {
  if (uploadState.uploading) return;
  uploadState.uploading = true;
  SubmissionState.markCommitStart(signature);
  log('bojData', bojData, 'result', result);

  startUpload();

  /* 항상 새로 커밋 */
  try {
    const hook = await getHook();
    if (isNull(hook)) throw new Error('GitHub repository hook is missing.');

    const stats = await getStats();
    const currentVersion = stats.version;
    if (isNull(currentVersion) || currentVersion !== getVersion() || isNull(await getStatsSHAfromPath(hook))) {
      await versionUpdate();
    }

    await uploadOneSolveProblemOnGit(bojData, result, markUploadedCSS);
    console.log(`[CTL] 커밋 완료: ${bojData.directory}/${bojData.fileName}`);
  } catch (error) {
    markUploadFailedCSS();
    console.error('[CTL] 커밋 실패:', error);
  } finally {
    uploadState.uploading = false;
    SubmissionState.markCommitEnd();
    schedulePendingQueue();
  }
}

async function versionUpdate() {
  log('start versionUpdate');
  const stats = await updateLocalStorageStats();
  // update version.
  stats.version = getVersion();
  await saveStats(stats);
  log('stats updated.', stats);
}

// /* TODO: 하나의 데이터만 가져오는 구조이므로 page를 계속적으로
//   아래 있는 네이베이션바의 "다음"버튼이 비활성화 될때까지 반복으로 진행한다.
//   진행하며 존재하는 알고리즘 카드인 div.col-item > div.card-algorithm > a 의 href 속성값을 가져와 리스트화하고,
//   이를 차후 fetch GET를 진행하여 작성한 알고리즘을 가져와 github에 업로드를 진행한다.
//   */
// function get_all_problems() {}

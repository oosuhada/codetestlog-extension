// Set to true to enable console log
const debug = false;

/* 
  문제 제출 맞음 여부를 확인하는 함수
  2초마다 문제를 파싱하여 확인
*/
let loader;

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
  loader = setInterval(async () => {
    // 기능 Off시 작동하지 않도록 함
    const enable = await checkEnable();
    if (!enable) stopLoader();

    const solvedResult = getSolvedResult();
    if (!solvedResult) return;

    const isPassed = solvedResult.includes('정답');
    const isFailed = solvedResult.includes('틀렸습니다');

    if (isPassed || isFailed) {
      log(isPassed ? '정답입니다. 업로드를 시작합니다.' : '오답입니다. 오답 업로드를 시작합니다.');
      stopLoader();
      try {
        const bojData = await parseData();
        if (isNull(bojData)) return;
        await beginUpload(bojData, isPassed);
      } catch (error) {
        log(error);
      }
    }
  }, 2000);
}

function stopLoader() {
  clearInterval(loader);
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
        // 코드 실행 커밋이 진행 중이더라도 제출은 별도로 처리하기 위해 상태 초기화
        uploadState.uploading = false;
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
          await beginUpload(bojData, null);
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

function getSolvedResult() {
  const result = document.querySelector('div.modal-header > h4')
    || document.querySelector('#modal-dialog h4')
    || document.querySelector('.modal-header h4')
    || document.querySelector('[class*="modal"] h4');
  if (result) return result.innerText;
  return '';
}

/* 파싱 직후 실행되는 함수
 * isPassed: true = 정답, false = 오답(틀렸습니다), null = 코드 실행
 */
async function beginUpload(bojData, isPassed = true) {
  if (uploadState.uploading) return;
  uploadState.uploading = true;
  log('bojData', bojData, 'isPassed', isPassed);

  startUpload();

  const stats = await getStats();
  const hook = await getHook();
  const token = await getToken();

  const currentVersion = stats.version;
  if (isNull(currentVersion) || currentVersion !== getVersion() || isNull(await getStatsSHAfromPath(hook))) {
    await versionUpdate();
  }

  /* 항상 새로 커밋 */
  await uploadOneSolveProblemOnGit(bojData, isPassed, markUploadedCSS);
  uploadState.uploading = false;
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
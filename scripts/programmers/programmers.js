// Set to true to enable console log
const debug = false;

/* 
  문제 제출 맞음 여부를 확인하는 함수
  2초마다 문제를 파싱하여 확인
*/
let loader;

const currentUrl = window.location.href;

// 프로그래머스 연습 문제 주소임을 확인하고, 맞다면 로더를 실행
if (currentUrl.includes('/learn/courses/30') && currentUrl.includes('lessons')) startLoader();

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

    // ✅ 정답인 경우
    if (solvedResult.includes('정답')) {
      log('정답이 나왔습니다. 업로드를 시작합니다.');
      stopLoader();
      try {
        const bojData = await parseData();
        await beginUpload(bojData, true); // isPassed = true
      } catch (error) {
        log(error);
      }
    }
    // ❌ 오답인 경우 (실패 / 오답 / 런타임 에러 / 시간 초과 등)
    else if (
      solvedResult.includes('실패') ||
      solvedResult.includes('오답') ||
      solvedResult.includes('런타임') ||
      solvedResult.includes('시간 초과') ||
      solvedResult.includes('컴파일')
    ) {
      log('오답이 나왔습니다. 오답 업로드를 시작합니다.');
      stopLoader();
      try {
        const bojData = await parseData();
        await beginUpload(bojData, false); // isPassed = false
      } catch (error) {
        log(error);
      }
    }
  }, 2000);
}

function stopLoader() {
  clearInterval(loader);
}

function getSolvedResult() {
  const result = document.querySelector('div.modal-header > h4')
    || document.querySelector('#modal-dialog h4')
    || document.querySelector('.modal-header h4')
    || document.querySelector('[class*="modal"] h4');
  if (result) return result.innerText;
  return '';
}

/* 파싱 직후 실행되는 함수 */
async function beginUpload(bojData, isPassed = true) {
  log('bojData', bojData, 'isPassed', isPassed);
  if (isNotEmpty(bojData)) {
    startUpload();

    const stats = await getStats();
    const hook = await getHook();
    const token = await getToken();

    const currentVersion = stats.version;
    /* 버전 차이가 발생하거나, 해당 hook에 대한 데이터가 없는 경우 localstorage의 Stats 값을 업데이트하고, version을 최신으로 변경한다 */
    if (isNull(currentVersion) || currentVersion !== getVersion() || isNull(await getStatsSHAfromPath(hook))) {
      await versionUpdate();
    }

    /* ✅ 정답인 경우에만 중복 업로드 체크 (오답은 항상 새로 커밋) */
    if (isPassed) {
      const cachedSHA = await getStatsSHAfromPath(`${hook}/${bojData.directory}/${bojData.fileName}`);
      const calcSHA = calculateBlobSHA(bojData.code);
      log('cachedSHA', cachedSHA, 'calcSHA', calcSHA);

      if (isNull(cachedSHA)) {
        const remoteFile = await getFile(hook, token, `${bojData.directory}/${bojData.fileName}`);
        if (remoteFile && remoteFile.sha === calcSHA) {
          markUploadedCSS(stats.branches, bojData.directory);
          console.log('원격 저장소에 동일한 파일이 존재하여 업로드를 건너뜁니다.');
          return;
        }
        console.log('캐시된 SHA가 없습니다. 새로 업로드합니다.');
      } else if (cachedSHA == calcSHA) {
        markUploadedCSS(stats.branches, bojData.directory);
        console.log(`현재 제출번호를 업로드한 기록이 있습니다. problemId ${bojData.problemId}`);
        return;
      }
    }

    /* 신규 제출이거나 오답이라면 커밋 */
    await uploadOneSolveProblemOnGit(bojData, isPassed, markUploadedCSS);
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

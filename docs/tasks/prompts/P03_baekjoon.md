# [P03] Phase 3: 백준(BOJ) 커밋 로직 강화

## 전제 조건
P01 완료 상태. `buildFileName`, `buildCommitPath`, `buildCommitMessage`, `incrementAttemptCount` 사용 가능.

## 작업 목표
백준에서도 **모든 제출 시도**를 커밋. P01과 동일한 CTL 규칙 + 동일한 버그 수정.

---

## 작업 1: 기존 백준 코드 분석 (필수)

```bash
cat scripts/baekjoon/baekjoon.js
cat scripts/baekjoon/uploadfunctions.js
cat scripts/baekjoon/parsing.js
cat scripts/baekjoon/variables.js
```

분석 블록을 각 파일 상단에 추가:

```javascript
/*
 * [CTL Analysis - P03]
 * 제출 감지 방식: (URL 변화 감지 / DOM 폴링 / MutationObserver)
 * 결과 판별 URL: (acmicpc.net/status 등)
 * 결과 판별 DOM 선택자: (실제 선택자 기재)
 * 정답/오답 분기 위치: (함수명:줄번호)
 * 티어 정보 취득 방법: (solved.ac API / DOM / 없음)
 *
 * P01과의 차이점:
 *   - (백준 특유의 감지 방식)
 *
 * 발견한 버그:
 *   - BUG-1:
 */
```

---

## 작업 2: 결과 타입 상수 (variables.js)

`scripts/baekjoon/variables.js` 에 추가:

```javascript
// ─── CTL: 백준 결과 매핑 ──────────────────────────────────────────────────────
const BOJ_RESULT_MAP = {
  '맞았습니다!!':   'correct',
  '틀렸습니다':     'wrong',
  '시간 초과':      'timeout',
  '메모리 초과':    'memory_exceeded',
  '런타임 에러':    'runtime_error',
  '컴파일 에러':    'compile_error',
  '출력 초과':      'wrong',        // CTL에는 wrong으로 통합
  '부분 점수':      'partial',
  // 위 목록에 없는 값은 'wrong'으로 fallback
};
// ─────────────────────────────────────────────────────────────────────────────
```

---

## 작업 3: 티어 파싱 (parsing.js)

티어 추출 우선순위:
1. solved.ac API (`https://solved.ac/api/v3/problem/show?problemId={id}`)
2. DOM 파싱 (solved.ac 배지가 페이지에 있는 경우)
3. 둘 다 실패 → `"unrated"` (절대 undefined/null 반환 금지)

```javascript
// 티어 레벨 인덱스 → 이름 매핑
const SOLVED_AC_TIER = [
  'unrated',                                      // 0
  'bronze','bronze','bronze','bronze','bronze',    // 1-5
  'silver','silver','silver','silver','silver',    // 6-10
  'gold','gold','gold','gold','gold',              // 11-15
  'platinum','platinum','platinum','platinum','platinum', // 16-20
  'diamond','diamond','diamond','diamond','diamond',     // 21-25
  'ruby','ruby','ruby','ruby','ruby',              // 26-30
];

/**
 * 백준 문제 티어 반환
 * @param {string} problemId
 * @returns {Promise<string>} 'bronze'|'silver'|'gold'|'platinum'|'diamond'|'ruby'|'unrated'
 */
async function parseBojTier(problemId) {
  // 1차: solved.ac API
  try {
    const res = await fetch(
      `https://solved.ac/api/v3/problem/show?problemId=${problemId}`,
      { signal: AbortSignal.timeout(3000) }  // 3초 타임아웃
    );
    if (res.ok) {
      const data = await res.json();
      return SOLVED_AC_TIER[data.level] || 'unrated';
    }
  } catch (_) {
    console.warn('[ALG] solved.ac API 실패, DOM fallback 시도');
  }

  // 2차: DOM에서 solved.ac 배지 파싱
  try {
    const tierImg = document.querySelector('img[src*="tier"]');
    if (tierImg) {
      const src = tierImg.src;
      const match = src.match(/tier\/(\d+)/);
      if (match) return SOLVED_AC_TIER[parseInt(match[1])] || 'unrated';
    }
  } catch (_) {}

  return 'unrated';
}
```

---

## 작업 4: 연속 제출 버그 수정

백준은 `/status` 페이지를 폴링하는 구조라 프로그래머스와 버그 패턴이 다를 수 있음.
기존 폴링 로직을 분석 후 P01의 `SubmissionState` 상태 머신을 동일하게 적용.

주의사항:
- 백준의 채점 대기 상태("채점 중", "채점 준비 중")는 `WAITING` 상태로 처리
- 최종 결과가 나올 때만 `handleBojResult()` 호출

```javascript
async function handleBojResult(rawResult, code, problemId, title) {
  const ctlResult    = BOJ_RESULT_MAP[rawResult] ?? 'wrong';
  const tier         = await parseBojTier(problemId);
  const lang         = detectBojLanguage();     // 기존 함수 활용
  const ext          = langToExt(lang);
  const attemptCount = await incrementAttemptCount('baekjoon', problemId);

  const fileName   = buildFileName(ctlResult, title, ext);
  const commitPath = buildCommitPath('백준', tier, problemId, title);
  const commitMsg  = buildCommitMessage({
    result: ctlResult, site: '백준',
    level: tier, title, lang, attemptCount
  });

  SubmissionState.markCommitStart();
  try {
    await uploadToGitHub(commitPath, fileName, code, commitMsg);
    chrome.runtime.sendMessage({
      type: 'CTL_COMMIT_EVENT',
      payload: {
        result: ctlResult, problemId,
        problemName: title, site: '백준',
        fileName, commitPath, success: true,
      },
    });
    console.log(`[ALG] 백준 커밋 완료: ${commitPath}/${fileName}`);
  } catch (err) {
    console.error('[ALG] 백준 커밋 실패:', err);
  } finally {
    SubmissionState.markCommitEnd();
  }
}
```

---

## 작업 5: langToExt (baekjoon/variables.js)

P01에서 공통 함수로 작성했다면 import해서 사용. 없으면 동일하게 추가:

```javascript
const LANG_EXT_MAP = {
  'Python 3': 'py', 'PyPy3': 'py', 'Python 2': 'py', 'PyPy2': 'py',
  'Java 11': 'java', 'Java 8': 'java', 'Java 8 (OpenJDK)': 'java',
  'C++17': 'cpp', 'C++14': 'cpp', 'C++11': 'cpp', 'C++': 'cpp',
  'C': 'c', 'C11': 'c',
  'JavaScript (Node.js)': 'js',
  'TypeScript': 'ts',
  'Kotlin (JVM)': 'kt',
  'Swift': 'swift', 'Go': 'go', 'Rust': 'rs', 'Ruby': 'rb',
};
function langToExt(lang) {
  return LANG_EXT_MAP[lang] || 'txt';
}
```

---

## 완료 기준
- [ ] 백준에서 **오답 제출** 시 GitHub 커밋 발생 확인
- [ ] 커밋 경로가 `/백준/silver/1000. A+B/` 형식 (숫자 단독 폴더 없음)
- [ ] 채점 중 → 오답 → 즉시 재제출 시 두 번째 제출도 커밋 확인 (연속 제출 버그 수정)
- [ ] solved.ac API 실패 시 `unrated` fallback 동작 확인
- [ ] Side Panel에 백준 커밋 이벤트 반영 확인 (P02 완료된 경우)
- [ ] `ctl_attempt_baekjoon_{problemId}` 키 저장 확인

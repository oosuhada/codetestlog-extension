# [P01] Phase 1: 커밋 엔진 완전 재작성

## 전제 조건
P00 완료 상태. `manifest.json` name = `"Algolog"`.

## 작업 목표
**이 Phase가 Algolog의 핵심.** 이전 백업 도구의 커밋 로직을 완전히 신뢰할 수 있게 재작성.

### 해결해야 할 핵심 버그 (작업 시작 전 반드시 재현 확인)
1. **오답 제출 미기록**: 정답만 커밋, 오답 시도는 버려짐
2. **연속 제출 미인식**: `wrong` 판정 직후 곧바로 정답 제출하면 정답을 감지 못함
3. **폴더 구조 오염**: `/0/` 같은 의미없는 숫자 단독 폴더 생성
4. **중복 커밋**: 같은 제출을 두 번 커밋하는 경우

---

## 작업 1: 기존 코드 완전 분석 (수정 전 필수)

아래 파일들을 전부 읽고 분석 블록을 각 파일 상단에 추가:

```bash
# 읽어야 할 파일 목록
cat scripts/programmers/programmers.js
cat scripts/programmers/uploadfunctions.js
cat scripts/programmers/parsing.js
cat scripts/programmers/variables.js
```

각 파일 상단에 분석 블록 추가:
```javascript
/*
 * [CTL Analysis - P01]
 * 제출 감지 방식: (DOM 폴링 / fetch 인터셉트 / 버튼 클릭 이벤트 / MutationObserver)
 * 결과 판별 위치: (파일명:줄번호)
 * 정답/오답 분기: (if 조건 또는 함수명 기재)
 *
 * 발견한 버그:
 *   - BUG-1: (설명)
 *   - BUG-2: (설명)
 *
 * 기존 스토리지 키 목록: (마이그레이션 대상)
 *   - 'key_name' → ctl_xxx 로 변경 예정
 */
```

---

## 작업 2: 결과 타입 상수 정의 (variables.js)

`scripts/programmers/variables.js` 상단에 추가:

```javascript
// ─── CTL: 제출 결과 타입 ──────────────────────────────────────────────────────
const CTL_RESULT = {
  CORRECT:        'correct',
  WRONG:          'wrong',
  TIMEOUT:        'timeout',
  RUNTIME_ERROR:  'runtime_error',
  COMPILE_ERROR:  'compile_error',
  MEMORY_EXCEEDED:'memory_exceeded',
  PARTIAL:        'partial',
};

// 프로그래머스 DOM 텍스트 → CTL_RESULT 매핑
const PROGRAMMERS_RESULT_MAP = {
  '통과':       CTL_RESULT.CORRECT,
  '실패':       CTL_RESULT.WRONG,
  '시간 초과':  CTL_RESULT.TIMEOUT,
  '런타임 에러':CTL_RESULT.RUNTIME_ERROR,
  '컴파일 에러':CTL_RESULT.COMPILE_ERROR,
};

// 정답 여부 판별
const isCorrectResult = (result) => result === CTL_RESULT.CORRECT;
// ─────────────────────────────────────────────────────────────────────────────
```

---

## 작업 3: 연속 제출 버그 수정 — 제출 상태 머신 도입

기존 코드는 단순한 if/else로 결과를 판별하는데, 이게 연속 제출 시 race condition을 만든다.
아래 상태 머신으로 교체:

```javascript
// scripts/programmers/submission_state.js (신규 파일)

/**
 * 프로그래머스 제출 상태 머신
 *
 * 상태 전환:
 *   IDLE → SUBMITTED (제출 버튼 클릭 감지)
 *   SUBMITTED → WAITING (결과 DOM 나타남)
 *   WAITING → RESULT_READY (결과 텍스트 파싱 완료)
 *   RESULT_READY → COMMITTING (GitHub 업로드 시작)
 *   COMMITTING → IDLE (업로드 완료)
 *
 * 핵심: COMMITTING 상태일 때 새 제출을 감지해도 큐에 쌓고 대기.
 */

const SubmissionState = (() => {
  const STATE = {
    IDLE:         'IDLE',
    SUBMITTED:    'SUBMITTED',
    WAITING:      'WAITING',
    RESULT_READY: 'RESULT_READY',
    COMMITTING:   'COMMITTING',
  };

  let current = STATE.IDLE;
  let pendingQueue = [];
  let lastCommitTime = 0;
  const COMMIT_COOLDOWN_MS = 3000; // 연속 제출 간 최소 간격

  return {
    STATE,
    get() { return current; },
    transition(next) {
      console.log(`[ALG] State: ${current} → ${next}`);
      current = next;
    },
    canCommit() {
      return current !== STATE.COMMITTING &&
             Date.now() - lastCommitTime > COMMIT_COOLDOWN_MS;
    },
    markCommitStart() {
      lastCommitTime = Date.now();
      current = STATE.COMMITTING;
    },
    markCommitEnd() {
      current = STATE.IDLE;
    },
  };
})();
```

---

## 작업 4: 레벨 파싱 개선 (parsing.js)

기존 레벨 추출 함수를 찾아 아래 기준으로 교체:

```javascript
/**
 * 프로그래머스 문제 레벨 파싱
 * 반환: "lv0"~"lv5" 또는 "lv?" (실패 시)
 * 절대 undefined, null, 빈 문자열 반환 금지
 */
function parseProgrammersLevel() {
  // 1차: DOM에서 레벨 배지 파싱
  try {
    const badge = document.querySelector('.level-badge, [class*="level"]');
    if (badge) {
      const text = badge.textContent.trim();
      const match = text.match(/Lv\.?\s*(\d)/i);
      if (match) return `lv${match[1]}`;
    }
  } catch (_) {}

  // 2차: 페이지 타이틀에서 파싱
  try {
    const title = document.title;
    const match = title.match(/Lv\.?\s*(\d)/i);
    if (match) return `lv${match[1]}`;
  } catch (_) {}

  // fallback
  return 'lv?';
}
```

---

## 작업 5: 시도 횟수 추적 (uploadfunctions.js)

```javascript
/**
 * 시도 횟수 1 증가 후 반환
 * @returns {Promise<number>} 이번이 몇 번째 시도인지
 */
async function incrementAttemptCount(site, problemId) {
  const key = CTL_STORAGE_KEYS.attemptCount(site, problemId);
  return new Promise((resolve) => {
    chrome.storage.local.get([key], (result) => {
      const next = (result[key] || 0) + 1;
      chrome.storage.local.set({ [key]: next }, () => resolve(next));
    });
  });
}

/**
 * 현재 시도 횟수 조회 (증가 없이)
 */
async function getAttemptCount(site, problemId) {
  const key = CTL_STORAGE_KEYS.attemptCount(site, problemId);
  return new Promise((resolve) => {
    chrome.storage.local.get([key], (result) => resolve(result[key] || 0));
  });
}
```

---

## 작업 6: 파일명 생성 함수

기존 파일명 생성 로직을 아래 함수로 교체:

```javascript
/**
 * Algolog 규칙 파일명 생성
 * 반환 예: "20260501_143022_correct_기능개발.py"
 */
function buildFileName(result, title, ext) {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const ts = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}` +
             `_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const safeTitle = title.replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '_');
  return `${ts}_${result}_${safeTitle}.${ext}`;
}

/**
 * GitHub 커밋 경로 생성
 * 반환 예: "프로그래머스/lv2/42586. 기능개발"
 */
function buildCommitPath(site, level, problemId, title) {
  // problemId 또는 title이 비어있는 경우 방어
  const safeProblemId = problemId || 'unknown';
  const safeTitle     = title     || 'unknown';
  return `${site}/${level}/${safeProblemId}. ${safeTitle}`;
}

/**
 * 커밋 메시지 생성
 * 반환 예: "[ALG] correct | 프로그래머스 | lv2 | 기능개발 | Python | 3번째 시도"
 */
function buildCommitMessage({ result, site, level, title, lang, attemptCount }) {
  return `[ALG] ${result} | ${site} | ${level} | ${title} | ${lang} | ${attemptCount}번째 시도`;
}
```

---

## 작업 7: 언어 확장자 매핑

```javascript
const LANG_EXT_MAP = {
  'Python':     'py',
  'Python3':    'py',
  'Java':       'java',
  'C++':        'cpp',
  'C':          'c',
  'JavaScript': 'js',
  'TypeScript': 'ts',
  'Kotlin':     'kt',
  'Swift':      'swift',
  'Go':         'go',
  'Rust':       'rs',
  'Ruby':       'rb',
};

function langToExt(lang) {
  return LANG_EXT_MAP[lang] || 'txt';
}
```

---

## 작업 8: 모든 제출 시 커밋 — 기존 트리거 수정

`programmers.js` (또는 uploadfunctions.js)에서 정답 전용 분기를 제거하고 아래 패턴으로 교체:

```javascript
// ── 기존 코드 (예시 형태, 실제 코드에 맞게 찾아서 수정) ──
// if (result === 'success' || result === '통과') {
//   uploadToGitHub(...);
// }

// ── 변경 후 ──
async function handleProgrammersResult(rawResult, code) {
  // 1. 결과 정규화
  const ctlResult = PROGRAMMERS_RESULT_MAP[rawResult] ?? CTL_RESULT.WRONG;

  // 2. 상태 머신: 커밋 가능 여부 체크 (연속 제출 버그 방지)
  if (!SubmissionState.canCommit()) {
    console.warn('[ALG] 커밋 쿨다운 중. 스킵.');
    return;
  }

  // 3. 메타데이터 수집
  const problemId    = parseProgrammersProblemId();   // 기존 함수 활용
  const title        = parseProgrammersTitle();        // 기존 함수 활용
  const level        = parseProgrammersLevel();        // 작업 4에서 개선한 함수
  const lang         = parseProgrammersLanguage();     // 기존 함수 활용
  const ext          = langToExt(lang);
  const attemptCount = await incrementAttemptCount('programmers', problemId);

  // 4. 경로/메시지 생성
  const fileName   = buildFileName(ctlResult, title, ext);
  const commitPath = buildCommitPath('프로그래머스', level, problemId, title);
  const commitMsg  = buildCommitMessage({
    result: ctlResult, site: '프로그래머스',
    level, title, lang, attemptCount
  });

  // 5. 커밋
  SubmissionState.markCommitStart();
  try {
    await uploadToGitHub(commitPath, fileName, code, commitMsg);
    // P02 Side Panel에 결과 전달 (P02 작업 후 활성화)
    // notifySidePanel({ result: ctlResult, fileName, commitPath, attemptCount });
    console.log(`[ALG] 커밋 완료: ${commitPath}/${fileName}`);
  } catch (err) {
    console.error('[ALG] 커밋 실패:', err);
  } finally {
    SubmissionState.markCommitEnd();
  }
}
```

---

## 작업 9: 기존 스토리지 키 마이그레이션

작업 1에서 메모한 기존 하드코딩 키들을 `CTL_STORAGE_KEYS`로 교체.
마이그레이션 예시:
```javascript
// 기존
chrome.storage.local.get(['이전 백업 도구_token'], ...)

// 변경 후
chrome.storage.local.get([CTL_STORAGE_KEYS.githubToken], ...)
```

기존 키로 저장된 데이터가 날아가지 않도록, 마이그레이션 함수 추가:
```javascript
// 최초 실행 시 구 키 → 신 키 마이그레이션
async function migrateLegacyStorageKeys() {
  const LEGACY_KEY_MAP = {
    '이전 백업 도구_token': CTL_STORAGE_KEYS.githubToken,
    '이전 백업 도구_repo':  CTL_STORAGE_KEYS.githubRepo,
    // 작업 1에서 발견한 키 추가
  };

  for (const [oldKey, newKey] of Object.entries(LEGACY_KEY_MAP)) {
    await new Promise((resolve) => {
      chrome.storage.local.get([oldKey], (result) => {
        if (result[oldKey] !== undefined) {
          chrome.storage.local.set({ [newKey]: result[oldKey] }, () => {
            chrome.storage.local.remove(oldKey, resolve);
          });
        } else {
          resolve();
        }
      });
    });
  }
  console.log('[ALG] 스토리지 마이그레이션 완료');
}
```

---

## 완료 기준
- [ ] 프로그래머스에서 **오답 제출** 시 GitHub 커밋 발생 확인
- [ ] `wrong` 제출 직후 즉시 정답 제출해도 **정답 커밋도 발생** 확인 (연속 제출 버그 수정)
- [ ] 커밋 경로가 `/프로그래머스/lv2/42586. 기능개발/` 형식 (숫자 단독 폴더 없음)
- [ ] 파일명에 타임스탬프 + result 포함 확인
- [ ] 같은 문제 3번 시도 시 커밋 메시지에 `3번째 시도` 반영 확인
- [ ] 중복 커밋 없음 (쿨다운 동작 확인)
- [ ] `chrome.storage.local`에 `ctl_attempt_programmers_{id}` 키 존재 확인
- [ ] 기존 GitHub 토큰/레포 설정이 마이그레이션 후에도 정상 인식

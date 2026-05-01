# [P04] Phase 4: 범용 사이트 어댑터 구조 + SWEA / LeetCode

## 전제 조건
P01, P03 완료. `buildFileName`, `buildCommitPath`, `buildCommitMessage`, `incrementAttemptCount` 동작 확인됨.

## 작업 목표
새 코딩테스트 사이트를 추가할 때 **어댑터 파일 하나만** 만들면 되는 플러그인 구조 도입.
SWEA(기존 코드 정비) + LeetCode(신규) 적용.

---

## 작업 1: 기존 사이트 코드 현황 파악

```bash
# 기존 파일 구조 확인
tree scripts/ -L 2

# SWEA 기존 코드가 있으면 읽기
cat scripts/swexpertacademy/*.js 2>/dev/null || echo "SWEA 파일 없음"
```

---

## 작업 2: 공통 어댑터 인터페이스 (scripts/core/site_adapter.js)

```bash
mkdir -p scripts/core
```

```javascript
// scripts/core/site_adapter.js

/**
 * Algolog 사이트 어댑터 레지스트리
 *
 * 새 사이트 추가 방법:
 * 1. scripts/{사이트명}/adapter.js 생성
 * 2. SiteAdapterRegistry.register('사이트키', adapter) 호출
 * 3. manifest.json content_scripts에 도메인 추가
 */

/**
 * @typedef {Object} SubmissionResult
 * @property {string} problemId     - 문제 고유 ID
 * @property {string} title         - 문제명
 * @property {string} level         - 레벨/티어 (예: "lv2", "silver", "medium")
 * @property {string} result        - CTL_RESULT 값
 * @property {string} code          - 제출 코드
 * @property {string} language      - 언어명
 * @property {string} siteLabel     - GitHub 폴더 최상위 이름
 * @property {string} siteKey       - 어댑터 키 (attemptCount용)
 */

const SiteAdapterRegistry = (() => {
  const _adapters = {};
  return {
    /**
     * @param {string} siteKey
     * @param {{ isActive: () => boolean, detect: () => Promise<SubmissionResult|null> }} adapter
     */
    register(siteKey, adapter) {
      _adapters[siteKey] = adapter;
      console.log(`[ALG] Adapter registered: ${siteKey}`);
    },
    getAll() { return Object.entries(_adapters); },
    getActive() {
      return Object.entries(_adapters).find(([, a]) => a.isActive());
    },
  };
})();
```

---

## 작업 3: 공통 커밋 핸들러 (scripts/core/commit_handler.js)

```javascript
// scripts/core/commit_handler.js

/**
 * 어댑터의 detect() 결과를 받아 GitHub 커밋 + Side Panel 알림 수행
 */
async function handleSubmission(submission) {
  if (!submission) return;
  const { problemId, title, level, result, code, language, siteLabel, siteKey } = submission;

  if (!SubmissionState.canCommit()) {
    console.warn('[ALG] 쿨다운 중 스킵:', siteKey, problemId);
    return;
  }

  const ext          = langToExt(language);
  const attemptCount = await incrementAttemptCount(siteKey, problemId);
  const fileName     = buildFileName(result, title, ext);
  const commitPath   = buildCommitPath(siteLabel, level, problemId, title);
  const commitMsg    = buildCommitMessage({ result, site: siteLabel, level, title, lang: language, attemptCount });

  console.log(`[ALG] 커밋 시작: ${commitPath}/${fileName}`);
  SubmissionState.markCommitStart();

  let success = false;
  try {
    await uploadToGitHub(commitPath, fileName, code, commitMsg);
    success = true;
    console.log(`[ALG] 커밋 완료: ${commitPath}/${fileName}`);
  } catch (err) {
    console.error('[ALG] 커밋 실패:', err);
  } finally {
    SubmissionState.markCommitEnd();
  }

  // Side Panel 알림
  chrome.runtime.sendMessage({
    type: 'CTL_COMMIT_EVENT',
    payload: { result, problemId, problemName: title, site: siteLabel, fileName, commitPath, success },
  }).catch(() => {});
}
```

---

## 작업 4: 프로그래머스/백준 어댑터로 리팩터링

P01, P03에서 작성한 `handleProgrammersResult`, `handleBojResult`의 핵심 로직을 어댑터로 분리.

`scripts/programmers/adapter.js`:
```javascript
SiteAdapterRegistry.register('programmers', {
  isActive() {
    return location.hostname.includes('programmers.co.kr');
  },
  async detect() {
    // 기존 programmers.js의 감지+파싱 로직
    // SubmissionResult 형식으로 반환
    // 결과 없으면 null 반환
  },
});
```

`scripts/baekjoon/adapter.js`:
```javascript
SiteAdapterRegistry.register('baekjoon', {
  isActive() {
    return location.hostname.includes('acmicpc.net');
  },
  async detect() {
    // 기존 baekjoon.js의 감지+파싱 로직
  },
});
```

기존 `programmers.js`, `baekjoon.js`의 직접 커밋 코드는 `handleSubmission(await adapter.detect())`로 교체.

---

## 작업 5: SWEA 어댑터

기존 SWEA 코드가 있으면 분석 후 정비, 없으면 신규 작성.

`scripts/swexpertacademy/adapter.js`:
```javascript
// SWEA 결과 매핑
const SWEA_RESULT_MAP = {
  'Correct Answer':   'correct',
  'Wrong Answer':     'wrong',
  'Time Limit':       'timeout',
  'Memory Limit':     'memory_exceeded',
  'Runtime Error':    'runtime_error',
  'Compile Error':    'compile_error',
};

// SWEA 난이도 (D1~D6)
function parseSweaLevel() {
  try {
    const levelEl = document.querySelector('[class*="difficulty"], [class*="level"]');
    if (levelEl) {
      const match = levelEl.textContent.match(/D(\d)/i);
      if (match) return `d${match[1]}`;
    }
  } catch (_) {}
  return 'd?';
}

SiteAdapterRegistry.register('swea', {
  isActive() {
    return location.hostname.includes('swexpertacademy.com');
  },
  async detect() {
    // SWEA 결과 DOM 파싱 — 실제 DOM 구조 확인 후 구현
    // 반환 형식:
    return {
      problemId:  '',  // 실제 파싱 값
      title:      '',
      level:      parseSweaLevel(),
      result:     '',  // SWEA_RESULT_MAP 적용
      code:       '',
      language:   '',
      siteLabel:  'SWEA',
      siteKey:    'swea',
    };
  },
});
```

`manifest.json`에 SWEA 도메인 추가:
```json
{
  "content_scripts": [
    {
      "matches": ["https://swexpertacademy.com/*"],
      "js": ["scripts/core/site_adapter.js", "scripts/swexpertacademy/adapter.js", ...]
    }
  ]
}
```

---

## 작업 6: LeetCode 어댑터 (신규)

```bash
mkdir -p scripts/leetcode
```

`scripts/leetcode/adapter.js`:
```javascript
const LEETCODE_RESULT_MAP = {
  'Accepted':              'correct',
  'Wrong Answer':          'wrong',
  'Time Limit Exceeded':   'timeout',
  'Memory Limit Exceeded': 'memory_exceeded',
  'Runtime Error':         'runtime_error',
  'Compile Error':         'compile_error',
};

const LEETCODE_LEVEL_MAP = {
  'Easy':   'easy',
  'Medium': 'medium',
  'Hard':   'hard',
};

function parseLeetCodeDifficulty() {
  try {
    // LeetCode의 난이도 배지 DOM 선택자 (실제 DOM 확인 후 조정)
    const el = document.querySelector('[diff], [data-difficulty], .difficulty-badge');
    if (el) {
      const text = el.textContent.trim();
      return LEETCODE_LEVEL_MAP[text] || text.toLowerCase() || 'unknown';
    }
  } catch (_) {}
  return 'unknown';
}

SiteAdapterRegistry.register('leetcode', {
  isActive() {
    return location.hostname.includes('leetcode.com');
  },
  async detect() {
    // LeetCode 제출 결과 감지
    // LeetCode는 fetch 인터셉트 또는 MutationObserver로 결과 감지
    // 실제 DOM/API 구조 확인 후 구현
    return null; // 구현 전 placeholder
  },
});
```

`manifest.json`에 LeetCode 도메인 추가:
```json
{
  "content_scripts": [
    {
      "matches": ["https://leetcode.com/*"],
      "js": ["scripts/core/site_adapter.js", "scripts/leetcode/adapter.js", ...]
    }
  ]
}
```

---

## 완료 기준
- [ ] `scripts/core/site_adapter.js`, `scripts/core/commit_handler.js` 생성됨
- [ ] `scripts/programmers/adapter.js`, `scripts/baekjoon/adapter.js` 생성됨
- [ ] 프로그래머스/백준 기존 기능 회귀 없음 (P01, P03 완료 기준 재확인)
- [ ] SWEA 어댑터 파일 생성됨 (SWEA 계정 없으면 동작 확인 생략 가능)
- [ ] LeetCode 어댑터 파일 생성됨, manifest에 도메인 추가됨
- [ ] 새 사이트 추가 방법이 `site_adapter.js` 주석에 명확히 설명됨

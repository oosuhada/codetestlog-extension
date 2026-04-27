# [P05] Phase 5: Notion 오답노트 (선택 기능)

## 전제 조건
P01 완료 (P04 어댑터 구조 있으면 더 좋음).

## 이 기능의 성격
**선택 기능 (Optional Feature).**
- Notion 미설정 상태에서도 GitHub 커밋은 100% 정상 동작해야 함
- Notion 설정 오류가 GitHub 커밋에 영향을 주면 안 됨
- 코드를 매번 AI로 분석해서 Notion에 쓰는 것이 아님
  → 커밋 메타데이터(문제명, 결과, 언어, 시도횟수 등)만 기록
  → AI 분석은 P07에서 별도로 추가

## 작업 목표
제출 결과가 발생할 때마다 Notion 데이터베이스에 **메타데이터 행** 자동 생성.
코드 전문은 Notion 페이지 본문에 블록으로 추가 (2000자 제한 주의).

---

## Notion DB 스키마 (사용자가 사전 생성)

| 컬럼명 | Notion 타입 | 설명 |
|--------|------------|------|
| 문제명 | Title | 문제 제목 |
| 사이트 | Select | 프로그래머스 / 백준 / SWEA / LeetCode |
| 레벨 | Select | lv2 / silver / hard 등 |
| 결과 | Select | correct / wrong / timeout 등 |
| 언어 | Select | Python / Java 등 |
| 시도횟수 | Number | N번째 시도 |
| 날짜 | Date | 제출 일시 (ISO 8601) |
| 리뷰필요 | Checkbox | result != correct이면 자동 체크 |
| GitHub링크 | URL | 해당 파일의 GitHub URL |
| 메모 | Text | 비워서 생성 (사용자가 나중에 작성) |

---

## 작업 1: Notion 설정 UI (popup.html / popup.js)

`popup.html` 에 Notion 연동 섹션 추가:

```html
<!-- Notion 연동 섹션 (기존 GitHub 설정 아래에 추가) -->
<div id="notion-section" class="settings-section">
  <h3>Notion 오답노트 <span class="badge-optional">선택</span></h3>
  <p class="settings-desc">설정하지 않아도 GitHub 커밋은 정상 동작합니다.</p>

  <label>Integration Token</label>
  <input type="password" id="notion-token"
         placeholder="secret_xxxxxxxxxxxx">

  <label>Database ID</label>
  <input type="text" id="notion-db-id"
         placeholder="32자리 (URL에서 복사)">

  <div class="button-row">
    <button id="notion-save-btn">저장</button>
    <button id="notion-test-btn">연결 테스트</button>
    <button id="notion-clear-btn" class="btn-danger">초기화</button>
  </div>
  <span id="notion-status" class="status-text"></span>
</div>
```

`popup.js` 에 저장/불러오기/테스트 로직:

```javascript
// 불러오기 (팝업 열릴 때)
chrome.storage.local.get(
  [CTL_STORAGE_KEYS.notionToken, CTL_STORAGE_KEYS.notionDbId],
  (result) => {
    if (result[CTL_STORAGE_KEYS.notionToken])
      document.getElementById('notion-token').value = result[CTL_STORAGE_KEYS.notionToken];
    if (result[CTL_STORAGE_KEYS.notionDbId])
      document.getElementById('notion-db-id').value = result[CTL_STORAGE_KEYS.notionDbId];
  }
);

// 저장
document.getElementById('notion-save-btn').addEventListener('click', () => {
  const token = document.getElementById('notion-token').value.trim();
  const dbId  = document.getElementById('notion-db-id').value.trim();
  chrome.storage.local.set({
    [CTL_STORAGE_KEYS.notionToken]: token,
    [CTL_STORAGE_KEYS.notionDbId]:  dbId,
  }, () => {
    document.getElementById('notion-status').textContent = '✅ 저장됨';
  });
});

// 초기화
document.getElementById('notion-clear-btn').addEventListener('click', () => {
  chrome.storage.local.remove(
    [CTL_STORAGE_KEYS.notionToken, CTL_STORAGE_KEYS.notionDbId],
    () => {
      document.getElementById('notion-token').value = '';
      document.getElementById('notion-db-id').value = '';
      document.getElementById('notion-status').textContent = '🗑 초기화됨';
    }
  );
});

// 연결 테스트
document.getElementById('notion-test-btn').addEventListener('click', async () => {
  const statusEl = document.getElementById('notion-status');
  statusEl.textContent = '테스트 중...';
  chrome.runtime.sendMessage({ type: 'CTL_NOTION_TEST' }, (res) => {
    statusEl.textContent = res?.success ? '✅ 연결 성공' : `❌ 실패: ${res?.error}`;
  });
});
```

---

## 작업 2: Notion API 클라이언트 (scripts/core/notion_client.js)

CORS 우회를 위해 background service worker에서 호출.

```javascript
// scripts/core/notion_client.js

async function getNotionConfig() {
  return new Promise((resolve) => {
    chrome.storage.local.get(
      [CTL_STORAGE_KEYS.notionToken, CTL_STORAGE_KEYS.notionDbId],
      (r) => resolve({
        token: r[CTL_STORAGE_KEYS.notionToken],
        dbId:  r[CTL_STORAGE_KEYS.notionDbId],
      })
    );
  });
}

/**
 * Notion DB에 새 행 생성
 * @param {Object} entry
 * @param {string} entry.title
 * @param {string} entry.site
 * @param {string} entry.level
 * @param {string} entry.result
 * @param {string} entry.language
 * @param {number} entry.attemptCount
 * @param {string} entry.submittedAt   - ISO 8601
 * @param {string} entry.githubUrl
 * @param {string} [entry.code]        - 선택, 2000자 제한
 */
async function createNotionEntry(entry) {
  const { token, dbId } = await getNotionConfig();
  if (!token || !dbId) {
    console.log('[ALG] Notion 미설정 — 스킵 (정상)');
    return { skipped: true };
  }

  const needsReview = entry.result !== 'correct';

  const body = {
    parent: { database_id: dbId },
    properties: {
      '문제명':     { title:    [{ text: { content: entry.title } }] },
      '사이트':     { select:   { name: entry.site } },
      '레벨':       { select:   { name: entry.level } },
      '결과':       { select:   { name: entry.result } },
      '언어':       { select:   { name: entry.language } },
      '시도횟수':   { number:   entry.attemptCount },
      '날짜':       { date:     { start: entry.submittedAt } },
      '리뷰필요':   { checkbox: needsReview },
      'GitHub링크': { url:      entry.githubUrl || '' },
    },
  };

  // 코드가 있으면 페이지 본문에 블록으로 추가 (2000자 제한)
  if (entry.code) {
    body.children = [{
      object: 'block',
      type: 'code',
      code: {
        rich_text: [{ type: 'text', text: { content: entry.code.slice(0, 2000) } }],
        language: toNotionLang(entry.language),
      },
    }];
  }

  try {
    const res = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        'Authorization':  `Bearer ${token}`,
        'Notion-Version': '2022-06-28',
        'Content-Type':   'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json();
      console.error('[ALG] Notion 오류:', err);
      return { success: false, error: err.message };
    }
    console.log('[ALG] Notion 기록 완료:', entry.title);
    return { success: true };
  } catch (err) {
    console.error('[ALG] Notion 네트워크 오류:', err);
    return { success: false, error: err.message };
  }
}

// 연결 테스트 (DB 정보 조회)
async function testNotionConnection() {
  const { token, dbId } = await getNotionConfig();
  if (!token || !dbId) return { success: false, error: '토큰 또는 DB ID 미입력' };

  try {
    const res = await fetch(`https://api.notion.com/v1/databases/${dbId}`, {
      headers: {
        'Authorization':  `Bearer ${token}`,
        'Notion-Version': '2022-06-28',
      },
    });
    if (res.ok) return { success: true };
    const err = await res.json();
    return { success: false, error: err.message };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function toNotionLang(lang) {
  const map = {
    'Python': 'python', 'Python3': 'python',
    'Java': 'java', 'JavaScript': 'javascript', 'TypeScript': 'typescript',
    'C++': 'c++', 'C': 'c', 'Kotlin': 'kotlin',
    'Swift': 'swift', 'Go': 'go', 'Rust': 'rust', 'Ruby': 'ruby',
  };
  return map[lang] || 'plain text';
}
```

---

## 작업 3: background.js에 Notion 메시지 핸들러 추가

```javascript
// background.js
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  // Notion 연결 테스트
  if (msg.type === 'CTL_NOTION_TEST') {
    testNotionConnection().then(sendResponse);
    return true; // 비동기 응답
  }

  // 커밋 이벤트 수신 → Notion 기록
  if (msg.type === 'CTL_COMMIT_EVENT' && msg.payload?.success) {
    const p = msg.payload;
    buildGithubFileUrl(p.commitPath, p.fileName).then(githubUrl => {
      createNotionEntry({
        title:        p.problemName,
        site:         p.site,
        level:        p.level || '',
        result:       p.result,
        language:     p.language || '',
        attemptCount: p.attemptCount || 1,
        submittedAt:  new Date().toISOString(),
        githubUrl,
        code:         p.code || '',
      });
    });
  }
});

async function buildGithubFileUrl(commitPath, fileName) {
  return new Promise((resolve) => {
    chrome.storage.local.get([CTL_STORAGE_KEYS.githubRepo], (r) => {
      const repo = r[CTL_STORAGE_KEYS.githubRepo];
      if (!repo) { resolve(''); return; }
      const path = encodeURIComponent(`${commitPath}/${fileName}`).replace(/%2F/g, '/');
      resolve(`https://github.com/${repo}/blob/main/${path}`);
    });
  });
}
```

---

## 작업 4: manifest.json host_permissions

```json
{
  "host_permissions": [
    "https://api.notion.com/*",
    "https://api.github.com/*",
    "https://solved.ac/*"
  ]
}
```

기존 값에 merge. 덮어쓰기 금지.

---

## 완료 기준
- [ ] 팝업에 Notion 토큰/DB ID 입력 필드 표시됨
- [ ] "연결 테스트" 버튼이 성공/실패 메시지 표시함
- [ ] 프로그래머스 제출 후 Notion DB에 새 행 생성 확인
- [ ] `리뷰필요` 체크박스: 오답이면 true, 정답이면 false
- [ ] Notion 미설정 상태에서 GitHub 커밋 정상 동작 (Notion 미설정이 커밋에 영향 없음)
- [ ] Notion 토큰 오류 시 콘솔 에러만 출력, GitHub 커밋에 영향 없음

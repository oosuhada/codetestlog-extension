# [P07] Phase 7: AI 피드백 (선택 기능)

## 전제 조건
P02 완료 (Side Panel UI 존재). P01 완료 (커밋 엔진 동작).

## 이 기능의 성격
**완전한 선택 기능 (Opt-in).**
- AI API를 연결하지 않아도 모든 핵심 기능은 100% 동작
- 사용자가 본인의 API 키를 직접 입력해서 사용
- 저렴하거나 무료인 프로바이더 우선 권장 (DeepSeek, Groq 등)
- 토큰 비용은 문제당 1회 분석 기준 입력 ~500토큰 내외

## 작업 목표
오답/에러 제출 시 Side Panel에 AI 분석 결과를 표시.
"배열 인덱스 실수" "경계 조건 미처리" 등 간결한 피드백.

---

## 지원할 AI 프로바이더

| 프로바이더 | 비용 | 특징 |
|-----------|------|------|
| Groq (Llama3) | 무료 (Rate Limit 있음) | 빠름, 무료 |
| DeepSeek | 매우 저렴 | 한국어 품질 좋음 |
| OpenAI | 유료 | 가장 안정적 |
| Anthropic Claude | 유료 | 코드 분석 품질 높음 |

---

## 작업 1: AI 설정 UI (popup.html / popup.js)

`popup.html` 에 AI 설정 섹션 추가:

```html
<div id="ai-section" class="settings-section">
  <h3>AI 피드백 <span class="badge-optional">선택</span></h3>
  <p class="settings-desc">
    오답 시 AI가 코드를 간단히 분석해줍니다.<br>
    설정하지 않아도 모든 기능은 정상 동작합니다.
  </p>

  <label>AI 프로바이더</label>
  <select id="ai-provider">
    <option value="">사용 안 함</option>
    <option value="groq">Groq (무료, Llama3)</option>
    <option value="deepseek">DeepSeek (저렴)</option>
    <option value="openai">OpenAI (GPT-4o mini)</option>
    <option value="anthropic">Anthropic (Claude)</option>
  </select>

  <label>API Key</label>
  <input type="password" id="ai-api-key" placeholder="API Key 입력">

  <div class="button-row">
    <button id="ai-save-btn">저장</button>
    <button id="ai-test-btn">테스트</button>
  </div>
  <span id="ai-status" class="status-text"></span>

  <div class="ai-options">
    <label class="checkbox-label">
      <input type="checkbox" id="ai-only-wrong" checked>
      오답/에러일 때만 분석 (정답은 분석 안 함)
    </label>
  </div>
</div>
```

`popup.js`:
```javascript
// AI 설정 저장/불러오기
chrome.storage.local.get(
  [CTL_STORAGE_KEYS.aiProvider, CTL_STORAGE_KEYS.aiApiKey],
  (r) => {
    document.getElementById('ai-provider').value = r[CTL_STORAGE_KEYS.aiProvider] || '';
    document.getElementById('ai-api-key').value  = r[CTL_STORAGE_KEYS.aiApiKey]   || '';
  }
);

document.getElementById('ai-save-btn').addEventListener('click', () => {
  const provider = document.getElementById('ai-provider').value;
  const apiKey   = document.getElementById('ai-api-key').value.trim();
  chrome.storage.local.set({
    [CTL_STORAGE_KEYS.aiProvider]: provider,
    [CTL_STORAGE_KEYS.aiApiKey]:   apiKey,
  }, () => {
    document.getElementById('ai-status').textContent = '✅ 저장됨';
  });
});
```

---

## 작업 2: AI 클라이언트 (scripts/core/ai_client.js)

```javascript
// scripts/core/ai_client.js

async function getAiConfig() {
  return new Promise((resolve) => {
    chrome.storage.local.get(
      [CTL_STORAGE_KEYS.aiProvider, CTL_STORAGE_KEYS.aiApiKey],
      (r) => resolve({
        provider: r[CTL_STORAGE_KEYS.aiProvider],
        apiKey:   r[CTL_STORAGE_KEYS.aiApiKey],
      })
    );
  });
}

/**
 * 오답 코드 분석 요청
 * @param {Object} params
 * @param {string} params.code
 * @param {string} params.result     - 'wrong' | 'timeout' | 'runtime_error' 등
 * @param {string} params.language
 * @param {string} params.problemTitle
 * @param {string} params.level
 * @returns {Promise<string>} 분석 결과 텍스트
 */
async function analyzeCode(params) {
  const { provider, apiKey } = await getAiConfig();
  if (!provider || !apiKey) return null;

  const prompt = buildAnalysisPrompt(params);

  try {
    switch (provider) {
      case 'groq':      return await callGroq(apiKey, prompt);
      case 'deepseek':  return await callDeepSeek(apiKey, prompt);
      case 'openai':    return await callOpenAI(apiKey, prompt);
      case 'anthropic': return await callAnthropic(apiKey, prompt);
      default:          return null;
    }
  } catch (err) {
    console.error('[ALG] AI 분석 실패:', err);
    return null;
  }
}

function buildAnalysisPrompt({ code, result, language, problemTitle, level }) {
  const resultKor = {
    wrong:          '오답',
    timeout:        '시간 초과',
    runtime_error:  '런타임 에러',
    compile_error:  '컴파일 에러',
    memory_exceeded:'메모리 초과',
  }[result] || result;

  return `코딩테스트 문제 분석을 도와주세요.

문제: ${problemTitle} (${level})
언어: ${language}
결과: ${resultKor}

코드:
\`\`\`${language.toLowerCase()}
${code.slice(0, 1500)}
\`\`\`

이 코드의 문제점을 한국어로 2-3줄 이내로 간결하게 설명해주세요.
코드 전체를 다시 쓰지 말고, 핵심 실수만 지적해주세요.`;
}

// ── 프로바이더별 API 호출 ──────────────────────────────────────

async function callGroq(apiKey, prompt) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama3-8b-8192',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 300,
      temperature: 0.3,
    }),
  });
  const data = await res.json();
  return data.choices?.[0]?.message?.content;
}

async function callDeepSeek(apiKey, prompt) {
  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 300,
    }),
  });
  const data = await res.json();
  return data.choices?.[0]?.message?.content;
}

async function callOpenAI(apiKey, prompt) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 300,
    }),
  });
  const data = await res.json();
  return data.choices?.[0]?.message?.content;
}

async function callAnthropic(apiKey, prompt) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  const data = await res.json();
  return data.content?.[0]?.text;
}
```

---

## 작업 3: Side Panel에 AI 분석 섹션 추가

`sidepanel/index.html` 에 추가 (마지막 섹션 뒤에):

```html
<!-- 섹션 5: AI 분석 (오답일 때만 표시) -->
<section class="panel-section hidden" id="section-ai">
  <h3 class="section-title">AI 분석 <span class="badge-optional">Beta</span></h3>
  <div id="ai-loading" class="empty-state hidden">분석 중...</div>
  <div id="ai-result"  class="ai-result-box"></div>
  <div id="ai-disabled" class="empty-state">
    팝업 → AI 피드백 설정에서 API 키를 입력하면 활성화됩니다.
  </div>
</section>
```

`sidepanel/panel.js` 에 추가:

```javascript
// 커밋 이벤트 수신 시 AI 분석 (오답인 경우만)
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type !== 'CTL_AI_RESULT') return;
  const { analysis } = msg.payload;

  const section  = document.getElementById('section-ai');
  const loading  = document.getElementById('ai-loading');
  const resultEl = document.getElementById('ai-result');
  const disabled = document.getElementById('ai-disabled');

  section.classList.remove('hidden');
  loading.classList.add('hidden');
  disabled.classList.add('hidden');

  if (analysis) {
    resultEl.textContent = analysis;
  } else {
    disabled.classList.remove('hidden');
  }
});
```

`sidepanel/panel.css` 에 추가:
```css
.ai-result-box {
  background: var(--surface-2);
  border-radius: var(--radius);
  padding: 10px 12px;
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
}
.badge-optional {
  font-size: 10px; font-weight: 500;
  background: var(--border); color: var(--text-muted);
  padding: 1px 5px; border-radius: 3px; margin-left: 4px;
}
```

---

## 작업 4: background.js에서 AI 분석 트리거

```javascript
// background.js — CTL_COMMIT_EVENT 처리 부분에 추가

if (msg.type === 'CTL_COMMIT_EVENT' && msg.payload?.success) {
  const p = msg.payload;

  // 오답이고 코드가 있을 때만 AI 분석
  const skipResults = ['correct'];
  if (!skipResults.includes(p.result) && p.code) {
    analyzeCode({
      code:         p.code,
      result:       p.result,
      language:     p.language || '',
      problemTitle: p.problemName,
      level:        p.level || '',
    }).then(analysis => {
      if (analysis) {
        chrome.runtime.sendMessage({
          type: 'CTL_AI_RESULT',
          payload: { analysis },
        }).catch(() => {});
      }
    });
  }
}
```

---

## 작업 5: manifest.json host_permissions 추가

```json
{
  "host_permissions": [
    "https://api.groq.com/*",
    "https://api.deepseek.com/*",
    "https://api.openai.com/*",
    "https://api.anthropic.com/*"
  ]
}
```

기존 host_permissions에 merge.

---

## 완료 기준
- [ ] 팝업에 AI 설정 UI 표시됨
- [ ] Groq API Key 입력 후 저장 확인
- [ ] 프로그래머스 오답 제출 후 Side Panel AI 분석 섹션 표시
- [ ] AI 미설정 상태에서 Side Panel에 "설정 안내" 메시지 표시
- [ ] AI 미설정/오류 시 GitHub 커밋에 영향 없음
- [ ] "오답일 때만 분석" 옵션 동작 확인 (정답 제출 시 AI 호출 없음)

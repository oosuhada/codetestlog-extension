# [P00] Phase 0: 리브랜딩 + 프로젝트 구조 초기화

## 전제 조건
이전 백업 도구 포크 완료 상태. 로컬에 클론되어 있음.

## 작업 목표
이전 백업 도구 → **Algolog** 브랜드 전환 + docs 구조 초기화 + manifest 정비.
**로직 코드는 일절 건드리지 않는다. 이 Phase는 준비 작업.**

---

## 작업 1: 프로젝트 현황 파악

### 1-1. 전체 구조 확인
```bash
tree -a -L 5 \
  -I 'node_modules|.git|.DS_Store|*.log|dist|build|*.lock'
```

### 1-2. manifest.json 내용 확인
```bash
cat manifest.json
```

### 1-3. 이전 백업 도구 브랜드명이 등장하는 파일 목록 파악
```bash
grep -rl "이전 백업 도구\|이전 백업 도구\|이전 백업 도구" . \
  --include="*.js" --include="*.html" --include="*.json" --include="*.md"
```

### 1-4. 스토리지 키 하드코딩 현황 파악 (수정은 P01에서)
```bash
grep -rn "chrome.storage" . \
  --include="*.js" | grep -v "node_modules"
```
결과를 메모해둘 것. P01에서 `ctl_` 네임스페이스로 전환할 대상.

---

## 작업 2: manifest.json 업데이트

`manifest.json` 에서 아래 필드만 수정:

```json
{
  "name": "Algolog",
  "short_name": "CTL",
  "description": "코딩테스트 모든 제출 시도를 GitHub에 자동 커밋. 몇 번째 시도에 정답을 맞췄는지 Side Panel에서 바로 확인.",
  "version": "2.0.0"
}
```

- 나머지 필드(permissions, content_scripts, background 등)는 기존 값 그대로 유지
- `version`만 `2.0.0`으로 변경

---

## 작업 3: 브랜드명 텍스트 일괄 치환

**절대 로직 코드는 건드리지 말 것 — 문자열 치환만.**

### 치환 규칙
| 원본 | 변경 후 |
|------|---------|
| `이전 백업 도구` | `Algolog` |
| `이전 백업 도구` | `Algolog` |
| `이전 백업 도구` | `Algolog` |

### 대상 파일 (1-3에서 찾은 파일 목록 기준으로 진행)
- `popup.html` — `<title>`, `<h1>`, 버튼 레이블 등 표시 텍스트
- `welcome.html` — 상단 타이틀, 설명 텍스트
- `popup.js` — `console.log`, `alert`, `chrome.notifications` 메시지 내 브랜드명
- `welcome.js` — 동일
- `README.md` (존재하면) — 상단 프로젝트명, 배지 텍스트

치환 후 각 파일을 다시 열어 로직 코드가 손상되지 않았는지 확인.

---

## 작업 4: docs/ 폴더 구조 생성

아래 구조를 그대로 생성:

```
docs/
├── planning/
│   └── README.md          ← "설계 문서 보관 폴더" 한 줄 설명
├── tasks/
│   ├── CODEX_TASKS.md     ← 전체 Phase 계획 (별도 제공 파일 복사)
│   ├── prompts/
│   │   ├── P00_setup.md
│   │   ├── P01_commit_engine.md
│   │   ├── P02_side_panel.md
│   │   ├── P03_baekjoon.md
│   │   ├── P04_multi_site.md
│   │   ├── P05_notion.md
│   │   ├── P06_dashboard.md
│   │   └── P07_ai_feedback.md
│   └── logs/
│       └── .gitkeep
└── README.md              ← "Algolog 프로젝트 문서 루트" 설명
```

---

## 작업 5: 스토리지 키 네임스페이스 준비

기존 스토리지 유틸 파일을 찾아 상단에 아래 상수 블록 추가:
(파일이 없으면 `scripts/storage.js` 신규 생성)

```javascript
// ─── Algolog Storage Key Namespace ───────────────────────────────────────
// P01 이후 모든 스토리지 키는 이 객체를 통해 사용한다.
// 이전 백업 도구 키는 P01에서 마이그레이션 예정.
const CTL_STORAGE_KEYS = {
  attemptCount: (site, problemId) => `ctl_attempt_${site}_${problemId}`,
  githubToken:  'ctl_github_token',
  githubRepo:   'ctl_github_repo',
  notionToken:  'ctl_notion_token',   // P05에서 사용
  notionDbId:   'ctl_notion_db_id',   // P05에서 사용
  aiProvider:   'ctl_ai_provider',    // P07에서 사용
  aiApiKey:     'ctl_ai_api_key',     // P07에서 사용
  isEnabled:    'ctl_is_enabled',
};
// ─────────────────────────────────────────────────────────────────────────────
```

기존 하드코딩 키는 **이번 Phase에서는 교체하지 말 것** — 위치만 주석으로 메모.

---

## 완료 기준
- [ ] `manifest.json`의 `name`이 `"Algolog"` 인지 확인
- [ ] `popup.html` 열었을 때 "Algolog" 텍스트 노출 확인
- [ ] `docs/` 폴더 구조 생성됨 (`tree docs/` 로 확인)
- [ ] `CTL_STORAGE_KEYS` 블록 추가됨
- [ ] 로직 코드 손상 없음 (기존 커밋 기능 여전히 동작)
- [ ] `git log --oneline -1` 에 P00 커밋 확인

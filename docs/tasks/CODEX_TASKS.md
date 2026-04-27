# Algolog — 전체 작업 계획 (CODEX_TASKS.md)

## 프로젝트 비전
**"코딩테스트 풀이의 전 과정을 빠짐없이 기록하는 가장 신뢰할 수 있는 도구"**

이전 백업 도구 포크 기반 크롬 익스텐션을 **Algolog**로 리브랜딩 + 전면 재설계.

### 지금 이전 백업 도구의 문제점
- 마지막 성공 코드만 커밋 (오답 기록 없음)
- 정답 인식 오류: try → 정답 연속 제출 시 정답을 놓치는 버그
- 프로그래머스 한정 (백준 지원 불안정)
- 폴더 구조 불편 (`/0/` 같은 의미없는 숫자 폴더)
- UI 없음: 커밋 성공 여부를 사용자가 알 수 없음

### Algolog가 해결할 것 (우선순위 순)
```
1순위: 커밋 로직 완전 신뢰성 확보 (오인식 버그 제거)
2순위: 모든 제출 시도 기록 (정답/오답 구분 없이)
3순위: Side Panel UI (실시간 액션 피드백)
4순위: 다중 사이트 지원 (SWEA, LeetCode 등)
5순위: AI 기능 (사용자 API 키 연결, 선택 기능)
```

### 기술 스택 (서버 없음)
- **익스텐션** — DOM 감지, 코드 캡처, GitHub 커밋
- **Side Panel** — 실시간 커밋 피드백 UI (Chrome 114+ Side Panel API)
- **GitHub** — 무료 코드 저장소
- **Notion** — 오답노트 (선택, P05)
- **GitHub Pages** — 통계 대시보드 (P06)
- **AI API** — 선택 기능 (DeepSeek / Groq 등, P07)
- **서버: 0개**

---

## Phase 목록

| Phase | 파일 | 내용 | 우선순위 | 의존성 |
|-------|------|------|----------|--------|
| P00 | P00_setup.md | 리브랜딩 + 디렉토리 재구성 + manifest 정비 | 🔴 필수 | 없음 |
| P01 | P01_commit_engine.md | 커밋 엔진 완전 재작성 (버그 제거 + 모든 시도 기록) | 🔴 필수 | P00 |
| P02 | P02_side_panel.md | Side Panel UI (액션 피드백 + 시도 통계) | 🔴 필수 | P01 |
| P03 | P03_baekjoon.md | 백준 커밋 로직 강화 (동일 규칙 적용) | 🟠 높음 | P01 |
| P04 | P04_multi_site.md | SWEA / LeetCode 어댑터 구조 | 🟡 중간 | P03 |
| P05 | P05_notion.md | Notion 오답노트 (선택 기능) | 🟡 중간 | P01 |
| P06 | P06_dashboard.md | GitHub Pages 통계 대시보드 | 🟢 낮음 | P01~P04 |
| P07 | P07_ai_feedback.md | AI 피드백 (사용자 API 키 연결, 선택 기능) | 🟢 낮음 | P02 |

---

## ⚙️ Codex 공통 운영 규칙 (모든 Phase 적용)

### 작업 시작 전 반드시 (순서 엄수)

**Step 1: 프로젝트 구조 파악**
```bash
tree -a -L 5 \
  -I 'node_modules|.git|.DS_Store|*.log|dist|build|*.lock'
```

**Step 2: 전체 계획 확인**
```bash
cat docs/tasks/CODEX_TASKS.md
```

**Step 3: 이전 Phase 로그 확인**
```bash
# 해당 Phase의 직전 Phase 로그 확인
cat docs/tasks/logs/LOG_P0X_*.md   # X = 이번 Phase - 1
```

**Step 4: 수정할 파일 전체 정독**
- 분석 없이 수정 금지. 반드시 코드 읽고 시작.

### 작업 완료 후 반드시 (순서 엄수)

**Step 1: 로그 작성**
```bash
# docs/tasks/logs/LOG_P0{N}_{name}.md 생성
# 형식: 아래 로그 템플릿 참고
```

**Step 2: 완료 기준 자가 검증**
- 해당 Phase md의 완료 기준 체크리스트 항목 모두 확인

**Step 3: Git 커밋**
```bash
git add .
git commit -m "feat: [P0N] {Phase 제목 요약}"
```

### 로그 템플릿
```markdown
# LOG_P0N_{name}.md

## 완료 일시
YYYY-MM-DD HH:MM

## 작업 요약
- 수정한 파일 목록
- 주요 변경 내용 3줄 요약

## 발견한 기존 버그
- (발견한 것 기록)

## 다음 Phase를 위한 메모
- (후속 작업자에게 전달할 사항)

## 완료 기준 체크
- [ ] 항목1
- [ ] 항목2
```

---

## 공통 파일명/폴더 규칙 (전 Phase 통일)

### 폴더 구조
```
/{사이트명}/{레벨or티어}/{문제번호}. {문제명}/
  YYYYMMDD_HHMMSS_{result}_{문제명}.{ext}
```

예시:
```
/프로그래머스/lv2/42586. 기능개발/
  20260501_143022_wrong_기능개발.py
  20260501_143311_correct_기능개발.py

/백준/silver/1000. A+B/
  20260501_150000_correct_A+B.py
```

### result 값
| 값 | 의미 |
|----|------|
| `correct` | 정답 |
| `wrong` | 오답 |
| `timeout` | 시간초과 |
| `runtime_error` | 런타임 에러 |
| `compile_error` | 컴파일 에러 |
| `memory_exceeded` | 메모리 초과 |
| `partial` | 부분 점수 |

### 커밋 메시지
```
[ALG] {result} | {사이트} | {레벨} | {문제명} | {언어} | {N}번째 시도
```
예: `[ALG] correct | 프로그래머스 | lv2 | 기능개발 | Python | 3번째 시도`

---

## 스토리지 키 네임스페이스

모든 키는 `ctl_` 접두사 사용:

| 키 | 설명 |
|----|------|
| `ctl_github_token` | GitHub PAT |
| `ctl_github_repo` | `username/repo` 형식 |
| `ctl_is_enabled` | 익스텐션 활성화 여부 |
| `ctl_attempt_{site}_{problemId}` | 사이트별 문제 시도 횟수 |
| `ctl_notion_token` | Notion Integration Token (P05) |
| `ctl_notion_db_id` | Notion DB ID (P05) |
| `ctl_ai_provider` | AI 프로바이더 선택 (P07) |
| `ctl_ai_api_key` | 사용자 AI API 키 (P07) |

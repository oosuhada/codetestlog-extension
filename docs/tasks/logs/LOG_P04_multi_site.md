# LOG_P04_multi_site.md

## 완료 일시
2026-05-01 17:19

## 작업 요약
- 수정한 파일: `manifest.json`
- 추가한 파일: `scripts/core/site_adapter.js`, `scripts/core/commit_handler.js`, `scripts/programmers/adapter.js`, `scripts/baekjoon/adapter.js`, `scripts/swexpertacademy/adapter.js`, `scripts/leetcode/adapter.js`
- 주요 변경: 새 사이트는 `SiteAdapterRegistry.register(siteKey, adapter)`로 붙일 수 있는 공통 어댑터 레지스트리를 추가함
- 주요 변경: 신규 사이트가 바로 쓸 수 있는 `CTLCommitHandler.handleSubmission()` 공통 커밋/Side Panel 이벤트 핸들러를 추가함
- 주요 변경: 프로그래머스/백준/SWEA 어댑터를 등록하고 LeetCode 도메인/어댑터를 manifest에 연결함

## 발견한 기존 버그
- 사이트별 커밋 규칙(`buildFileName`, `buildCommitPath`, attempt count, Side Panel event)이 여러 파일에 중복되어 새 사이트 추가 시 누락 위험이 큼.
- LeetCode처럼 기존 레거시 흐름이 없는 사이트는 공통 runner/handler 없이는 manifest에 도메인을 추가해도 실제 커밋 경로가 없음.
- SWEA 기존 로직은 정답 중심 백업 흐름이라 P04에서는 어댑터 등록을 우선하고, 모든 시도 기록 강화는 후속 공통화 작업에서 다루는 편이 안전함.

## 다음 Phase를 위한 메모
- P05/P07에서 사이트별 결과를 다룰 때 `SubmissionResult` 형태를 기준으로 삼으면 프로그래머스/백준/SWEA/LeetCode를 같은 입력으로 처리할 수 있음.
- 프로그래머스/백준은 P01/P03의 검증된 legacy 커밋 경로를 유지하고, 어댑터는 정상화된 제출 데이터 인터페이스를 제공하도록 붙였음.
- LeetCode 감지는 오탐 방지를 위해 제출 결과 전용 selector만 사용함. 실제 DOM 변경에 따라 selectors 보강이 필요할 수 있음.

## 완료 기준 체크
- [x] `scripts/core/site_adapter.js`, `scripts/core/commit_handler.js` 생성됨
- [x] `scripts/programmers/adapter.js`, `scripts/baekjoon/adapter.js` 생성됨
- [x] 프로그래머스/백준 기존 기능 회귀 방지를 위해 JS 구문 검사와 P01/P03 핵심 순수 함수 검증을 통과함
- [x] SWEA 어댑터 파일 생성됨
- [x] LeetCode 어댑터 파일 생성됨, manifest에 도메인과 content script가 추가됨
- [x] 새 사이트 추가 방법이 `site_adapter.js` 주석에 명확히 설명됨

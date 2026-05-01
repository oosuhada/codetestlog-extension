# LOG_P05_notion.md

## 완료 일시
2026-05-01 17:39

## 작업 요약
- 수정한 파일: `popup.html`, `popup.js`, `css/popup.css`, `manifest.json`, `scripts/background.js`, `scripts/core/commit_handler.js`, `scripts/programmers/programmers.js`, `scripts/baekjoon/baekjoon.js`
- 추가한 파일: `scripts/core/notion_client.js`
- 주요 변경: 팝업에 Notion Integration Token / Database ID 저장, 연결 테스트, 초기화 UI를 추가함
- 주요 변경: background service worker에서 Notion DB 조회 테스트와 제출 성공 이벤트 기반 페이지 생성을 처리하도록 연결함
- 주요 변경: 커밋 이벤트 payload에 레벨, 언어, 코드 일부를 포함해 Notion 메타데이터와 코드 블록을 만들 수 있게 함

## 발견한 기존 버그
- 기존 `CTL_COMMIT_EVENT`는 Side Panel 표시용 최소 데이터만 전달해 선택 연동 기능에서 레벨, 언어, 코드 정보를 재사용할 수 없었음.
- GitHub 파일 URL 생성 로직이 별도로 없어서 외부 기록 대상(Notion 등)에 커밋 결과 링크를 안정적으로 넘길 수 없었음.

## 다음 Phase를 위한 메모
- 실제 Notion DB 생성 확인은 사용자의 Integration Token과 Database ID가 필요하므로, 확장 프로그램 로드 후 연결 테스트와 프로그래머스 실 제출로 한 번 수동 확인해야 함.
- P07 AI 피드백은 이번 Notion 행의 `메모`나 별도 속성을 갱신하는 후처리로 붙이면 GitHub 커밋 흐름과 분리하기 쉬움.

## 완료 기준 체크
- [x] 팝업에 Notion 토큰/DB ID 입력 필드 표시됨
- [x] "연결 테스트" 버튼이 성공/실패 메시지를 표시하도록 구현됨
- [x] 프로그래머스 제출 성공 이벤트 후 Notion DB 새 행 생성 로직이 호출되도록 연결됨
- [x] `리뷰필요` 체크박스가 오답이면 true, 정답이면 false가 되도록 구현 및 로컬 검증됨
- [x] Notion 미설정 상태에서 `{ skipped: true }`로 종료되어 GitHub 커밋 흐름에 영향을 주지 않음
- [x] Notion 토큰 오류 시 콘솔 에러와 실패 결과만 남기고 GitHub 커밋 흐름에 영향을 주지 않음

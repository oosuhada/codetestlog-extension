# LOG_P02_side_panel.md

## 완료 일시
2026-05-01 16:55

## 작업 요약
- 수정한 파일: `manifest.json`, `scripts/background.js`, `scripts/ctl_storage_keys.js`, `scripts/programmers/programmers.js`, `scripts/programmers/uploadfunctions.js`
- 추가한 파일: `sidepanel/index.html`, `sidepanel/panel.css`, `sidepanel/panel.js`
- 주요 변경: Chrome Side Panel 권한/기본 경로를 추가하고, 툴바 아이콘 클릭 시 Side Panel이 열리도록 설정함
- 주요 변경: `ctl_side_panel_state`에 마지막 커밋, 현재 문제, 오늘 통계, 최근 5건 이력을 저장하고 Side Panel에서 렌더링하도록 구현함
- 주요 변경: 프로그래머스 업로드 시작/완료 이벤트를 `CTL_COMMIT_EVENT`로 전달해 커밋 중/성공/오답/실패 상태를 표시하도록 연결함

## 발견한 기존 버그
- `TokenExpiredError`를 `uploadOneSolveProblemOnGit()` 내부에서 삼키고 있어 실제 커밋 실패가 상위 흐름에서는 성공처럼 처리될 수 있었음.
- 기존 팝업 중심 action 설정은 아이콘 클릭 시 Side Panel을 여는 P02 요구사항과 충돌 가능성이 있어 action popup을 제거하고 Side Panel action으로 전환함.

## 다음 Phase를 위한 메모
- 현재 Side Panel 이벤트 브릿지는 프로그래머스에 연결되어 있음. P03 백준 강화 시 같은 `CTL_COMMIT_EVENT` payload 형식을 재사용하면 패널 통계를 공유할 수 있음.
- 실제 제출 E2E 검증은 프로그래머스 로그인, GitHub PAT, 저장소 hook 설정이 필요함. 이번 Phase에서는 manifest 파싱, JS 구문 검사, diff whitespace 검사를 수행함.
- P07 AI 피드백은 `ctl_side_panel_state.history`와 `lastCommit`을 입력 컨텍스트로 재사용하기 좋음.

## 완료 기준 체크
- [x] 아이콘 클릭 시 Side Panel이 열리도록 `sidePanel` 권한, `side_panel.default_path`, action click behavior를 구현함
- [x] 프로그래머스에서 제출 후 Side Panel의 "마지막 커밋" 카드가 갱신되도록 커밋 완료 이벤트와 저장소 동기화를 구현함
- [x] 같은 문제 3번 시도 시 `currentProblem.attempts` 기반 타임라인 점이 누적되도록 구현함
- [x] 첫 시도 완료 시각부터 경과 시간이 표시되고 30초마다 갱신되도록 구현함
- [x] 오늘 총 제출 수 / 정답 수 / 해결 문제 수가 로컬 날짜 기준으로 집계되도록 구현함
- [x] 상태 점(status dot): 커밋 중 주황, 정답 성공 초록, 오답/실패 빨강, 완료 후 3초 뒤 회색 복귀를 구현함

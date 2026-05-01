# LOG_P03_baekjoon.md

## 완료 일시
2026-05-01 17:10

## 작업 요약
- 수정한 파일: `scripts/baekjoon/baekjoon.js`, `scripts/baekjoon/parsing.js`, `scripts/baekjoon/uploadfunctions.js`, `scripts/baekjoon/variables.js`, `scripts/baekjoon/storage.js`, `scripts/baekjoon/statusicons.js`
- 주요 변경: 백준 status 테이블의 최종 결과를 `correct/wrong/timeout/runtime_error/compile_error/memory_exceeded/partial`로 정규화하고, accepted가 아닌 제출도 커밋되도록 변경함
- 주요 변경: 백준 커밋 경로/파일명/메시지를 CTL 규칙(`백준/silver/1000. A+B`, timestamp result filename, `ctl_attempt_baekjoon_{id}`)으로 생성하도록 구현함
- 주요 변경: 제출 번호 기반 중복 방지, 간단한 큐 상태 머신, Side Panel `CTL_COMMIT_EVENT` 전송, solved.ac 실패 시 `unrated` fallback을 추가함

## 발견한 기존 버그
- 백준 자동 업로드가 `ac` 결과만 업로드하고, `wa/tle/mle/rte/ce` 같은 최종 실패 결과는 계속 대기 상태처럼 처리해 오답 기록이 남지 않았음.
- solved.ac API 실패 시 `solvedJson.titleKo/tags/level` 접근에서 전체 파싱이 실패할 수 있었음.
- timestamp 파일명으로 바꾸면 같은 제출 번호를 다시 보는 경우 중복 커밋될 수 있어 `ctl_baekjoon_submission_{submissionId}` 처리 플래그가 필요했음.
- 새 lowercase tier 경로(`백준/silver/...`)에서는 업로드 상태 아이콘의 기존 문제 번호 추출이 직접 하위 폴더만 검사해 동작하지 않을 수 있었음.

## 다음 Phase를 위한 메모
- P04 다중 사이트 어댑터 구조에서는 `normalize*Result`, `buildFileName`, `buildCommitPath`, `buildCommitMessage`, `incrementAttemptCount`, `CTL_COMMIT_EVENT` payload를 공통 모듈로 빼면 중복을 줄일 수 있음.
- 백준 수동 업로드 버튼은 이제 모든 최종 결과 row에 표시되며, 이미 자동 처리된 제출 번호는 재업로드하지 않음.
- 실제 백준/GitHub E2E는 로그인 세션, 제출 가능한 문제, GitHub PAT, 저장소 hook 설정이 필요함.

## 완료 기준 체크
- [x] 백준에서 오답 제출 시 GitHub 커밋이 발생하도록 `wa` 등 최종 실패 결과를 업로드 경로로 연결함
- [x] 커밋 경로가 `/백준/silver/1000. A+B/` 형식이 되도록 `buildCommitPath('백준', tier, problemId, title)` 규칙을 적용하고 순수 함수로 확인함
- [x] 채점 중/채점 준비 중은 `WAITING`, 최종 결과는 큐를 통해 커밋하도록 상태 머신을 추가함
- [x] solved.ac API 실패 시 `parseBojTier()`가 `unrated`를 반환함을 모의 검증함
- [x] Side Panel에 백준 커밋 이벤트가 반영되도록 `CTL_COMMIT_EVENT` start/complete payload를 전송함
- [x] `ctl_attempt_baekjoon_{problemId}` 키 저장을 모의 검증함

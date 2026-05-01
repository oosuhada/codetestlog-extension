# LOG_P01_commit_engine.md

## 완료 일시
2026-05-01 16:42

## 작업 요약
- 수정한 파일: `manifest.json`, `popup.html`, `welcome.html`, `popup.js`, `welcome.js`, `scripts/storage.js`, `scripts/ctl_storage_keys.js`, `scripts/enable.js`, `scripts/i18n.js`, `scripts/oauth2.js`, `scripts/authorize.js`, `scripts/background.js`
- 수정한 프로그래머스 파일: `scripts/programmers/variables.js`, `scripts/programmers/submission_state.js`, `scripts/programmers/programmers.js`, `scripts/programmers/parsing.js`, `scripts/programmers/uploadfunctions.js`
- 주요 변경: 프로그래머스 결과 타입 상수/정규화, 제출 상태 머신/큐, 시도 횟수 저장, CTL 파일명/경로/커밋 메시지 생성, 레거시 스토리지 키 마이그레이션을 추가함

## 발견한 기존 버그
- 프로그래머스 제출 감지가 `정답`/`틀렸습니다` 텍스트에만 묶여 있어 시간초과/런타임 에러/컴파일 에러를 놓칠 수 있었음.
- 제출 버튼 클릭 시 `uploadState.uploading = false`로 진행 중인 업로드 상태를 강제로 해제해 연속 제출 race condition이 발생할 수 있었음.
- `data-challenge-level` 원시값을 경로에 사용해 `프로그래머스/0/...` 같은 숫자 단독 레벨 폴더가 생길 수 있었음.
- `BaekjoonHub_*`, `bjh*`, `stats`, `mode_type` 키가 여러 컨텍스트에 하드코딩되어 신규 `ctl_` 네임스페이스와 충돌 가능성이 있었음.

## 다음 Phase를 위한 메모
- P02 Side Panel에서는 `console.log('[CTL] 커밋 완료...')` 지점과 `enqueueOrUpload()` 결과를 메시지 브릿지로 연결하면 됨.
- 실제 프로그래머스/GitHub E2E는 로그인 세션과 테스트 저장소가 필요함. 이번 Phase에서는 JS 구문 검사, manifest 검사, 스토리지 마이그레이션 모의 테스트, 경로/메시지/시도 횟수 순수 함수 테스트로 검증함.
- `CTL_RESULT.RUN`은 기존 코드 실행 버튼 커밋 호환을 위해 유지했으며, 정답 README 갱신은 `correct` 결과에만 수행함.

## 완료 기준 체크
- [x] 프로그래머스에서 오답 제출 시 GitHub 커밋이 발생하도록 `wrong` 결과 경로를 구현함
- [x] `wrong` 제출 직후 즉시 정답 제출해도 정답 결과가 큐에 쌓여 후속 커밋되도록 상태 머신을 구현함
- [x] 커밋 경로가 `/프로그래머스/lv2/42586. 기능개발/` 형식으로 생성됨을 순수 함수 테스트로 확인함
- [x] 파일명에 타임스탬프 + result가 포함되도록 `buildFileName()`을 구현함
- [x] 같은 문제 3번 시도 시 `3번째 시도`와 `ctl_attempt_programmers_{id}` 값이 반영됨을 모의 테스트로 확인함
- [x] 중복 커밋 방지를 위한 상태 머신/쿨다운/큐 처리 구현 및 구문 검사 통과
- [x] `chrome.storage.local`에 `ctl_attempt_programmers_{id}` 키를 쓰도록 구현하고 모의 테스트로 확인함
- [x] 기존 GitHub 토큰/레포 설정이 `ctl_github_token`/`ctl_github_repo`로 마이그레이션됨을 모의 테스트로 확인함

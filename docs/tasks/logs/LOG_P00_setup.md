# LOG_P00_setup.md

## 완료 일시
2026-05-01 16:24

## 작업 요약
- 수정한 파일: `manifest.json`, `popup.html`, `welcome.js`, `scripts/i18n.js`, `scripts/storage.js`, README 및 브랜드 표시 문자열이 포함된 사이트별 파싱/업로드 파일
- 문서 구조: `docs/README.md`, `docs/planning/README.md`, `docs/tasks/logs/.gitkeep` 추가
- 주요 변경: manifest를 Algolog 2.0.0으로 정비, 표시 브랜드 문자열을 Algolog로 변경, P01용 `CTL_STORAGE_KEYS` 네임스페이스 블록 추가

## 발견한 기존 버그
- 오래된 저장소 키가 여러 파일에 하드코딩되어 있음. P01에서 `ctl_` 네임스페이스로 마이그레이션 필요.
- 일부 UI/i18n 문구는 Algolog로 이미 바뀌어 있었지만 manifest와 번역 문자열에는 이전 백업 도구/코테로그가 혼재되어 있었음.

## 다음 Phase를 위한 메모
- P01에서는 기존 키를 즉시 삭제하지 말고 `CTL_STORAGE_KEYS`와 마이그레이션 맵을 통해 기존 사용자의 설정/토큰을 보존해야 함.
- 이번 Phase에서는 스토리지 키, CSS 클래스, SWEA `extension=이전 백업 도구` 파라미터처럼 동작에 관여하는 값은 교체하지 않았음.

## 완료 기준 체크
- [x] `manifest.json`의 `name`이 `"Algolog"` 인지 확인
- [x] `popup.html` 열었을 때 "Algolog" 텍스트 노출 확인
- [x] `docs/` 폴더 구조 생성됨 (`tree docs/` 로 확인)
- [x] `CTL_STORAGE_KEYS` 블록 추가됨
- [x] 로직 코드 손상 없음 (`node --check`, `git diff --check` 통과)
- [x] `git log --oneline -1` 에 P00 커밋 확인

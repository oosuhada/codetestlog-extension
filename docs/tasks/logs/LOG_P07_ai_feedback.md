# LOG_P07_ai_feedback.md

## 완료 일시
2026-05-01 18:29

## 작업 요약
- 추가한 파일: `scripts/core/ai_client.js`
- 수정한 파일: `popup.html`, `popup.js`, `css/popup.css`, `manifest.json`, `scripts/background.js`, `scripts/ctl_storage_keys.js`, `scripts/storage.js`, `sidepanel/index.html`, `sidepanel/panel.js`, `sidepanel/panel.css`
- 주요 변경: 팝업에 AI 프로바이더/여러 API Key/오답 전용 옵션 설정 UI를 추가함
- 주요 변경: Groq/DeepSeek/OpenAI/Anthropic API 호출 클라이언트를 추가하고 여러 키를 요청마다 순환 사용하도록 구현함
- 주요 변경: 오답/에러 커밋 완료 후 Side Panel에 AI 분석 상태와 결과를 표시하도록 background와 Side Panel 상태를 연결함

## 발견한 기존 버그
- AI 설정 키가 단일 `ctl_ai_api_key`만 정의되어 있어 여러 키 순환 사용과 고갈 대비가 불가능했음.
- Side Panel 상태에 AI 분석 상태가 없어 패널이 닫힌 동안 도착한 분석 결과를 다시 열었을 때 볼 수 없었음.

## 다음 Phase를 위한 메모
- 사용자의 실제 API Key는 저장소에 커밋하지 않고 팝업 로컬 설정에 저장하도록 유지해야 함.
- Groq 기본 모델은 `llama-3.1-8b-instant`로 설정했으며, 모델 교체가 필요하면 `scripts/core/ai_client.js`의 `DEFAULT_MODELS`만 바꾸면 됨.
- 대시보드에는 아직 AI 분석 결과를 저장/표시하지 않는다. 필요하면 커밋 파일 옆에 별도 `.ai.md` 파일을 생성하는 확장 작업이 자연스럽다.

## 완료 기준 체크
- [x] 팝업에 AI 설정 UI 표시됨
- [x] Groq API Key 입력 후 저장 가능한 구조 구현됨
- [x] 프로그래머스/백준 등 `CTL_COMMIT_EVENT` 오답 완료 이벤트 후 Side Panel AI 분석 섹션 표시 로직 구현됨
- [x] AI 미설정 상태에서 Side Panel에 설정 안내 메시지 표시됨
- [x] AI 미설정/오류 시 GitHub 커밋에 영향 없도록 optional async flow로 분리됨
- [x] "오답/에러일 때만 분석" 옵션 동작 구현됨

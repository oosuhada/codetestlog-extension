# LOG_P06_dashboard.md

## 완료 일시
2026-05-01 17:50

## 작업 요약
- 추가한 파일: `dashboard/index.html`, `dashboard/app.js`, `dashboard/style.css`, `dashboard/components/stats_cards.js`, `dashboard/components/charts.js`, `dashboard/components/problem_table.js`, `.github/workflows/deploy-dashboard.yml`
- 주요 변경: public GitHub 레포의 tree API 응답에서 CTL 규칙 파일을 파싱하는 정적 대시보드 SPA를 추가함
- 주요 변경: 총 제출, 해결 문제, 정답률, 연속 풀이일 카드와 최근 30일/결과/사이트별 Chart.js 차트를 구현함
- 주요 변경: 사이트/결과 필터와 문제명 검색이 가능한 풀이 기록 테이블을 구현하고 GitHub Pages 배포 workflow를 추가함

## 발견한 기존 버그
- 대시보드가 없어서 P01~P04에서 쌓은 제출 이력을 사용자가 레포 바깥에서 통계로 확인할 방법이 없었음.
- CTL 경로가 숫자 문제 ID만 가진다는 가정은 LeetCode slug 기반 문제 ID에 맞지 않아, 대시보드 파서는 `문제ID. 제목` 형태를 더 넓게 받도록 구현함.

## 다음 Phase를 위한 메모
- P07 AI 피드백은 대시보드의 풀이 기록 테이블에 분석 상태/피드백 링크 컬럼을 추가하는 방식으로 자연스럽게 붙일 수 있음.
- GitHub API는 public 레포 기준 무인증 호출이므로 private 레포 지원은 별도 토큰 입력 UI가 필요함.

## 완료 기준 체크
- [x] `dashboard/index.html` 로컬 정적 파일 구조와 필수 DOM ID 검증됨
- [x] GitHub tree API 응답 형태의 샘플 데이터로 제출 데이터 파싱 검증됨
- [x] 4개 요약 카드 렌더링 로직 구현됨
- [x] 3개 Chart.js 차트 렌더링 로직 구현됨
- [x] 사이트/결과 필터 동작 로직 구현됨
- [x] 문제명 검색 동작 로직 구현됨
- [x] GitHub Actions workflow 파일 생성됨

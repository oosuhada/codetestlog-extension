# Algolog

Algolog는 코딩테스트 풀이의 전 과정을 기록하고, 제출 이력과 성장 흐름을 돌아볼 수 있게 돕는 Chrome 확장 프로그램입니다.

**English summary.** Algolog is a Chrome extension for preserving the full coding-test workflow instead of only the final accepted answer. It records submission attempts to GitHub, shows per-problem history in a Side Panel, supports multiple judge adapters, and can optionally connect a dashboard, Notion review notes, and AI feedback.

## 왜 만들었나 / Why I built it

코딩테스트를 풀 때 유명한 오픈소스 확장 프로그램인 **BaekjoonHub**를 사용했습니다. 편리했지만 GitHub에는 마지막으로 통과한 정답 코드만 남기 때문에, 그 전에 몇 분 동안 고민했는지, 몇 번 제출했는지, 어떤 코드가 오답·시간초과·런타임 에러였는지 같은 **풀이 과정 자체가 전부 사라지는 점**이 불편했습니다.

그 과정을 따로 손으로 기록하기보다 오픈소스인 BaekjoonHub를 기반으로 내가 필요한 방식으로 직접 고쳐 쓰기 시작했습니다. 최종 정답만 저장하는 대신 모든 제출 시도를 결과와 시각 정보와 함께 남기고, Side Panel에서 문제별 이력을 다시 볼 수 있게 확장한 것이 Algolog의 출발점입니다.

Algolog began as a customization of the open-source BaekjoonHub workflow I was already using. BaekjoonHub conveniently saved the final accepted solution, but all the failed attempts and the time spent getting there disappeared. I wanted the repository to preserve the learning process—not only the answer—so I extended the idea to record every submission, result, and per-problem history.

## 화면 / Product walkthrough

| Programmers | Baekjoon | Submission output |
| --- | --- | --- |
| ![Programmers integration](assets/extension/Programmers.gif) | ![Baekjoon integration](assets/extension/Baekjoon.gif) | ![Algolog submission output](assets/extension/output.gif) |

The GIFs above are captured from the extension workflow and make it possible to review the interaction model without installing the unpacked extension first.

## 핵심 기능

- 모든 제출 시도를 GitHub에 자동 커밋
- 정답, 오답, 시간초과, 런타임 에러 등 결과별 파일 기록
- Side Panel에서 커밋 성공 여부, 파일명, 현재 문제 시도 현황 확인
- 프로그래머스, 백준, SWEA, LeetCode 어댑터 기반 확장 구조
- 선택 기능으로 Notion 오답노트, GitHub Pages 대시보드, AI 피드백 제공

## 저장 규칙

```text
/{사이트명}/{레벨or티어}/{문제번호}. {문제명}/
  YYYYMMDD_HHMMSS_{result}_{문제명}.{ext}
```

예시:

```text
/프로그래머스/lv2/42586. 기능개발/
  20260501_143022_wrong_기능개발.py
  20260501_143311_correct_기능개발.py

/백준/silver/1000. A+B/
  20260501_150000_correct_A+B.py
```

## 로컬 설치

1. Chrome에서 `chrome://extensions`를 엽니다.
2. 오른쪽 위의 개발자 모드를 켭니다.
3. `압축해제된 확장 프로그램을 로드`를 눌러 이 저장소 폴더를 선택합니다.
4. Algolog 아이콘을 눌러 GitHub 인증과 저장소 연결을 진행합니다.

## 대시보드

[dashboard/index.html](dashboard/index.html)을 브라우저에서 열고 `username/repo-name` 형식으로 public 풀이 저장소를 입력하면 제출 통계를 확인할 수 있습니다.

GitHub Pages 배포는 [.github/workflows/deploy-dashboard.yml](.github/workflows/deploy-dashboard.yml)에서 관리합니다.

## AI 피드백

팝업의 `AI 피드백` 섹션에서 Groq, DeepSeek, OpenAI, Anthropic API Key를 직접 입력할 수 있습니다. 여러 키를 줄바꿈으로 저장하면 요청마다 순환 사용하며, 키를 설정하지 않아도 GitHub 커밋 기능은 그대로 동작합니다.

## 문서

작업 계획과 Phase별 로그는 [docs/tasks](docs/tasks) 아래에 정리되어 있습니다.

# 🪵 CodeTestLog

> 프로그래머스 풀이를 자동으로 GitHub에 기록해주는 크롬 확장프로그램

[![GitHub](https://img.shields.io/badge/GitHub-oosuhada%2Fcode--test--log-181717?style=flat-square&logo=github)](https://github.com/oosuhada/code-test-log)
[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?style=flat-square&logo=google-chrome&logoColor=white)](chrome://extensions)
[![Programmers](https://img.shields.io/badge/Programmers-지원-1e2d3d?style=flat-square)](https://programmers.co.kr)

---

## 📌 CodeTestLog란?

**CodeTestLog**는 [BaekjoonHub](https://github.com/BaekjoonHub/BaekjoonHub)를 기반으로 프로그래머스 전용으로 커스터마이징한 크롬 확장프로그램입니다.

문제를 풀면 **정답/오답/실행** 여부와 관계없이 자동으로 GitHub에 커밋되어, 단순한 정답 기록을 넘어 **전체 풀이 과정**을 시간순으로 추적할 수 있습니다.

### ✨ 주요 특징

- ✅ **정답뿐 아니라 오답·실행 기록까지** 자동 커밋
- 🕐 **타임스탬프 파일명** (`20260405_130000_run_문제명.py`) 으로 시간순 정렬
- 📝 **정답 시 README.md 자동 생성** — 복기 섹션 포함
- 👥 **스터디 그룹 공유 레포** 지원 (닉네임별 폴더 분리)
- 🔌 기존 BaekjoonHub 토큰 재사용 가능

---

## ⚙️ 설치 및 설정 가이드

### STEP 1. 소스코드 다운로드

터미널(또는 VS Code 터미널)에서 아래 명령어를 실행합니다.

```bash
git clone https://github.com/oosuhada/code-test-log.git
```

또는 GitHub 웹사이트에서 **Code → Download ZIP** 으로 다운받아 압축 해제해도 됩니다.

> ⚠️ 기존에 **백준허브(BaekjoonHub)** 가 설치되어 있다면 먼저 삭제하는 것을 권장합니다. 같은 페이지에서 충돌이 발생할 수 있습니다.

---

### STEP 2. 크롬 확장프로그램 설치

1. 크롬 주소창에 아래를 입력해 확장프로그램 관리 페이지로 이동합니다.
   ```
   chrome://extensions
   ```
2. 오른쪽 상단의 **개발자 모드**를 켭니다.
3. **압축 해제된 확장프로그램 로드 (Load unpacked)** 버튼을 클릭합니다.
4. STEP 1에서 클론하거나 압축 해제한 `code-test-log` 폴더를 선택하면 설치 완료입니다.

> 💡 설치 후 크롬 우측 상단 퍼즐 아이콘(🧩)에서 CodeTestLog를 **핀 고정**해두면 편리합니다.

---

### STEP 3. GitHub 토큰 입력

확장프로그램을 열면 GitHub Personal Access Token을 입력하는 화면이 나옵니다.

#### 이미 백준허브를 쓴 적 있다면?

백준허브 설치 시 발급한 토큰을 **그대로 재사용**할 수 있습니다. 저장해둔 토큰을 붙여넣으세요.

#### 토큰 새로 발급하는 방법

1. GitHub 로그인 → 우측 상단 프로필 아이콘 → **Settings**
2. 좌측 사이드바 최하단 **Developer settings** 클릭
3. **Personal access tokens → Tokens (classic)** 선택
4. **Generate new token (classic)** 클릭
5. Note(이름)는 자유롭게 입력, 권한은 **`repo` 항목만 체크**
6. **Generate token** 클릭 후 발급된 토큰 즉시 복사

> ⚠️ **토큰은 페이지를 벗어나면 다시 볼 수 없습니다.** 반드시 복사해두세요.

복사한 토큰을 확장프로그램 입력창에 붙여넣고 **Authenticate** 버튼을 클릭합니다.

---

### STEP 4. 스터디 레포지토리 연결

1. 확장프로그램 설정 페이지에서 **기존 레포지토리 연결 (Link an Existing Repository)** 선택
2. 아래 표에서 **본인 닉네임에 해당하는 주소**를 입력합니다.

   | 닉네임 | 입력할 주소 |
   |--------|------------|
   | oosu | `https://github.com/Minji6/algolog/tree/main/oosu` |
   | minji | `https://github.com/Minji6/algolog/tree/main/minji` |
   | Seunghyun | `https://github.com/Minji6/algolog/tree/main/Seunghyun` |

3. **Get Started** 버튼을 클릭하면 연결 완료입니다.

> ⚠️ 레포 주소만(`https://github.com/Minji6/algolog`) 입력하면 루트 폴더에 파일이 올라갑니다. **반드시 닉네임 폴더까지 포함**해서 입력하세요.

---

### STEP 5. 프로그래머스에서 문제 풀기

설정이 완료되면 이후부터는 완전 자동입니다. 아래 세 가지 상황에서 자동으로 GitHub에 커밋됩니다.

| 상황 | 생성되는 파일 예시 |
|------|-------------------|
| ▶️ **코드 실행** 버튼 클릭 | `20260405_130000_run_문자열 출력하기.py` |
| ❌ **제출 후 오답** | `20260405_130100_wrong_문자열 출력하기.py` |
| ✅ **제출 후 정답** | `20260405_130200_correct_문자열 출력하기.py` + `README.md` |

파일명 앞의 날짜·시간 덕분에 GitHub에서 **시간순으로 자동 정렬**되어, 풀이 과정 전체를 한눈에 볼 수 있습니다.

> 💡 **정답 커밋 시 자동 생성되는 `README.md`** 에는 오답 기록, 새로 배운 개념, 헷갈렸던 부분 등 복기용 섹션이 포함되어 있습니다. 풀고 나서 직접 채워넣으세요.

---

## 📁 레포지토리 구조 예시

```
algolog/
├── oosu/
│   └── 문자열 출력하기/
│       ├── 20260405_130000_run_문자열 출력하기.py
│       ├── 20260405_130100_wrong_문자열 출력하기.py
│       ├── 20260405_130200_correct_문자열 출력하기.py
│       └── README.md
├── minji/
│   └── ...
└── Seunghyun/
    └── ...
```

---

## 🔄 연결 변경 및 초기화

연결된 레포를 변경하고 싶다면:

1. 확장프로그램 설정 페이지 하단의 **"Linked the wrong repo? Unlink."** 클릭
2. 연결 해제 후 **STEP 4부터 다시 진행**

---

## ❓ 자주 묻는 질문 (FAQ)

**Q. 문제를 풀었는데 커밋이 안 돼요.**
- 확장프로그램이 활성화 상태인지 확인하세요 (크롬 아이콘이 컬러로 표시되어야 합니다).
- 레포 연결이 제대로 되어 있는지 확인하세요 (STEP 4 재확인).
- GitHub 토큰의 `repo` 권한이 포함되어 있는지 확인하세요.
- 토큰 만료 여부를 확인하고, 만료됐다면 STEP 3부터 다시 진행하세요.

**Q. 백준허브와 동시에 사용할 수 있나요?**
- 같은 페이지에서 충돌이 발생할 수 있어 권장하지 않습니다. 백준허브는 삭제 후 사용을 권장합니다.

**Q. Python 외 다른 언어도 지원하나요?**
- 프로그래머스에서 사용하는 모든 언어(Java, C++, JavaScript 등)를 지원합니다. 파일 확장자가 자동으로 설정됩니다.

**Q. 프라이빗 레포에도 연결할 수 있나요?**
- 네, GitHub 토큰에 `repo` 권한이 있다면 프라이빗 레포도 연결 가능합니다.

**Q. 확장프로그램 업데이트는 어떻게 하나요?**
- 소스코드 폴더에서 `git pull`로 최신 버전을 받은 후, `chrome://extensions` 페이지에서 새로고침(🔄) 버튼을 클릭하세요.

---

## 🛠️ 개발 정보

- **기반**: [BaekjoonHub](https://github.com/BaekjoonHub/BaekjoonHub) (오픈소스)
- **커스터마이징**: 프로그래머스 전용 + 오답·실행 기록 지원 + 타임스탬프 파일명 + 스터디 폴더 구조
- **소스코드**: [github.com/oosuhada/code-test-log](https://github.com/oosuhada/code-test-log)

---

## 📜 라이선스

MIT License — 자유롭게 포크하고 수정하여 사용하실 수 있습니다.

# code-test-log 프로젝트 작업 계획서

> BaekjoonHub 소스코드를 기반으로 커스텀한 크롬 확장 프로그램  
> 코딩테스트 제출 이력(정답/오답/코드 실행)을 GitHub에 자동 커밋하는 개인 학습 로그 도구

---
커밋 할때 폴더 설정, 파일명 방식 다르게, 날짜시간 저장되도록
#으로 넣은 주석들 MD 파일 뒷쪽에 추가되도록 업데이트하기

## 목표 기능

### ✅ 완료
- 프로그래머스 정답 제출 시 → GitHub 자동 커밋
- 오답 제출 시에도 → GitHub 자동 커밋 (`_wrong_타임스탬프` 파일명)
- 코드 실행 버튼 클릭 시 → GitHub 자동 커밋 (`_run_타임스탬프` 파일명)
- 코드 내 태그 주석(`[NOTE]`, `[WRONG]`, `[TODO]`) → `notes.md`로 별도 커밋
- 정답/오답/실행을 커밋 메시지로 구분 (`✅ 정답` / `❌ 오답` / `▶️ 코드 실행`)

### 🔲 예정
- GitHub Actions로 README 자동 업데이트 (문제 목록, 통계)
- 문제 풀이 자동 블로그화 → 포트폴리오 활용
- 스터디원 배포

---

## 전체 파일 구조

```
BaekjoonHub/  →  code-test-log/ 로 리네이밍 예정
├── assets/
│   ├── extension/          ← GIF 이미지 교체 필요
│   │   ├── Baekjoon.gif
│   │   ├── Programmers.gif
│   │   └── ...
│   ├── readme_icons/       ← 아이콘 교체 선택사항
│   └── thumbnail.png       ← 확장 프로그램 아이콘 교체 필요
├── css/
│   ├── baekjoon/inject.css
│   ├── goormlevel/inject.css
│   ├── programmers/inject.css
│   ├── swexpertacademy/inject.css
│   ├── popup.css
│   └── welcome.css
├── scripts/
│   ├── authorize.js        ← storage key 교체
│   ├── background.js       ← storage key 교체
│   ├── storage.js          ← storage key 교체 (핵심)
│   ├── i18n.js             ← 브랜딩 텍스트 교체
│   ├── oauth2.js           ← storage key 교체
│   ├── util.js             ← 공통 유틸, 수정 불필요
│   ├── baekjoon/
│   │   ├── parsing.js      ← 커밋 메시지 suffix 교체
│   │   ├── uploadfunctions.js ← 커밋 메시지 suffix 교체
│   │   └── util.js         ← DOM id/class 교체
│   ├── programmers/        ← 이미 수정 완료
│   │   ├── parsing.js      ✅
│   │   ├── programmers.js  ✅
│   │   ├── uploadfunctions.js ✅
│   │   └── util.js         ← DOM id/class 교체 필요
│   ├── swexpertacademy/
│   │   ├── parsing.js      ← 커밋 메시지 suffix 교체
│   │   ├── uploadfunctions.js ← 커밋 메시지 suffix 교체
│   │   ├── swexpertacademy.js ← extension= 쿼리파라미터 교체
│   │   └── util.js         ← DOM id/class 교체
│   └── goormlevel/
│       ├── parsing.js      ← 커밋 메시지 suffix 교체
│       └── util.js         ← DOM id/class 교체
├── manifest.json           ← 이름/저자/homepage 교체
├── popup.html              ← 브랜딩 텍스트 교체
├── popup.js                ← storage key 교체
├── welcome.html            ← 브랜딩 텍스트 교체
└── welcome.js              ← storage key + 초기 커밋 메시지 교체
```

---

## 작업 계획

### Phase 1. 브랜딩 교체 (텍스트/이름)

#### 1-1. `manifest.json`
| 현재 값 | 교체 값 |
|---|---|
| `"name": "백준허브(BaekjoonHub)"` | `"name": "code-test-log"` |
| `"description": "Automatically integrate your BOJ submissions to GitHub"` | `"description": "Automatically log your coding test submissions to GitHub"` |
| `"author": "flaxinger"` | `"author": "oosuhada"` |
| `"homepage_url": "https://github.com/BaekjoonHub/BaekjoonHub"` | `"homepage_url": "https://github.com/oosuhada/code-test-log"` |

#### 1-2. `scripts/storage.js` ← **가장 중요, 전체 기능 영향**

storage key가 `BaekjoonHub_*` 형태로 전체에 걸쳐 사용됨.  
아래 key들을 일괄 교체한다.

| 현재 key | 교체 key |
|---|---|
| `BaekjoonHub_token` | `CTL_token` |
| `BaekjoonHub_username` | `CTL_username` |
| `BaekjoonHub_hook` | `CTL_hook` |
| `BaekjoonHub_OrgOption` | `CTL_OrgOption` |
| `BaekjoonHub_disOption` | `CTL_disOption` |
| `BaekjoonHub_dirTemplate_${platform}` | `CTL_dirTemplate_${platform}` |
| `pipe_baekjoonhub` | `pipe_ctl` |

> ⚠️ storage key는 `storage.js` 외에 `authorize.js`, `oauth2.js`, `background.js`, `popup.js`, `welcome.js`에도 하드코딩되어 있으므로 모두 동일하게 교체해야 한다.

수정 대상 파일 및 위치:
```
scripts/storage.js      :3, 136, 144, 152, 158, 161, 175, 293, 298
scripts/authorize.js    :11, 104, 105
scripts/oauth2.js       :7, 28
scripts/background.js   :14, 15, 21, 27
popup.js                :18, 19, 36, 37, 38, 39, 54
welcome.js              :58, 129, 151, 153, 180, 203, 206, 264, 265, 273, 274, 288, 308, 309, 376, 391, 405, 440, 441, 449, 450
```

#### 1-3. 커밋 메시지 suffix 교체

`-BaekjoonHub` → `-code-test-log`

수정 대상 파일 및 위치:
```
scripts/baekjoon/parsing.js         :91
scripts/baekjoon/uploadfunctions.js :99, 183
scripts/swexpertacademy/parsing.js  :100, 333
scripts/swexpertacademy/uploadfunctions.js :117
scripts/goormlevel/parsing.js       :137
scripts/programmers/parsing.js      :116, 271  ← 이미 ✅/❌ 로 교체됨
scripts/programmers/uploadfunctions.js :173    ← 이미 수정됨
```

#### 1-4. DOM id/class 교체

`BaekjoonHub_progress_*` → `CTL_progress_*`  
`BJH_` → `CTL_`

> CSS와 JS가 같은 이름을 공유하므로 **반드시 쌍으로 교체**해야 함.

수정 대상 JS 파일:
```
scripts/programmers/util.js     :5, 8, 12, 30, 46, 88, 104, 107, 109, 113
scripts/baekjoon/util.js        :5, 8, 12, 30, 47, 159, 161, 165
scripts/baekjoon/baekjoon.js    :133, 139, 143, 149, 177
scripts/swexpertacademy/util.js :5, 8, 12, 29, 45, 94, 109, 112, 115, 119
scripts/goormlevel/util.js      :11, 15, 19, 39, 53
```

수정 대상 CSS 파일:
```
css/programmers/inject.css      :1, 5, 22, 31, 40, 43, 53, 68, 75, 85, 86, 92, 98
css/baekjoon/inject.css         :1, 5, 22, 31, 62, 105, 108, 118, 133, 140, 150, 151, 157, 163
css/swexpertacademy/inject.css  :1, 5, 22, 31, 40, 43, 53, 68, 75, 85, 86, 92, 98
css/goormlevel/inject.css       :1, 6, 23, 32, 41, 44, 54, 69, 76, 86, 87, 93, 99
```

#### 1-5. `scripts/i18n.js` — UI 텍스트 교체

`BaekjoonHub` → `code-test-log` 로 전체 교체  
수정 위치: `:6, 27, 28, 29, 30, 34, 35, 36, 37, 41, 66, 96, 97, 101`

#### 1-6. `scripts/swexpertacademy/swexpertacademy.js`

SW Expert Academy는 URL 쿼리파라미터로 확장을 식별함.  
```js
// 현재
currentUrl.includes('extension=BaekjoonHub')
`extension=BaekjoonHub`

// 교체
currentUrl.includes('extension=code-test-log')
`extension=code-test-log`
```
수정 위치: `:14, 56`

#### 1-7. `welcome.js` — 초기 커밋 메시지 교체
```js
// 현재 (:129)
{ message: 'Initial commit - BaekjoonHub', ... }

// 교체
{ message: 'Initial commit - code-test-log', ... }
```

#### 1-8. `popup.html` / `welcome.html` — UI 텍스트 교체

| 파일 | 위치 | 현재 | 교체 |
|---|---|---|---|
| `popup.html` | :48, 63, 64 | `BaekjoonHub` 링크/타이틀 | `code-test-log` GitHub 링크 |
| `welcome.html` | :44, 91, 156 | `BaekjoonHub` 텍스트 | `code-test-log` |

---

### Phase 2. 디자인 교체

#### 2-1. `assets/thumbnail.png` ← **확장 프로그램 아이콘**

manifest.json에서 16px / 48px / 128px 모두 이 파일을 참조함.  
원하는 로고 이미지로 교체. 포맷은 PNG, 크기는 최소 128x128 권장.

```json
"icons": {
  "16": "assets/thumbnail.png",
  "48": "assets/thumbnail.png",
  "128": "assets/thumbnail.png"
}
```

> 해상도별로 다른 이미지를 쓰고 싶다면 파일을 분리하고 manifest도 수정.

#### 2-2. `assets/extension/` — README용 GIF 이미지

현재 파일:
```
Baekjoon.gif        ← 백준 사용 예시
Programmers.gif     ← 프로그래머스 사용 예시
SWExpertAcademy.gif
goormlevel.gif
output.gif
uploadAll.gif
bookmark1.png
bookmark2.png
```

README.md를 새로 작성할 때 교체하거나 새로 캡처해서 추가.  
기능 완성 후 마지막에 작업 권장.

#### 2-3. `css/popup.css` / `css/welcome.css`

팝업 및 설정 페이지 스타일.  
색상 변수나 폰트를 바꾸고 싶다면 여기서 수정.  
현재 Semantic UI 기반이므로 테마 색상 위주로 수정하면 됨.

---

### Phase 3. README.md 전면 재작성

현재 README는 원본 BaekjoonHub의 것.  
아래 구조로 새로 작성 권장.

```markdown
# code-test-log

코딩테스트 제출 이력을 GitHub에 자동 커밋하는 크롬 확장 프로그램

## 기능
- ✅ 정답 / ❌ 오답 / ▶️ 코드 실행 자동 커밋
- [NOTE] [WRONG] [TODO] 태그 주석 → notes.md 자동 생성
- 프로그래머스 / 백준 / SW Expert Academy / 구름 지원

## 설치 방법
## 사용 방법
## 태그 주석 사용법
## TODO
```

---

### Phase 4. Process.md 업데이트

현재 `Process.md`에 `BaekjoonHub` 잔여 텍스트 있음.
```
:3  백준허브(BaekjoonHub) 소스코드를 기반으로...
:9  기본 (백준허브 수정)
:25 BaekjoonHub 소스코드 로컬 클론 완료
:26 경로: ~/Development/BaekjoonHub
```
작업 완료 시점에 현행화.

---

## 작업 우선순위 및 순서

| 순서 | 작업 | 파일 수 | 중요도 |
|---|---|---|---|
| 1 | storage key 전체 교체 (`BaekjoonHub_*` → `CTL_*`) | 7개 | 🔴 기능에 직접 영향 |
| 2 | manifest.json 이름/저자/url 교체 | 1개 | 🔴 확장 프로그램 식별 |
| 3 | DOM id/class JS + CSS 쌍으로 교체 | 9개 | 🟡 UI 표시 영향 |
| 4 | 커밋 메시지 suffix 교체 | 5개 | 🟡 커밋 메시지 정리 |
| 5 | i18n.js / popup.html / welcome.html 텍스트 교체 | 3개 | 🟢 표시 텍스트만 |
| 6 | swexpertacademy.js 쿼리파라미터 교체 | 1개 | 🟢 SWEA 사용 시 필요 |
| 7 | thumbnail.png 교체 | 1개 | 🟢 디자인 |
| 8 | README.md 재작성 | 1개 | 🟢 문서 |

---

## 빠른 일괄 교체 명령어

프로젝트 루트에서 실행. **실행 전 git commit으로 백업 권장.**

```bash
# 1. storage key 일괄 교체 (macOS sed)
find . -type f \( -name "*.js" -o -name "*.html" \) \
  ! -path "./library/*" ! -path "./_metadata/*" | xargs \
  sed -i '' \
  -e 's/BaekjoonHub_token/CTL_token/g' \
  -e 's/BaekjoonHub_username/CTL_username/g' \
  -e 's/BaekjoonHub_hook/CTL_hook/g' \
  -e 's/BaekjoonHub_OrgOption/CTL_OrgOption/g' \
  -e 's/BaekjoonHu_OrgOption/CTL_OrgOption/g' \
  -e 's/BaekjoonHub_disOption/CTL_disOption/g' \
  -e 's/BaekjoonHub_dirTemplate/CTL_dirTemplate/g' \
  -e 's/pipe_baekjoonhub/pipe_ctl/g' \
  -e 's/pipe_BaekjoonHub/pipe_ctl/g'

# 2. 커밋 메시지 suffix 교체
find . -type f -name "*.js" \
  ! -path "./library/*" | xargs \
  sed -i '' 's/-BaekjoonHub/-code-test-log/g'

# 3. DOM id/class 교체 (JS + CSS)
find . -type f \( -name "*.js" -o -name "*.css" \) \
  ! -path "./library/*" | xargs \
  sed -i '' \
  -e 's/BaekjoonHub_progress/CTL_progress/g' \
  -e 's/BJH_/CTL_/g'

# 4. 브랜딩 텍스트 교체 (html, js)
find . -type f \( -name "*.js" -o -name "*.html" -o -name "*.json" \) \
  ! -path "./library/*" | xargs \
  sed -i '' \
  -e 's/BaekjoonHub\/BaekjoonHub/oosuhada\/code-test-log/g' \
  -e 's/BaekjoonHub/code-test-log/g' \
  -e 's/백준허브/code-test-log/g' \
  -e 's/flaxinger/oosuhada/g'

# 5. swexpertacademy 쿼리파라미터 교체
sed -i '' 's/extension=BaekjoonHub/extension=code-test-log/g' \
  scripts/swexpertacademy/swexpertacademy.js
```

> ⚠️ 4번 명령어는 광범위하게 치환하므로 실행 후 `git diff`로 의도치 않은 변경이 없는지 반드시 확인.

---

## 교체 완료 후 검증

```bash
# 잔여 키워드가 남아있는지 최종 확인
grep -rn "BaekjoonHub\|백준허브\|baekjoonhub\|BJH_\|flaxinger" \
  --include="*.js" --include="*.json" \
  --include="*.html" --include="*.css" \
  --exclude-dir=library --exclude-dir=_metadata \
  .
# 결과가 없으면 완료
```
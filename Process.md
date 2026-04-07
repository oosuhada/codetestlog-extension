# code-test-log 프로젝트 개요

백준허브(BaekjoonHub) 소스코드를 기반으로, 프로그래머스에서 코드 제출 시 정답뿐만 아니라 오답과 주석까지 GitHub에 자동 커밋되는 커스텀 크롬 확장 프로그램을 제작한다.

---

## 목표 기능

### 기본 (백준허브 수정)

1. 프로그래머스 정답 제출 시 → GitHub 자동 커밋 (기존 기능)
2. 오답 제출 시에도 → GitHub 자동 커밋 (신규)
3. 코드 내 주석 내용 → notes.md로 별도 커밋 (신규)
4. 정답/오답을 커밋 메시지로 구분 (✅ 정답 / ❌ 오답)

### 확장 기능

5. GitHub Actions로 README 자동 업데이트 (문제 목록, 통계)
6. 문제 풀이 자동 블로그화 → 포트폴리오로 활용 가능

---

## 현재 상태

- BaekjoonHub 소스코드 로컬 클론 완료
- 경로: `~/Development/BaekjoonHub`
- Git remote 연결 없는 상태
- VS Code로 작업 중 (Mac)

---

## 수정한 핵심 파일 3개

### 1. `scripts/programmers/programmers.js`
- `getSolvedResult()` 반환값이 `'실패' | '오답' | '런타임' | '시간 초과' | '컴파일'`을 포함하는 경우에도 `beginUpload()` 호출하도록 수정
- `beginUpload(bojData, isPassed)` 함수 시그니처에 `isPassed` 플래그 추가
- 오답인 경우 중복 체크(SHA 비교) 로직 스킵 → 항상 새로 커밋

### 2. `scripts/programmers/parsing.js`
- `extractTaggedComments(code)` 함수 추가
  - 단일행 주석(`//`)과 블록 주석(`/* */`) 모두 파싱
  - `[NOTE]`, `[WRONG]`, `[TODO]` 태그가 포함된 주석만 추출
  - `{ notes: Array<{tag, content}>, hasNotes: boolean }` 반환
- `buildNotesMarkdown(title, problemId, notes)` 함수 추가
  - 태그별(📝 NOTE / ❌ WRONG / 🔧 TODO) 그룹핑하여 `notes.md` 마크다운 생성
- `parseData()`, `makeData()`, `fetchProblemCodeAndData()`, `makeDataForBulkUpload()` 에 `notes`, `hasNotes`, `notesMarkdown` 필드 추가

### 3. `scripts/programmers/uploadfunctions.js`
- `uploadOneSolveProblemOnGit(bojData, isPassed, cb)` 시그니처에 `isPassed` 추가
- `upload()` 함수 내 분기 처리:
  - **정답**: 기존 파일명 유지, README.md 포함 커밋, 커밋 메시지에 `[✅ 정답]` 추가
  - **오답**: 파일명에 타임스탬프 추가 (`wrong_1710000000.js`), README.md 제외, 커밋 메시지에 `[❌ 오답]` 추가
- `notes.md` 커밋 로직 추가: `bojData.hasNotes === true`인 경우 동일 커밋 트리에 `notes.md` 포함
- 일괄 업로드(`uploadAllSolvedProblemProgrammers`)에도 `notes.md` tree item 추가

---

## 작업 순서 및 진행 상태

- [x] Step 1. GitHub 새 레포 생성 및 연결
- [x] Step 2. 파일 3개 내용 확인
- [x] Step 3. `programmers.js` 수정 (오답 감지 추가, `isPassed` 플래그)
- [x] Step 4. `parsing.js` 수정 (주석 추출 `extractTaggedComments`, `buildNotesMarkdown`)
- [x] Step 5. `uploadfunctions.js` 수정 (커밋 분기 + `notes.md` 커밋)
- [ ] Step 6. 크롬 로컬 테스트
- [ ] Step 7. GitHub Actions 워크플로우 작성 (README 자동화, 통계)
- [ ] Step 8. 블로그 자동화 연동
- [ ] Step 9. 스터디원 배포

---

## TODO (우선순위 순)

### 🔴 즉시 필요 (테스트 전 확인)

- [ ] **오답 감지 키워드 검증**: 프로그래머스 실제 모달에서 오답 시 `h4` 텍스트가 정확히 어떤 문자열인지 확인 필요
  - 현재 감지 대상: `'실패'`, `'오답'`, `'런타임'`, `'시간 초과'`, `'컴파일'`
  - 실제 텍스트와 다를 경우 `programmers.js`의 `startLoader()` 내 조건문 수정 필요

- [ ] **크롬 확장 로컬 로드 테스트**
  1. `chrome://extensions/` → 개발자 모드 ON
  2. "압축해제된 확장 프로그램 로드" → 프로젝트 폴더 선택
  3. 프로그래머스 문제 제출(정답/오답 각각)해서 GitHub 커밋 확인

- [ ] **notes.md 태그 사용법 문서화** (README 또는 별도 USAGE.md에 추가)
  ```
  // [NOTE] 이 부분은 투포인터로 최적화 가능
  // [WRONG] 처음에 인덱스를 1부터 시작해서 틀렸음
  // [TODO] 예외처리 추가해야 함
  ```

### 🟡 다음 단계 (Step 7~9)

- [ ] **GitHub Actions 워크플로우 작성**
  - 트리거: `push`시 자동 실행
  - 기능: 레포 내 문제 목록 스캔 → 루트 `README.md` 자동 갱신 (레벨별 통계, 문제 링크 테이블)
  - 파일 위치: `.github/workflows/update-readme.yml`

- [ ] **통계 집계 스크립트 작성** (`scripts/stats.js` 또는 Python)
  - 정답/오답 커밋 수 집계
  - 레벨별(lv1~lv5) 문제 수 카운트
  - `notes.md` 존재 여부로 풀이 노트 작성률 계산

- [ ] **블로그 자동화 연동 검토**
  - 옵션 A: GitHub Pages + Jekyll (무료, 레포 내 직접)
  - 옵션 B: Notion API 연동 (노션에 문제 풀이 자동 동기화)
  - 옵션 C: Dev.to / Velog API 연동

- [ ] **스터디원 배포 준비**
  - `USAGE.md` 작성 (설치 방법, 태그 주석 사용법)
  - GitHub 레포 공개 전환
  - 스터디원에게 clone → 개발자 모드 로드 안내

### 🟢 개선 아이디어 (선택)

- [ ] 오답 횟수가 N회 이상이면 슬랙/디스코드 알림 보내기
- [ ] `[WRONG]` 태그 주석이 있는 문제를 별도 `WRONG_LOG.md`에 자동 누적
- [ ] 오답 파일들을 `wrong/` 서브폴더로 분리 관리
- [ ] 정답 전환 시 해당 `wrong_*` 파일들 자동 정리 커밋

---

## 스터디원과 공유하는 법 (무료, 개발자 모드)

### 방법 1 - 개발자 모드 직접 로드 (완전 무료)
1. 이 레포를 `git clone` 또는 ZIP 다운로드
2. 크롬 주소창 → `chrome://extensions/`
3. 우측 상단 **개발자 모드 ON**
4. "압축해제된 확장 프로그램 로드" 클릭
5. 다운받은 폴더 선택

✅ 무료 + 즉시 사용 가능 / 코드 수정 후 리로드만 하면 반영됨

### 방법 2 - GitHub 레포 공유
1. GitHub 레포 URL을 스터디원에게 공유
2. 스터디원이 clone 후 방법 1로 로드
3. 업데이트 시 `git pull` 후 리로드

✅ 팀 단위 사용에 적합 / 버전 관리 가능
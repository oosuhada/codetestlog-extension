/*
 * [CTL Analysis - P01]
 * 제출 감지 방식: programmers.js가 제출 버튼 클릭 후 결과 모달을 폴링하고, 결과가 준비되면 parseData()를 호출한다.
 * 결과 판별 위치: programmers.js의 getSolvedResultInfo()와 normalizeProgrammersResult().
 * 정답/오답 분기: uploadfunctions.js의 uploadOneSolveProblemOnGit()이 CTL_RESULT 기반으로 커밋 경로/파일명/메시지를 생성한다.
 *
 * 발견한 버그:
 *   - BUG-1: data-challenge-level 원시값을 그대로 써서 `0` 같은 숫자 단독 레벨 폴더가 생길 수 있다.
 *   - BUG-2: 파일명/경로 생성 책임이 parsing.js와 uploadfunctions.js에 흩어져 결과별 파일 생성 규칙이 중복된다.
 *
 * 기존 스토리지 키 목록: (마이그레이션 대상)
 *   - 'BaekjoonHub_dirTemplate_${platform}' → ctl_dir_template_${platform}
 *   - 'BaekjoonHub_userPrefix' → ctl_user_prefix
 */

/*
  문제가 맞았다면 문제 관련 데이터를 파싱하는 함수의 모음입니다.
  모든 해당 파일의 모든 함수는 parseData()를 통해 호출됩니다.
*/

/*
  bojData를 초기화하는 함수로 문제 요약과 코드를 파싱합니다.
  - directory : 레포에 기록될 폴더명
  - message : 커밋 메시지
  - fileName : 파일명
  - readme : README.md에 작성할 내용
  - code : 소스코드 내용
  - notes : 코드 내 태그 주석 ([NOTE], [WRONG], [TODO]) 추출 내용
*/
function reconstructFillBlankCode(node) {
  let result = '';
  for (const child of node.childNodes) {
    if (child.tagName === 'INPUT') {
      result += child.value;
    } else if (child.childNodes && child.childNodes.length > 0) {
      result += reconstructFillBlankCode(child);
    } else {
      result += child.textContent;
    }
  }
  return result;
}

/**
 * 코드에서 [NOTE], [WRONG], [TODO] 태그가 포함된 주석을 추출합니다.
 * 단일행 주석(//) 만 지원합니다.
 * @param {string} code - 소스코드 문자열
 * @returns {{ hasNotes: boolean, notesMarkdown: string }}
 */
function extractTaggedComments(code) {
  const tags = ['NOTE', 'WRONG', 'TODO'];
  let notes = '';
  let hasNotes = false;

  tags.forEach((tag) => {
    const regex = new RegExp(`\\/\\/\\s*\\[${tag}\\](.*)`, 'g');
    const matches = code.matchAll(regex);
    for (const match of matches) {
      notes += `- **${tag}**: ${match[1].trim()}\n`;
      hasNotes = true;
    }
  });

  return {
    hasNotes,
    notesMarkdown: notes ? `### 풀이 노트\n\n${notes}` : '',
  };
}

/**
 * 프로그래머스 문제 ID 파싱
 * 반환: 문자열 문제 ID 또는 "unknown"
 */
function parseProgrammersProblemId(doc = document) {
  try {
    const lessonEl = doc.querySelector('.lesson-content') || doc.querySelector('[data-lesson-id]');
    const id = lessonEl && lessonEl.getAttribute('data-lesson-id');
    if (id) return String(id).trim();
  } catch (_) {}

  try {
    const match = (doc.location ? doc.location.href : window.location.href).match(/lessons\/(\d+)/);
    if (match) return match[1];
  } catch (_) {}

  return 'unknown';
}

/**
 * 프로그래머스 문제 제목 파싱
 * 반환: 제목 또는 "unknown"
 */
function parseProgrammersTitle(doc = document) {
  try {
    const titleEl = doc.querySelector('.algorithm-title .challenge-title')
      || doc.querySelector('.challenge-title')
      || doc.querySelector('h2');
    const title = titleEl && titleEl.textContent.replace(/\\n/g, '').trim();
    if (title) return title;
  } catch (_) {}

  try {
    const title = doc.title.replace(/프로그래머스|코딩테스트 연습|[|:-]/g, '').trim();
    if (title) return title;
  } catch (_) {}

  return 'unknown';
}

/**
 * 프로그래머스 문제 레벨 파싱
 * 반환: "lv0"~"lv5" 또는 "lv?" (실패 시)
 * 절대 undefined, null, 빈 문자열 반환 금지
 */
function parseProgrammersLevel(doc = document) {
  try {
    const lessonEl = doc.querySelector('.lesson-content') || doc.querySelector('[data-challenge-level]');
    const level = lessonEl && lessonEl.getAttribute('data-challenge-level');
    if (level !== null && level !== undefined && `${level}`.trim() !== '') {
      const match = `${level}`.match(/\d/);
      return match ? `lv${match[0]}` : `lv${level}`.toLowerCase();
    }
  } catch (_) {}

  try {
    const badge = doc.querySelector('.level-badge, [class*="level"]');
    if (badge) {
      const text = badge.textContent.trim();
      const match = text.match(/Lv\.?\s*(\d)/i);
      if (match) return `lv${match[1]}`;
    }
  } catch (_) {}

  try {
    const title = doc.title;
    const match = title.match(/Lv\.?\s*(\d)/i);
    if (match) return `lv${match[1]}`;
  } catch (_) {}

  return 'lv?';
}

/**
 * 프로그래머스 언어 파싱
 * 반환: 언어명 또는 "Unknown"
 */
function parseProgrammersLanguage(doc = document) {
  try {
    const language = doc.querySelector('div#tour7 > button, .language-select button');
    const text = language && language.textContent.trim();
    if (text) return text;
  } catch (_) {}

  try {
    const langTab = doc.querySelector('div.editor > ul > li.nav-item > a, .editor .nav-item a');
    const text = langTab && langTab.textContent.trim();
    if (text) return text.split('.')[0] || text;
  } catch (_) {}

  return 'Unknown';
}

function parseProgrammersLanguageExtension(doc = document, language = 'Unknown') {
  try {
    const langTab = doc.querySelector('div.editor > ul > li.nav-item > a, .editor .nav-item a');
    const text = langTab && langTab.textContent.trim();
    const ext = text && text.split('.').pop();
    if (ext && ext !== text) return ext;
  } catch (_) {}

  return langToExt(language);
}



async function parseData() {
  const link = document.querySelector('head > meta[name$=url]').content.replace(/\?.*/g, '').trim();
  const problemId = parseProgrammersProblemId();
  const level = parseProgrammersLevel();
  const division = [...document.querySelector('ol.breadcrumb').childNodes]
    .filter((x) => x.className !== 'active')
    .map((x) => x.innerText)
    .map((x) => convertSingleCharToDoubleChar(x))
    .reduce((a, b) => `${a}/${b}`);
  const title = parseProgrammersTitle();
  const problem_description = document.querySelector('div.guide-section-description > div.markdown').innerHTML;
  const language = parseProgrammersLanguage();
  const language_extension = parseProgrammersLanguageExtension(document, language);
  const codeTextarea = document.querySelector('textarea#code');
  const codeMirrorEl = document.querySelector('.CodeMirror');
  const fillBlankInputs = document.querySelectorAll('input[name^="input_code"]');
  let code;
  if (codeMirrorEl && codeMirrorEl.CodeMirror) {
    code = codeMirrorEl.CodeMirror.getValue();
  } else if (codeTextarea) {
    code = codeTextarea.value;
  } else if (fillBlankInputs.length > 0) {
    const pre = fillBlankInputs[0].closest('pre');
    code = reconstructFillBlankCode(pre);
  } else {
    code = '';
  }
  const result_message =
    [...document.querySelectorAll('#output .console-message')]
      .map((node) => node.textContent)
      .filter((text) => text.includes(':'))
      .reduce((cur, next) => (cur ? `${cur}<br/>${next}` : next), '') || 'Empty';
  const [runtime, memory] = [...document.querySelectorAll('td.result.passed')]
    .map((x) => x.innerText)
    .map((x) => x.replace(/[^., 0-9a-zA-Z]/g, '').trim())
    .map((x) => x.split(', '))
    .reduce((x, y) => (Number(x[0].slice(0, -2)) > Number(y[0].slice(0, -2)) ? x : y), ['0.00ms', '0.0MB'])
    .map((x) => x.replace(/(?<=[0-9])(?=[A-Za-z])/, ' '));

  /*프로그래밍 언어별 폴더 정리 옵션을 위한 언어 값 가져오기*/
  // 태그 주석 추출
  const { hasNotes, notesMarkdown } = extractTaggedComments(code);

  return makeData({ link, problemId, level, title, problem_description, division, language_extension, code, result_message, runtime, memory, language, hasNotes, notesMarkdown });
}

async function makeData(origin) {
  const { problem_description, problemId, level, result_message, division, language_extension, title, runtime, memory, code, language, hasNotes, notesMarkdown, link } = origin;
  const directory = buildCommitPath('프로그래머스', level, problemId, title);
  const levelWithLv = `${level}`.includes('lv') ? level : `lv${level}`.replace('lv', 'level ');
  const message = `[${levelWithLv}] Title: ${title}, Time: ${runtime}, Memory: ${memory} -CodeTestLog`;
  const fileName = `${convertSingleCharToDoubleChar(title)}.${language_extension}`;
  const dateInfo = getDateString(new Date(Date.now()));
  const readme =
    `# [${levelWithLv}] ${title} - ${problemId} \n\n`
    + `[문제 링크](${link}) \n\n`
    + `### 성능 요약\n\n`
    + `메모리: ${memory}, `
    + `시간: ${runtime}\n\n`
    + `### 구분\n\n`
    + `${division.replace('/', ' > ')}\n\n`
    + `### 채점결과\n\n`
    + `${result_message}\n\n`
    + `### 제출 일자\n\n`
    + `${dateInfo}\n\n`
    + `### 문제 설명\n\n`
    + `${problem_description}\n\n`
    + `> 출처: 프로그래머스 코딩 테스트 연습, https://school.programmers.co.kr/learn/challenges\n\n`
    + `---\n\n`
    + `## 🗒️ 풀이 노트\n\n`
    + `### ❌ 오답 기록\n\n`
    + `> 틀렸던 코드와 이유를 기록해두세요.\n\n`
    + `\`\`\`python\n`
    + `# 오답 코드\n`
    + `\`\`\`\n\n`
    + `### ✅ 정답 풀이\n\n`
    + `> 최종 정답 코드와 핵심 아이디어를 메모하세요.\n\n`
    + `\`\`\`python\n`
    + `# 정답 코드\n`
    + `\`\`\`\n\n`
    + `### 💡 새로 배운 개념\n\n`
    + `> 이 문제를 통해 새로 알게 된 함수, 문법, 패턴을 정리하세요.\n\n`
    + `-\n\n`
    + `### 🔁 헷갈렸던 부분\n\n`
    + `> 헷갈렸거나 실수하기 쉬운 부분을 기록하세요.\n\n`
    + `-\n\n`
    + `### 📌 다음에 기억할 것\n\n`
    + `> 다음에 비슷한 문제를 풀 때 떠올려야 할 핵심 포인트를 적어두세요.\n\n`
    + `-\n`;

  return {
    problemId,
    level,
    title,
    language,
    language_extension,
    directory,
    message,
    fileName,
    readme,
    code,
    notesMarkdown,
    hasNotes,
  };
}

/**
 * stats에서 이미 업로드된 프로그래머스 문제 ID를 추출합니다.
 */
function extractUploadedProblemIdsForProgrammers(stats, hook) {
  const uploadedIds = new Set();
  if (isNull(stats) || isNull(stats.submission) || isNull(hook)) return uploadedIds;

  const parts = hook.split('/');
  if (parts.length < 2) return uploadedIds;
  const owner = parts[0];
  const repo = parts[1];

  const ownerObj = stats.submission[owner];
  if (isNull(ownerObj)) return uploadedIds;
  const repoObj = ownerObj[repo];
  if (isNull(repoObj)) return uploadedIds;

  function extractFromNode(node) {
    if (isNull(node)) return;
    for (const key of Object.keys(node)) {
      const match = key.match(/^(\d+)/);
      if (match) {
        uploadedIds.add(match[1]);
      }
    }
  }

  // 직접 모드: submission[owner][repo]["프로그래머스"]["12345.제목"]
  if (!isNull(repoObj['프로그래머스'])) {
    extractFromNode(repoObj['프로그래머스']);
  }

  // language 모드: submission[owner][repo][lang]["프로그래머스"]["12345.제목"]
  for (const key of Object.keys(repoObj)) {
    if (key === '프로그래머스') continue;
    const langNode = repoObj[key];
    if (!isNull(langNode) && typeof langNode === 'object' && !isNull(langNode['프로그래머스'])) {
      extractFromNode(langNode['프로그래머스']);
    }
  }

  return uploadedIds;
}

/**
 * 프로그래머스 풀이 목록 페이지에서 모든 풀이 완료된 문제를 파싱합니다.
 */
async function findAllSolvedProblems() {
  const problems = [];
  let page = 1;
  while (true) {
    const res = await fetch(`/api/v2/school/challenges/?perPage=100&statuses[]=solved&order=acceptance_desc&search=&page=${page}`);
    if (!res.ok) break;
    const data = await res.json();
    if (!data.result || data.result.length === 0) break;
    for (const item of data.result) {
      problems.push({
        problemId: String(item.id),
        title: item.title,
        level: `lv${item.level}`,
      });
    }
    if (page >= data.totalPages) break;
    page++;
  }
  return problems;
}

/**
 * 개별 문제 페이지에서 코드와 메타데이터를 가져옵니다.
 */
async function fetchProblemCodeAndData(problemInfo) {
  const { problemId, title, level } = problemInfo;
  try {
    const res = await fetch(`/learn/courses/30/lessons/${problemId}`);
    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');

    // Extract code from textarea#code
    const codeEl = doc.querySelector('textarea#code');
    const code = codeEl ? codeEl.value : '';
    if (!code) return null;

    // Extract language extension from editor tab
    const langTab = doc.querySelector('div.editor ul li.nav-item a, .editor .nav-item a');
    const language_extension = langTab ? langTab.textContent.trim().split('.').pop() : 'txt';

    // Extract problem description
    const descEl = doc.querySelector('div.guide-section-description > div.markdown');
    const problem_description = descEl ? descEl.innerHTML : '';

    // Extract division from breadcrumb
    const breadcrumb = doc.querySelector('ol.breadcrumb');
    const division = breadcrumb
      ? [...breadcrumb.querySelectorAll('li')]
          .filter((x) => !x.classList.contains('active'))
          .map((x) => x.textContent.trim())
          .map((x) => convertSingleCharToDoubleChar(x))
          .filter((x) => x)
          .join('/')
      : '코딩테스트 연습';

    // Extract language name for org option
    const langBtnEl = doc.querySelector('div#tour7 > button, .language-select button');
    const language = langBtnEl ? langBtnEl.textContent.trim() : language_extension;

    const link = `https://school.programmers.co.kr/learn/courses/30/lessons/${problemId}`;

    // 태그 주석 추출 (일괄 업로드 시에도 적용)
    const { hasNotes, notesMarkdown } = extractTaggedComments(code);

    return await makeDataForBulkUpload({ link, problemId, level, title, problem_description, division, language_extension, code, language, hasNotes, notesMarkdown });
  } catch (e) {
    console.error(`Failed to fetch problem ${problemId}:`, e);
    return null;
  }
}

/**
 * 일괄 업로드용 데이터를 생성합니다.
 */
async function makeDataForBulkUpload(origin) {
  const { problem_description, problemId, level, division, language_extension, title, code, language, link, hasNotes, notesMarkdown } = origin;
  const directory = await buildDirectory('programmers', {
    platform: '프로그래머스',
    level,
    id: problemId,
    title: convertSingleCharToDoubleChar(title),
    language,
    _defaultDir: `프로그래머스/${level}/${problemId}. ${convertSingleCharToDoubleChar(title)}`,
  });
  const levelWithLv = `${level}`.includes('lv') ? level : `lv${level}`.replace('lv', 'level ');
  const message = `[${levelWithLv}] Title: ${title} -CodeTestLog`;
  const fileName = `${convertSingleCharToDoubleChar(title)}.${language_extension}`;
  const dateInfo = getDateString(new Date(Date.now()));
  const readme =
    `# [${levelWithLv}] ${title} - ${problemId} \n\n`
    + `[문제 링크](${link}) \n\n`
    + `### 구분\n\n`
    + `${division.replace('/', ' > ')}\n\n`
    + `### 제출 일자\n\n`
    + `${dateInfo}\n\n`
    + `### 문제 설명\n\n`
    + `${problem_description}\n\n`
    + `> 출처: 프로그래머스 코딩 테스트 연습, https://school.programmers.co.kr/learn/challenges`;

  return { problemId, directory, message, fileName, readme, code, notesMarkdown, hasNotes };
}

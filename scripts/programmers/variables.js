/* Algolog의 전역 변수 선언 파일입니다. */

// ─── CTL: 제출 결과 타입 ──────────────────────────────────────────────────────
const CTL_RESULT = {
  CORRECT:        'correct',
  WRONG:          'wrong',
  TIMEOUT:        'timeout',
  RUNTIME_ERROR:  'runtime_error',
  COMPILE_ERROR:  'compile_error',
  MEMORY_EXCEEDED:'memory_exceeded',
  PARTIAL:        'partial',
  RUN:            'run',
};

// 프로그래머스 DOM 텍스트 → CTL_RESULT 매핑
const PROGRAMMERS_RESULT_MAP = {
  '통과':       CTL_RESULT.CORRECT,
  '정답':       CTL_RESULT.CORRECT,
  '정답입니다': CTL_RESULT.CORRECT,
  '실패':       CTL_RESULT.WRONG,
  '틀렸습니다': CTL_RESULT.WRONG,
  '시간 초과':  CTL_RESULT.TIMEOUT,
  '런타임 에러':CTL_RESULT.RUNTIME_ERROR,
  '컴파일 에러':CTL_RESULT.COMPILE_ERROR,
  '메모리 초과':CTL_RESULT.MEMORY_EXCEEDED,
  '부분 점수':  CTL_RESULT.PARTIAL,
};
const PROGRAMMERS_RESULT_PRIORITY = [
  '컴파일 에러',
  '런타임 에러',
  '시간 초과',
  '메모리 초과',
  '실패',
  '틀렸습니다',
  '부분 점수',
  '정답입니다',
  '정답',
  '통과',
];

// 정답 여부 판별
const isCorrectResult = (result) => result === CTL_RESULT.CORRECT;
// ─────────────────────────────────────────────────────────────────────────────

const LANG_EXT_MAP = {
  'Python':     'py',
  'Python3':    'py',
  'Java':       'java',
  'C++':        'cpp',
  'C':          'c',
  'JavaScript': 'js',
  'TypeScript': 'ts',
  'Kotlin':     'kt',
  'Swift':      'swift',
  'Go':         'go',
  'Rust':       'rs',
  'Ruby':       'rb',
};

function langToExt(lang) {
  return LANG_EXT_MAP[lang] || 'txt';
}

function normalizeProgrammersResult(rawResult, fallbackToWrong = false) {
  if (Object.values(CTL_RESULT).includes(rawResult)) return rawResult;
  const text = `${rawResult || ''}`.replace(/\s+/g, ' ').trim();
  if (!text) return null;

  for (const raw of PROGRAMMERS_RESULT_PRIORITY) {
    if (text.includes(raw)) return PROGRAMMERS_RESULT_MAP[raw];
  }

  return fallbackToWrong ? CTL_RESULT.WRONG : null;
}

/* state of upload for progress */
const uploadState = { uploading: false };

const multiloader = {
  wrap: null,
  nom: null,
  denom: null,
};

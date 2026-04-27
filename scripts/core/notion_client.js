const CTL_NOTION_VERSION = '2022-06-28';
const CTL_NOTION_MAX_CODE_LENGTH = 2000;

async function getNotionConfig() {
  return new Promise((resolve) => {
    chrome.storage.local.get(
      [CTL_STORAGE_KEYS.notionToken, CTL_STORAGE_KEYS.notionDbId],
      (result) => resolve({
        token: `${result[CTL_STORAGE_KEYS.notionToken] || ''}`.trim(),
        dbId: normalizeNotionDatabaseId(result[CTL_STORAGE_KEYS.notionDbId]),
      }),
    );
  });
}

function normalizeNotionDatabaseId(rawDbId) {
  const text = `${rawDbId || ''}`.trim();
  if (!text) return '';
  const compact = text.replace(/-/g, '');
  const match = compact.match(/[0-9a-fA-F]{32}/);
  return match ? match[0] : text;
}

function toNotionSelectName(value, fallback = 'unknown') {
  const text = `${value || ''}`.trim();
  return text || fallback;
}

function toNotionTitle(value) {
  return `${value || 'unknown'}`.trim() || 'unknown';
}

function buildNotionEntryBody(entry) {
  const needsReview = entry.result !== 'correct';
  const body = {
    parent: { database_id: entry.dbId },
    properties: {
      문제명: {
        title: [{ text: { content: toNotionTitle(entry.title) } }],
      },
      사이트: {
        select: { name: toNotionSelectName(entry.site) },
      },
      레벨: {
        select: { name: toNotionSelectName(entry.level) },
      },
      결과: {
        select: { name: toNotionSelectName(entry.result, 'wrong') },
      },
      언어: {
        select: { name: toNotionSelectName(entry.language, 'Unknown') },
      },
      시도횟수: {
        number: Number(entry.attemptCount || 1),
      },
      날짜: {
        date: { start: entry.submittedAt || new Date().toISOString() },
      },
      리뷰필요: {
        checkbox: needsReview,
      },
      GitHub링크: {
        url: entry.githubUrl || null,
      },
      메모: {
        rich_text: [],
      },
    },
  };

  if (entry.code) {
    body.children = [{
      object: 'block',
      type: 'code',
      code: {
        rich_text: [{
          type: 'text',
          text: { content: `${entry.code}`.slice(0, CTL_NOTION_MAX_CODE_LENGTH) },
        }],
        language: toNotionLang(entry.language),
      },
    }];
  }

  return body;
}

async function createNotionEntry(entry) {
  const { token, dbId } = await getNotionConfig();
  if (!token || !dbId) {
    console.log('[ALG] Notion is not configured. Skipping optional record.');
    return { skipped: true };
  }

  try {
    const res = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Notion-Version': CTL_NOTION_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(buildNotionEntryBody({ ...entry, dbId })),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const message = err.message || `Notion API error: ${res.status}`;
      console.error('[ALG] Notion record failed:', err);
      return { success: false, error: message };
    }

    console.log('[ALG] Notion record created:', entry.title);
    return { success: true };
  } catch (error) {
    console.error('[ALG] Notion network error:', error);
    return { success: false, error: error.message };
  }
}

async function testNotionConnection() {
  const { token, dbId } = await getNotionConfig();
  if (!token || !dbId) {
    return { success: false, error: '토큰 또는 DB ID 미입력' };
  }

  try {
    const res = await fetch(`https://api.notion.com/v1/databases/${dbId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Notion-Version': CTL_NOTION_VERSION,
      },
    });

    if (res.ok) return { success: true };
    const err = await res.json().catch(() => ({}));
    return { success: false, error: err.message || `Notion API error: ${res.status}` };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function toNotionLang(lang) {
  const map = {
    Python: 'python',
    Python3: 'python',
    'Python 3': 'python',
    PyPy3: 'python',
    Java: 'java',
    JavaScript: 'javascript',
    'JavaScript (Node.js)': 'javascript',
    TypeScript: 'typescript',
    'C++': 'c++',
    'C++17': 'c++',
    'C++14': 'c++',
    'C++11': 'c++',
    C: 'c',
    C11: 'c',
    Kotlin: 'kotlin',
    'Kotlin (JVM)': 'kotlin',
    Swift: 'swift',
    Go: 'go',
    Rust: 'rust',
    Ruby: 'ruby',
  };
  return map[lang] || 'plain text';
}

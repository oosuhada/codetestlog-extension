// ─── CodeTestLog Storage Key Namespace ───────────────────────────────────────
// 기존 BaekjoonHub 키는 migrateLegacyStorageKeys()에서 ctl_ 키로 보존 이전한다.
var CTL_STORAGE_KEYS = globalThis.CTL_STORAGE_KEYS || {
  attemptCount: (site, problemId) => `ctl_attempt_${site}_${problemId}`,
  dirTemplate:  (platform) => `ctl_dir_template_${platform}`,
  githubToken:  'ctl_github_token',
  githubRepo:   'ctl_github_repo',
  githubRepoUrl: 'ctl_github_repo_url',
  githubUsername: 'ctl_github_username',
  notionToken:  'ctl_notion_token',
  notionDbId:   'ctl_notion_db_id',
  aiProvider:   'ctl_ai_provider',
  aiApiKey:     'ctl_ai_api_key',
  isEnabled:    'ctl_is_enabled',
  oauthPipe:    'ctl_oauth_pipe',
  modeType:     'ctl_mode_type',
  stats:        'ctl_stats',
  orgOption:    'ctl_org_option',
  userPrefix:   'ctl_user_prefix',
  saveExamples: 'ctl_save_examples',
  theme:        'ctl_theme',
  language:     'ctl_language',
};
globalThis.CTL_STORAGE_KEYS = CTL_STORAGE_KEYS;

var CTL_LEGACY_KEY_MAP = globalThis.CTL_LEGACY_KEY_MAP || {
  BaekjoonHub_token: CTL_STORAGE_KEYS.githubToken,
  BaekjoonHub_username: CTL_STORAGE_KEYS.githubUsername,
  BaekjoonHub_hook: CTL_STORAGE_KEYS.githubRepo,
  repo: CTL_STORAGE_KEYS.githubRepoUrl,
  BaekjoonHub_OrgOption: CTL_STORAGE_KEYS.orgOption,
  BaekjoonHub_disOption: CTL_STORAGE_KEYS.orgOption,
  BaekjoonHub_userPrefix: CTL_STORAGE_KEYS.userPrefix,
  bjhEnable: CTL_STORAGE_KEYS.isEnabled,
  bjhSaveExamples: CTL_STORAGE_KEYS.saveExamples,
  bjh_theme: CTL_STORAGE_KEYS.theme,
  bjh_lang: CTL_STORAGE_KEYS.language,
  mode_type: CTL_STORAGE_KEYS.modeType,
  stats: CTL_STORAGE_KEYS.stats,
  pipe_baekjoonhub: CTL_STORAGE_KEYS.oauthPipe,
  pipe_BaekjoonHub: CTL_STORAGE_KEYS.oauthPipe,
};
globalThis.CTL_LEGACY_KEY_MAP = CTL_LEGACY_KEY_MAP;

var CTL_TEMPLATE_PLATFORMS = globalThis.CTL_TEMPLATE_PLATFORMS || [
  'baekjoon',
  'programmers',
  'swea',
  'goormlevel',
];
globalThis.CTL_TEMPLATE_PLATFORMS = CTL_TEMPLATE_PLATFORMS;

function ctlChromeGet(keys) {
  return new Promise((resolve) => {
    chrome.storage.local.get(keys, resolve);
  });
}

function ctlChromeSet(obj) {
  return new Promise((resolve) => {
    chrome.storage.local.set(obj, resolve);
  });
}

function ctlChromeRemove(keys) {
  return new Promise((resolve) => {
    chrome.storage.local.remove(keys, resolve);
  });
}

async function migrateLegacyStorageKeys() {
  const legacyKeys = Object.keys(CTL_LEGACY_KEY_MAP);
  const legacyData = await ctlChromeGet(legacyKeys);
  const nextData = {};
  const removeKeys = [];

  for (const [oldKey, newKey] of Object.entries(CTL_LEGACY_KEY_MAP)) {
    if (legacyData[oldKey] !== undefined) {
      const current = await ctlChromeGet([newKey]);
      if (current[newKey] === undefined && nextData[newKey] === undefined) {
        nextData[newKey] = legacyData[oldKey];
      }
      removeKeys.push(oldKey);
    }
  }

  for (const platform of CTL_TEMPLATE_PLATFORMS) {
    const oldKey = `BaekjoonHub_dirTemplate_${platform}`;
    const newKey = CTL_STORAGE_KEYS.dirTemplate(platform);
    const data = await ctlChromeGet([oldKey, newKey]);
    if (data[oldKey] !== undefined) {
      if (data[newKey] === undefined) {
        nextData[newKey] = data[oldKey];
      }
      removeKeys.push(oldKey);
    }
  }

  if (Object.keys(nextData).length > 0) {
    await ctlChromeSet(nextData);
  }
  if (removeKeys.length > 0) {
    await ctlChromeRemove(removeKeys);
  }

  console.log('[CTL] 스토리지 마이그레이션 완료');
}

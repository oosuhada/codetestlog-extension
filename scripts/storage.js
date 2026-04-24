// ─── CodeTestLog Storage Key Namespace ───────────────────────────────────────
// P01 이후 모든 스토리지 키는 이 객체를 통해 사용한다.
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
// ─────────────────────────────────────────────────────────────────────────────

/* Sync to local storage */
const ctlStorageReady = syncLegacyStorageToLocal()
  .then(() => migrateLegacyStorageKeys())
  .then(() => initializeCtlStorageDefaults());

async function syncLegacyStorageToLocal() {
  const legacyKeys = Object.keys(CTL_LEGACY_KEY_MAP || {});
  return new Promise((resolve) => {
    chrome.storage.local.get('isSync', (data) => {
      if (data && data.isSync) {
        console.log('CodeTestLog Local storage already synced!');
        resolve();
        return;
      }

      chrome.storage.sync.get(legacyKeys, (syncData) => {
        const values = {};
        legacyKeys.forEach((key) => {
          if (syncData[key] !== undefined) {
            values[key] = syncData[key];
          }
        });

        chrome.storage.local.set({ ...values, isSync: true }, () => {
          console.log('CodeTestLog Synced to local values');
          resolve();
        });
      });
    });
  });
}

async function initializeCtlStorageDefaults() {
  const stats = (await getObjectFromLocalStorage(CTL_STORAGE_KEYS.stats)) || {};
  if (isNull(stats.version)) stats.version = '0.0.0';
  if (isNull(stats.branches) || stats.version !== getVersion()) stats.branches = {};
  if (isNull(stats.submission)) stats.submission = {};
  if (isNull(stats.problems) || stats.version !== getVersion()) stats.problems = {};
  await saveObjectInLocalStorage({ [CTL_STORAGE_KEYS.stats]: stats });

  const enable = await getObjectFromLocalStorage(CTL_STORAGE_KEYS.isEnabled);
  if (enable === undefined) {
    await saveObjectInLocalStorage({ [CTL_STORAGE_KEYS.isEnabled]: true });
  }
}

async function ensureCtlStorageReady() {
  try {
    await ctlStorageReady;
  } catch (error) {
    console.error('[CTL] 스토리지 초기화 실패:', error);
  }
}

/* stats 초기값이 없는 경우, 기본값을 생성하고 stats를 업데이트한다.
   만약 새로운 버전이 업데이트되었을 경우, 기존 submission은 업데이트를 위해 초기화 한다.
   (확인하기 어려운 다양한 케이스가 발생하는 것을 확인하여서 if 조건문을 복잡하게 하였다.)
*/

/**
 * @author https://gist.github.com/sumitpore/47439fcd86696a71bf083ede8bbd5466
 * Chrome의 Local StorageArea에서 개체 가져오기
 * @param {string} key
 */
async function getObjectFromLocalStorage(key) {
  return new Promise((resolve, reject) => {
    try {
      chrome.storage.local.get(key, function(value) {
        resolve(value[key]);
      });
    } catch (ex) {
      reject(ex);
    }
  });
}

/**
 * @author https://gist.github.com/sumitpore/47439fcd86696a71bf083ede8bbd5466
 * Chrome의 Local StorageArea에 개체 저장
 * @param {*} obj
 */
async function saveObjectInLocalStorage(obj) {
  return new Promise((resolve, reject) => {
    try {
      chrome.storage.local.set(obj, function() {
        resolve();
      });
    } catch (ex) {
      reject(ex);
    }
  });
}

/**
 * @author https://gist.github.com/sumitpore/47439fcd86696a71bf083ede8bbd5466
 * Chrome Local StorageArea에서 개체 제거
 *
 * @param {string or array of string keys} keys
 */
async function removeObjectFromLocalStorage(keys) {
  return new Promise((resolve, reject) => {
    try {
      chrome.storage.local.remove(keys, function() {
        resolve();
      });
    } catch (ex) {
      reject(ex);
    }
  });
}

/**
 * Chrome의 Sync StorageArea에서 개체 가져오기
 * @param {string} key
 */
async function getObjectFromSyncStorage(key) {
  return new Promise((resolve, reject) => {
    try {
      chrome.storage.sync.get(key, function(value) {
        resolve(value[key]);
      });
    } catch (ex) {
      reject(ex);
    }
  });
}

/**
 * Chrome의 Sync StorageArea에 개체 저장
 * @param {*} obj
 */
async function saveObjectInSyncStorage(obj) {
  return new Promise((resolve, reject) => {
    try {
      chrome.storage.sync.set(obj, function() {
        resolve();
      });
    } catch (ex) {
      reject(ex);
    }
  });
}

/**
 * Chrome Sync StorageArea에서 개체 제거
 * @param {string or array of string keys} keys
 */
async function removeObjectFromSyncStorage(keys) {
  return new Promise((resolve, reject) => {
    try {
      chrome.storage.sync.remove(keys, function() {
        resolve();
      });
    } catch (ex) {
      reject(ex);
    }
  });
}

async function getToken() {
  await ensureCtlStorageReady();
  return await getObjectFromLocalStorage(CTL_STORAGE_KEYS.githubToken);
}

// async function getPipe() {
//   return await getObjectFromLocalStorage(CTL_STORAGE_KEYS.oauthPipe);
// }

async function getGithubUsername() {
  await ensureCtlStorageReady();
  return await getObjectFromLocalStorage(CTL_STORAGE_KEYS.githubUsername);
}

async function getStats() {
  await ensureCtlStorageReady();
  return await getObjectFromLocalStorage(CTL_STORAGE_KEYS.stats);
}

async function getHook() {
  await ensureCtlStorageReady();
  return await getObjectFromLocalStorage(CTL_STORAGE_KEYS.githubRepo);
}

/** welcome.html 의 분기 처리 dis_option에서 설정된 boolean 값을 반환합니다. */
async function getOrgOption() {
  try {
    await ensureCtlStorageReady();
    return await getObjectFromLocalStorage(CTL_STORAGE_KEYS.orgOption);
  } catch (ex) {
    console.log('The way it works has changed with updates. Update your storage. ');
    chrome.storage.local.set({ [CTL_STORAGE_KEYS.orgOption]: "platform" }, () => {});
    return "platform";
  }
}

async function getModeType() {
  await ensureCtlStorageReady();
  return await getObjectFromLocalStorage(CTL_STORAGE_KEYS.modeType);
}

async function getUserPrefix() {
  await ensureCtlStorageReady();
  return (await getObjectFromLocalStorage(CTL_STORAGE_KEYS.userPrefix)) || '';
}

async function saveUserPrefix(prefix) {
  return await saveObjectInLocalStorage({ [CTL_STORAGE_KEYS.userPrefix]: prefix });
}

async function getSaveExamplesOption() {
  await ensureCtlStorageReady();
  return (await getObjectFromLocalStorage(CTL_STORAGE_KEYS.saveExamples)) === true;
}

async function saveToken(token) {
  return await saveObjectInLocalStorage({ [CTL_STORAGE_KEYS.githubToken]: token });
}

async function saveStats(stats) {
  return await saveObjectInLocalStorage({ [CTL_STORAGE_KEYS.stats]: stats });
}

/**
 * update stats from path recursively
 * ex) updateOptimizedStatsfromPath('_owner/_repo/백준/README.md', '1342259dssd') -> stats.submission.append({_owner: {_repo: {백준: {README.md: '1342259dssd'}}}})
 * updateOptimizedStatsfromPath('_owner/_repo/백준/1000.테스트/테스트.cpp', 'sfgbdksalf144') -> stats.submission.append({_owner: {_repo: {백준: {'1000.테스트': {'테스트.cpp': 'sfgbdksalf144'}}}}}})
 * updateOptimizedStatsfromPath('_owner/_repo/백준/1000.테스트/aaa/README.md', '123savvsvfffbb') -> stats.submission.append({_owner: {_repo: {백준: {'1000.테스트': {'aaa': {'README.md': '123savvsvfffbb'}}}}}})
 * @param {string} path - path to file
 * @param {string} sha - sha of file
 * @returns {Promise<void>}
 */
async function updateStatsSHAfromPath(path, sha) {
  const stats = await getStats();
  updateObjectDatafromPath(stats.submission, path, sha);
  await saveStats(stats);
}

function updateObjectDatafromPath(obj, path, data) {
  let current = obj;
  // split path into array and filter out empty strings
  const pathArray = _swexpertacademyRankRemoveFilter(_baekjoonSpaceRemoverFilter(_programmersRankRemoverFilter(_baekjoonRankRemoverFilter(path))))
    .split('/')
    .filter((p) => p !== '');
  for (const path of pathArray.slice(0, -1)) {
    if (isNull(current[path])) {
      current[path] = {};
    }
    current = current[path];
  }
  current[pathArray.pop()] = data;
}

/**
 * get stats from path recursively
 * @param {string} path - path to file
 * @returns {Promise<string>} - sha of file
 */
async function getStatsSHAfromPath(path) {
  const stats = await getStats();
  return getObjectDatafromPath(stats.submission, path);
}

function getObjectDatafromPath(obj, path) {
  let current = obj;
  const pathArray = _swexpertacademyRankRemoveFilter(_baekjoonSpaceRemoverFilter(_programmersRankRemoverFilter(_baekjoonRankRemoverFilter(path))))
    .split('/')
    .filter((p) => p !== '');
  for (const path of pathArray.slice(0, -1)) {
    if (isNull(current[path])) {
      return null;
    }
    current = current[path];
  }
  return current[pathArray.pop()];
}

/* github repo에 있는 모든 파일 목록을 가져와서 stats 갱신 */
async function updateLocalStorageStats() {
  const hook = await getHook();
  const token = await getToken();
  const git = new GitHub(hook, token);
  const stats = await getStats();
  const tree_items = [];
  try {
    const tree = await git.getTree();
    if (Array.isArray(tree)) {
      tree.forEach((item) => {
        if (item.type === 'blob') {
          tree_items.push(item);
        }
      });
    }
  } catch (e) {
    // 빈 레포(커밋 없음)인 경우 tree가 없으므로 무시
    log('getTree failed (empty repo?)', e);
  }
  // GitHub tree 기반으로 submission 캐시를 재구축 (삭제된 파일 정리)
  stats.submission = {};
  tree_items.forEach((item) => {
    updateObjectDatafromPath(stats.submission, `${hook}/${item.path}`, item.sha);
  });
  try {
    const default_branch = await git.getDefaultBranchOnRepo();
    stats.branches[hook] = default_branch;
  } catch (e) {
    log('getDefaultBranchOnRepo failed', e);
  }
  await saveStats(stats);
  log('update stats', stats);
  return stats;
}

/**
 * 해당 메서드는 프로그래밍 언어별 정리 옵션을 사용할 경우 언어별로 분류 하기 위함입니다.
 * 스토리지에 저장된 {@link getOrgOption}값에 따라 분기 처리됩니다.
 *
 * @param {string} dirName - 기존에 사용되던 분류 방식의 디렉토리 이름입니다.
 * @param {string} language - ctl_org_option이 language일 경우에 분리에 사용될 언어 입니다.
 * */
async function getDirNameByOrgOption(dirName, language) {
  if (await getOrgOption() === "language") dirName = `${language}/${dirName}`;
  return dirName;
}

// CSP-safe 템플릿 치환 (eval/new Function 미사용)
function applyDirectoryTemplate(template, variables) {
  return template.replace(/\$\{(\w+)\}/g, (match, key) => {
    return variables.hasOwnProperty(key) ? variables[key] : '';
  });
}

// 플랫폼별 템플릿 저장/조회
async function getDirectoryTemplate(platform) {
  await ensureCtlStorageReady();
  const key = CTL_STORAGE_KEYS.dirTemplate(platform);
  return await getObjectFromLocalStorage(key);
}

async function saveDirectoryTemplate(platform, template) {
  const key = CTL_STORAGE_KEYS.dirTemplate(platform);
  return await saveObjectInLocalStorage({ [key]: template });
}

async function buildDirectory(platform, variables) {
  const prefix = await getUserPrefix();
  const template = await getDirectoryTemplate(platform);
  let dir;
  if (template) {
    dir = applyDirectoryTemplate(template, variables);
  } else {
    dir = await getDirNameByOrgOption(variables._defaultDir, variables.language);
  }
  return prefix ? `${prefix}/${dir}` : dir;
}


/**
 * @deprecated
 * level과 관련된 경로를 지우는 임의의 함수 (문제 level이 변경되는 경우 중복된 업로드 파일이 생성됨을 방지하기 위한 목적)
 * ex) _owner/_repo/백준/Gold/1000.테스트/테스트.cpp -> _owner/_repo/백준/1000.테스트/테스트.cpp
 *     _owner/_repo/백준/Silver/1234.테스트/테스트.cpp -> _owner/_repo/백준/1234.테스트/테스트.cpp
 * @param {string} path - 파일의 경로 문자열
 * @returns {string} - 레벨과 관련된 경로를 제거한 문자열
 */
function _baekjoonRankRemoverFilter(path) {
  return path.replace(/\/(Unrated|Silver|Bronze|Gold|Platinum|Diamond|Ruby|Master)\//g, '/');
}

/**
 * @deprecated
 * level과 관련된 경로를 지우는 임의의 함수 (문제 level이 변경되는 경우 중복된 업로드 파일이 생성됨을 방지하기 위한 목적)
 * @param {string} path - 파일의 경로 문자열
 * @returns {string} - 레벨과 관련된 경로를 제거한 문자열
 */
function _programmersRankRemoverFilter(path) {
  return path.replace(/\/(lv[0-9]|unrated)\//g, '/');
}

/**
 * @deprecated
 * 경로에 존재하는 공백을 제거하는 임의의 함수 (기존의 업로드한 문제들이 이중으로 업로드 되는 오류를 방지)
 * ex) _owner/_repo/백준/1000. 테스트/테스트.cpp -> _owner/_repo/백준/1000.테스트/테스트.cpp
 *     _owner/_repo/백준/1234.%20테스트/테스트.cpp -> _owner/_repo/백준/1234.테스트/테스트.cpp
 *     _owner/_repo/백준/1234.테스트/테%E2%80%85스%E2%80%85트.cpp -> _owner/_repo/백준/1234.테스트/테스트.cpp
 * @param {string} path - 파일의 경로 문자열
 * @returns {string} - 공백과 관련된 값을 제거한 문자열
 */
function _baekjoonSpaceRemoverFilter(path) {
  return path.replace(/( | |&nbsp|&#160|&#8197|%E2%80%85|%20)/g, '');
}

/**
 * @deprecated
 * 경로에 존재하는 레벨과 관련된 경로를 지우는 임의의 함수 (문제 level이 변경되는 경우 중복된 업로드 파일이 생성됨을 방지하기 위한 목적)
 * @param {string} path - 파일의 경로 문자열
 * @returns {string} - 레벨과 관련된 경로를 제거한 문자열
 */
function _swexpertacademyRankRemoveFilter(path) {
  return path.replace(/\/D([0-8]+)\//g, '/');
}

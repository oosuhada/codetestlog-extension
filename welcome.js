const REPO_DESCRIPTION = 'This is an auto push repository for coding test submissions created with [Algolog](https://github.com/oosuhada/Algolog).';

const $ = (sel) => document.querySelector(sel);
const $id = (id) => document.getElementById(id);
const ctlStorageReady = migrateLegacyStorageKeys();

const option = () => $id('type').value;

/**
 * 입력값에서 레포명(owner/repo)과 서브폴더 prefix를 파싱합니다.
 * 지원 형식:
 *   - Minji6/algolog/oosu
 *   - https://github.com/Minji6/algolog/tree/main/oosu
 *   - https://github.com/Minji6/algolog  (prefix 없음)
 *   - Minji6/algolog                     (prefix 없음)
 */
const parseRepoInput = (input) => {
  input = input.trim();

  // GitHub URL 형식: https://github.com/owner/repo[/tree/branch/...prefix...]
  const urlMatch = input.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)(?:\/tree\/[^/]+\/(.+))?/);
  if (urlMatch) {
    const owner = urlMatch[1];
    const repo = urlMatch[2].replace(/\.git$/, '');
    const prefix = urlMatch[3] ? urlMatch[3].replace(/\/$/, '') : '';
    return { repoName: `${owner}/${repo}`, prefix };
  }

  // owner/repo/prefix 형식
  const parts = input.replace(/\.git$/, '').split('/').filter(Boolean);
  if (parts.length >= 3) {
    return { repoName: `${parts[0]}/${parts[1]}`, prefix: parts.slice(2).join('/') };
  }
  if (parts.length === 2) {
    return { repoName: `${parts[0]}/${parts[1]}`, prefix: '' };
  }
  return { repoName: input, prefix: '' };
};

const repositoryName = () => {
  const input = $id('name').value.trim();
  return parseRepoInput(input).repoName;
};

/* Status codes for creating of repo */
const statusCode = (res, status, name) => {
  const errorEl = $id('error');
  const successEl = $id('success');
  const unlinkEl = $id('unlink');

  switch (status) {
    case 304:
      successEl.hidden = true;
      I18N.bind(errorEl, 'welcome.error.creating304', { name }, 'text');
      errorEl.hidden = false;
      break;
    case 400:
      successEl.hidden = true;
      I18N.bind(errorEl, 'welcome.error.creating400', { name }, 'text');
      errorEl.hidden = false;
      break;
    case 401:
      successEl.hidden = true;
      I18N.bind(errorEl, 'welcome.error.creating401', { name }, 'text');
      errorEl.hidden = false;
      break;
    case 403:
      successEl.hidden = true;
      I18N.bind(errorEl, 'welcome.error.creating403', { name }, 'text');
      errorEl.hidden = false;
      break;
    case 422:
      successEl.hidden = true;
      I18N.bind(errorEl, 'welcome.error.creating422', { name }, 'text');
      errorEl.hidden = false;
      break;
    default:
      chrome.storage.local.set({ [CTL_STORAGE_KEYS.modeType]: 'commit' }, () => {
        errorEl.hidden = true;
        I18N.bind(successEl, 'welcome.success.created', { url: res.html_url, name });
        successEl.hidden = false;
        unlinkEl.hidden = false;
        $id('hook_mode').classList.add('hidden');
        $id('commit_mode').classList.remove('hidden');
      });
      chrome.storage.local.set({ [CTL_STORAGE_KEYS.githubRepo]: res.full_name }, () => {
        console.log('Successfully set new repo hook');
      });
      break;
  }
};

const createRepo = (token, name) => {
  const AUTHENTICATION_URL = 'https://api.github.com/user/repos';
  const data = JSON.stringify({
    name,
    private: true,
    auto_init: true,
    description: REPO_DESCRIPTION,
  });

  const xhr = new XMLHttpRequest();
  xhr.addEventListener('readystatechange', function () {
    if (xhr.readyState === 4) {
      statusCode(JSON.parse(xhr.responseText), xhr.status, name);
    }
  });

  const stats = {};
  stats.version = chrome.runtime.getManifest().version;
  stats.submission = {};
  chrome.storage.local.set({ [CTL_STORAGE_KEYS.stats]: stats });

  xhr.open('POST', AUTHENTICATION_URL, true);
  xhr.setRequestHeader('Authorization', `token ${token}`);
  xhr.setRequestHeader('Accept', 'application/vnd.github.v3+json');
  xhr.send(data);
};

/* Status codes for linking of repo */
const linkStatusCode = (status, name) => {
  const errorEl = $id('error');
  const successEl = $id('success');
  const unlinkEl = $id('unlink');
  let bool = false;

  switch (status) {
    case 301:
      successEl.hidden = true;
      I18N.bind(errorEl, 'welcome.error.linking301', { name });
      errorEl.hidden = false;
      break;
    case 403:
      successEl.hidden = true;
      I18N.bind(errorEl, 'welcome.error.linking403', { name });
      errorEl.hidden = false;
      break;
    case 404:
      successEl.hidden = true;
      I18N.bind(errorEl, 'welcome.error.linking404', { name });
      errorEl.hidden = false;
      break;
    default:
      bool = true;
      break;
  }
  unlinkEl.hidden = false;
  return bool;
};

/** Initialize empty repo with README.md */
const initializeEmptyRepoWelcome = async (token, hook, branch) => {
  const headers = { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json', 'content-type': 'application/json' };
  const repoName = hook.split('/')[1];
  const readmeContent = btoa(unescape(encodeURIComponent(`# ${repoName}\n${REPO_DESCRIPTION}\n`)));
  const res = await fetch(`https://api.github.com/repos/${hook}/contents/README.md`, {
    method: 'PUT', headers, body: JSON.stringify({ message: 'Initial commit - Algolog', content: readmeContent, branch }),
  });
  if (!res.ok) {
    const err = await res.json();
    console.error('Failed to initialize empty repo:', err);
  }
};

const linkRepo = (token, name) => {
  const AUTHENTICATION_URL = `https://api.github.com/repos/${name}`;
  const errorEl = $id('error');
  const successEl = $id('success');
  const unlinkEl = $id('unlink');

  const xhr = new XMLHttpRequest();
  xhr.addEventListener('readystatechange', async function () {
    if (xhr.readyState === 4) {
      const res = JSON.parse(xhr.responseText);
      const bool = linkStatusCode(xhr.status, name);
      if (xhr.status === 200) {
        if (!bool) {
          chrome.storage.local.set({ [CTL_STORAGE_KEYS.modeType]: 'hook' }, () => {
            console.log(`Error linking ${name} to Algolog`);
          });
          chrome.storage.local.set({ [CTL_STORAGE_KEYS.githubRepo]: null }, () => {
            console.log('Defaulted repo hook to NONE');
          });
          $id('hook_mode').classList.remove('hidden');
          $id('commit_mode').classList.add('hidden');
        } else {
          if (res.size === 0) {
            try {
              await initializeEmptyRepoWelcome(token, res.full_name, res.default_branch);
              console.log('Initialized empty repo with README.md');
            } catch (e) {
              console.log('Empty repo init failed', e);
            }
          }

          chrome.storage.local.set({ [CTL_STORAGE_KEYS.modeType]: 'commit', [CTL_STORAGE_KEYS.githubRepoUrl]: res.html_url }, () => {
            errorEl.hidden = true;
            I18N.bind(successEl, 'welcome.success.linked', { url: res.html_url, name });
            successEl.hidden = false;
            unlinkEl.hidden = false;
          });

          const stats = {};
          stats.version = chrome.runtime.getManifest().version;
          stats.submission = {};
          chrome.storage.local.set({ [CTL_STORAGE_KEYS.stats]: stats });

          chrome.storage.local.set({ [CTL_STORAGE_KEYS.githubRepo]: res.full_name }, () => {
            console.log('Successfully set new repo hook');
            chrome.storage.local.get(CTL_STORAGE_KEYS.stats, (psolved) => {
              const stats = psolved[CTL_STORAGE_KEYS.stats];
            });
          });
          $id('hook_mode').classList.add('hidden');
          $id('commit_mode').classList.remove('hidden');
        }
      }
    }
  });

  xhr.open('GET', AUTHENTICATION_URL, true);
  xhr.setRequestHeader('Authorization', `token ${token}`);
  xhr.setRequestHeader('Accept', 'application/vnd.github.v3+json');
  xhr.send();
};

const unlinkRepo = () => {
  chrome.storage.local.set({ [CTL_STORAGE_KEYS.modeType]: 'hook' }, () => {
    console.log('Unlinking repo');
  });
  chrome.storage.local.set({ [CTL_STORAGE_KEYS.githubRepo]: null }, () => {
    console.log('Defaulted repo hook to NONE');
  });
  chrome.storage.local.set({ [CTL_STORAGE_KEYS.orgOption]: 'platform' }, () => {
    console.log('DisOption Reset');
  });
  chrome.storage.local.remove(CTL_STORAGE_KEYS.userPrefix, () => {
    console.log('User prefix cleared');
  });
  $id('hook_mode').classList.remove('hidden');
  $id('commit_mode').classList.add('hidden');
};

/* --- Dark/Light theme --- */
function applyTheme(theme) {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
    $id('theme_icon_light').classList.remove('hidden');
    $id('theme_icon_dark').classList.add('hidden');
  } else {
    document.documentElement.classList.remove('dark');
    $id('theme_icon_light').classList.add('hidden');
    $id('theme_icon_dark').classList.remove('hidden');
  }
}

function initTheme() {
  chrome.storage.local.get(CTL_STORAGE_KEYS.theme, (data) => {
    let theme = data[CTL_STORAGE_KEYS.theme];
    if (!theme) {
      theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    applyTheme(theme);
  });
}

$id('theme_toggle').addEventListener('click', () => {
  const isDark = document.documentElement.classList.contains('dark');
  const newTheme = isDark ? 'light' : 'dark';
  applyTheme(newTheme);
  chrome.storage.local.set({ [CTL_STORAGE_KEYS.theme]: newTheme });
});

/* --- Event listeners --- */
$id('type').addEventListener('change', function () {
  $id('hook_button').disabled = !this.value;
});

$id('hook_button').addEventListener('click', () => {
  const errorEl = $id('error');
  const successEl = $id('success');

  if (!option()) {
    I18N.bind(errorEl, 'welcome.error.noOption', null, 'text');
    errorEl.hidden = false;
  } else if (!repositoryName()) {
    I18N.bind(errorEl, 'welcome.error.noRepoName', null, 'text');
    $id('name').focus();
    errorEl.hidden = false;
  } else {
    errorEl.hidden = true;
    I18N.bind(successEl, 'welcome.attempting', null, 'text');
    successEl.hidden = false;

    chrome.storage.local.get(CTL_STORAGE_KEYS.githubToken, (data) => {
      const token = data[CTL_STORAGE_KEYS.githubToken];
      if (token === null || token === undefined) {
        I18N.bind(errorEl, 'welcome.error.auth', null, 'text');
        errorEl.hidden = false;
        successEl.hidden = true;
      } else if (option() === 'new') {
        createRepo(token, repositoryName());
      } else {
        chrome.storage.local.get(CTL_STORAGE_KEYS.githubUsername, (data2) => {
          const username = data2[CTL_STORAGE_KEYS.githubUsername];
          if (!username) {
            I18N.bind(errorEl, 'welcome.error.improperAuth', null, 'text');
            errorEl.hidden = false;
            successEl.hidden = true;
          } else {
            const { repoName } = parseRepoInput($id('name').value.trim());
            // repoName이 이미 owner/repo 형태면 그대로, 아니면 username 붙임
            const fullName = repoName.includes('/') ? repoName : `${username}/${repoName}`;
            linkRepo(token, fullName, false);
          }
        });
      }
    });
  }

  const org_option = $id('org_option').value;
  chrome.storage.local.set({ [CTL_STORAGE_KEYS.orgOption]: org_option }, () => {
    console.log(`Set Organize by ${org_option}`);
  });

  // 입력값에서 prefix 파싱 후 저장
  const { prefix: userPrefix } = parseRepoInput($id('name').value.trim());
  chrome.storage.local.set({ [CTL_STORAGE_KEYS.userPrefix]: userPrefix }, () => {
    console.log(`Set user prefix: "${userPrefix}"`);
  });
});

$id('name').addEventListener('input', function () {
  if (this.value.trim()) {
    $id('type').value = 'link';
    $id('hook_button').disabled = false;
  }
});

$id('unlink').querySelector('a').addEventListener('click', () => {
  unlinkRepo();
  $id('unlink').hidden = true;
  I18N.bind($id('success'), 'welcome.success.unlinked', null, 'text');
});

$id('token_refresh_button').addEventListener('click', () => {
  const tokenStatusEl = $id('token_status');
  chrome.storage.local.get(CTL_STORAGE_KEYS.githubToken, (data) => {
    const token = data[CTL_STORAGE_KEYS.githubToken];
    if (!token) {
      I18N.bind(tokenStatusEl, 'welcome.tokenStatus.notFound', null, 'text');
      tokenStatusEl.className = 'token-status status-err';
      tokenStatusEl.hidden = false;
      return;
    }
    fetch('https://api.github.com/user', {
      headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' },
    })
      .then((res) => {
        if (res.ok) {
          I18N.bind(tokenStatusEl, 'welcome.tokenStatus.valid', null, 'text');
          tokenStatusEl.className = 'token-status status-ok';
        } else {
          I18N.bind(tokenStatusEl, 'welcome.tokenStatus.expired');
          tokenStatusEl.className = 'token-status status-err';
        }
        tokenStatusEl.hidden = false;
      })
      .catch(() => {
        I18N.bind(tokenStatusEl, 'welcome.tokenStatus.error', null, 'text');
        tokenStatusEl.className = 'token-status status-err';
        tokenStatusEl.hidden = false;
      });
  });
});

/* Save examples toggle */
chrome.storage.local.get(CTL_STORAGE_KEYS.saveExamples, (data) => {
  $id('examplesBox').checked = data[CTL_STORAGE_KEYS.saveExamples] === true;
});
$id('examplesBox').addEventListener('click', () => {
  chrome.storage.local.set({ [CTL_STORAGE_KEYS.saveExamples]: $id('examplesBox').checked });
});

/* === Directory Template Settings === */
const TEMPLATE_PLATFORMS = ['baekjoon', 'programmers', 'swea', 'goormlevel'];

const TEMPLATE_PREVIEW_VARS = {
  baekjoon:    { platform: '백준', level: 'Gold', levelFull: 'Gold V', id: '1000', title: 'A＋B', language: 'Python' },
  programmers: { platform: '프로그래머스', level: 'lv2', id: '12345', title: '타겟 넘버', language: 'JavaScript' },
  swea:        { platform: 'SWEA', level: 'D4', id: '1234', title: '문제제목', language: 'Java' },
  goormlevel:  { platform: 'goormlevel', level: '보통', examId: '12345', id: '54321', title: '문제제목', language: 'Python' },
};

const TEMPLATE_DEFAULTS = {
  baekjoon:    '${platform}/${level}/${id}. ${title}',
  programmers: '${platform}/${level}/${id}. ${title}',
  swea:        '${platform}/${level}/${id}. ${title}',
  goormlevel:  '${platform}/${level}/${id}. ${title}',
};

function updateTemplatePreview(platform) {
  const input = $id(`tmpl_${platform}`);
  const preview = $id(`tmpl_preview_${platform}`);
  if (!input || !preview) return;
  const template = input.value || TEMPLATE_DEFAULTS[platform];
  const vars = TEMPLATE_PREVIEW_VARS[platform];
  const result = template.replace(/\$\{(\w+)\}/g, (match, key) => {
    return vars.hasOwnProperty(key) ? vars[key] : '';
  });
  preview.textContent = `\u279C ${result}`;
}

function loadTemplateSettings() {
  TEMPLATE_PLATFORMS.forEach((platform) => {
    const key = CTL_STORAGE_KEYS.dirTemplate(platform);
    chrome.storage.local.get(key, (data) => {
      const input = $id(`tmpl_${platform}`);
      if (input && data[key]) {
        input.value = data[key];
      }
      updateTemplatePreview(platform);
    });
  });
}

function saveTemplateSettings() {
  TEMPLATE_PLATFORMS.forEach((platform) => {
    const input = $id(`tmpl_${platform}`);
    if (!input) return;
    const key = CTL_STORAGE_KEYS.dirTemplate(platform);
    const value = input.value.trim();
    if (value) {
      chrome.storage.local.set({ [key]: value });
    } else {
      chrome.storage.local.remove(key);
    }
  });
}

function resetTemplateSettings() {
  TEMPLATE_PLATFORMS.forEach((platform) => {
    const input = $id(`tmpl_${platform}`);
    if (input) input.value = '';
    const key = CTL_STORAGE_KEYS.dirTemplate(platform);
    chrome.storage.local.remove(key);
    updateTemplatePreview(platform);
  });
}

TEMPLATE_PLATFORMS.forEach((platform) => {
  const input = $id(`tmpl_${platform}`);
  if (input) {
    input.addEventListener('input', () => updateTemplatePreview(platform));
  }
});

$id('tmpl_save').addEventListener('click', () => {
  saveTemplateSettings();
  const successEl = $id('success');
  successEl.textContent = 'Directory template saved.';
  successEl.hidden = false;
  setTimeout(() => { successEl.hidden = true; }, 2000);
});

$id('tmpl_reset').addEventListener('click', () => {
  resetTemplateSettings();
});

/* Initialize i18n, theme, and detect mode type */
I18N.init(async () => {
  await ctlStorageReady;
  initTheme();

  chrome.storage.local.get(CTL_STORAGE_KEYS.modeType, (data) => {
    const mode = data[CTL_STORAGE_KEYS.modeType];
    const errorEl = $id('error');
    const successEl = $id('success');

    if (mode && mode === 'commit') {
      chrome.storage.local.get(CTL_STORAGE_KEYS.githubToken, (data2) => {
        const token = data2[CTL_STORAGE_KEYS.githubToken];
        if (token === null || token === undefined) {
          I18N.bind(errorEl, 'welcome.error.authTopRight', null, 'text');
          errorEl.hidden = false;
          successEl.hidden = true;
          $id('hook_mode').classList.remove('hidden');
          $id('commit_mode').classList.add('hidden');
        } else {
          chrome.storage.local.get(CTL_STORAGE_KEYS.githubRepo, (repoName) => {
            const hook = repoName[CTL_STORAGE_KEYS.githubRepo];
            if (!hook) {
              I18N.bind(errorEl, 'welcome.error.improperAuthTopRight', null, 'text');
              errorEl.hidden = false;
              successEl.hidden = true;
              $id('hook_mode').classList.remove('hidden');
              $id('commit_mode').classList.add('hidden');
            } else {
              linkRepo(token, hook);
            }
          });
        }
      });

      $id('hook_mode').classList.add('hidden');
      $id('commit_mode').classList.remove('hidden');
      loadTemplateSettings();
    } else {
      $id('hook_mode').classList.remove('hidden');
      $id('commit_mode').classList.add('hidden');
    }
  });
});

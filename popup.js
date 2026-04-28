/* global oAuth2, I18N, CTL_STORAGE_KEYS */
/* eslint no-undef: "error" */

I18N.init();

let action = false;
const notionConfigKeys = [CTL_STORAGE_KEYS.notionToken, CTL_STORAGE_KEYS.notionDbId];
const aiConfigKeys = [
  CTL_STORAGE_KEYS.aiProvider,
  CTL_STORAGE_KEYS.aiApiKey,
  CTL_STORAGE_KEYS.aiApiKeys,
  CTL_STORAGE_KEYS.aiOnlyWrong,
  CTL_STORAGE_KEYS.aiKeyCursor,
];

$('#authenticate').on('click', () => {
  if (action) {
    oAuth2.begin();
  }
});

/* Get URL for welcome page */
$('#welcome_URL').attr('href', `chrome-extension://${chrome.runtime.id}/welcome.html`);
$('#hook_URL').attr('href', `chrome-extension://${chrome.runtime.id}/welcome.html`);

function getNotionInputValues() {
  return {
    token: document.getElementById('notion-token').value.trim(),
    dbId: document.getElementById('notion-db-id').value.trim(),
  };
}

function setNotionStatus(message) {
  document.getElementById('notion-status').textContent = message || '';
}

function saveNotionSettings() {
  const { token, dbId } = getNotionInputValues();
  return new Promise((resolve) => {
    chrome.storage.local.set({
      [CTL_STORAGE_KEYS.notionToken]: token,
      [CTL_STORAGE_KEYS.notionDbId]: dbId,
    }, resolve);
  });
}

function loadNotionSettings() {
  chrome.storage.local.get(notionConfigKeys, (result) => {
    const token = result[CTL_STORAGE_KEYS.notionToken];
    const dbId = result[CTL_STORAGE_KEYS.notionDbId];
    if (token) document.getElementById('notion-token').value = token;
    if (dbId) document.getElementById('notion-db-id').value = dbId;
  });
}

function bindNotionSettingsHandlers() {
  document.getElementById('notion-save-btn').addEventListener('click', async () => {
    await saveNotionSettings();
    setNotionStatus('저장됨');
  });

  document.getElementById('notion-clear-btn').addEventListener('click', () => {
    chrome.storage.local.remove(notionConfigKeys, () => {
      document.getElementById('notion-token').value = '';
      document.getElementById('notion-db-id').value = '';
      setNotionStatus('초기화됨');
    });
  });

  document.getElementById('notion-test-btn').addEventListener('click', async () => {
    setNotionStatus('테스트 중...');
    await saveNotionSettings();
    chrome.runtime.sendMessage({ type: 'CTL_NOTION_TEST' }, (res) => {
      if (chrome.runtime.lastError) {
        setNotionStatus(`실패: ${chrome.runtime.lastError.message}`);
        return;
      }
      setNotionStatus(res && res.success ? '연결 성공' : `실패: ${res?.error || '알 수 없는 오류'}`);
    });
  });
}

function normalizeApiKeyLines(rawValue) {
  return `${rawValue || ''}`
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) => {
      if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(line)) return [];
      const tokens = line.split(/[\s,;]+/).filter(Boolean);
      const keyToken = [...tokens].reverse().find((token) => (
        /^(gsk_|sk-|sk-ant-|sk_ant_)/.test(token) || token.length >= 24
      ));
      return [keyToken || line];
    });
}

function getAiInputValues() {
  return {
    provider: document.getElementById('ai-provider').value,
    apiKeys: normalizeApiKeyLines(document.getElementById('ai-api-keys').value),
    onlyWrong: document.getElementById('ai-only-wrong').checked,
  };
}

function setAiStatus(message) {
  document.getElementById('ai-status').textContent = message || '';
}

function saveAiSettings() {
  const { provider, apiKeys, onlyWrong } = getAiInputValues();
  return new Promise((resolve) => {
    chrome.storage.local.set({
      [CTL_STORAGE_KEYS.aiProvider]: provider,
      [CTL_STORAGE_KEYS.aiApiKey]: apiKeys[0] || '',
      [CTL_STORAGE_KEYS.aiApiKeys]: apiKeys,
      [CTL_STORAGE_KEYS.aiOnlyWrong]: onlyWrong,
    }, resolve);
  });
}

function loadAiSettings() {
  chrome.storage.local.get(aiConfigKeys, (result) => {
    const provider = result[CTL_STORAGE_KEYS.aiProvider] || '';
    const storedKeys = Array.isArray(result[CTL_STORAGE_KEYS.aiApiKeys])
      ? result[CTL_STORAGE_KEYS.aiApiKeys]
      : normalizeApiKeyLines(result[CTL_STORAGE_KEYS.aiApiKey]);
    const onlyWrong = result[CTL_STORAGE_KEYS.aiOnlyWrong] !== false;

    document.getElementById('ai-provider').value = provider;
    document.getElementById('ai-api-keys').value = storedKeys.join('\n');
    document.getElementById('ai-only-wrong').checked = onlyWrong;
  });
}

function bindAiSettingsHandlers() {
  document.getElementById('ai-save-btn').addEventListener('click', async () => {
    const { provider, apiKeys } = getAiInputValues();
    await saveAiSettings();
    setAiStatus(provider && apiKeys.length ? `${apiKeys.length}개 키 저장됨` : 'AI 피드백 사용 안 함');
  });

  document.getElementById('ai-clear-btn').addEventListener('click', () => {
    chrome.storage.local.remove(aiConfigKeys, () => {
      document.getElementById('ai-provider').value = '';
      document.getElementById('ai-api-keys').value = '';
      document.getElementById('ai-only-wrong').checked = true;
      setAiStatus('초기화됨');
    });
  });

  document.getElementById('ai-test-btn').addEventListener('click', async () => {
    const { provider, apiKeys } = getAiInputValues();
    if (!provider || apiKeys.length === 0) {
      setAiStatus('프로바이더와 API Key를 입력하세요');
      return;
    }

    setAiStatus('테스트 중...');
    await saveAiSettings();
    chrome.runtime.sendMessage({ type: 'CTL_AI_TEST' }, (res) => {
      if (chrome.runtime.lastError) {
        setAiStatus(`실패: ${chrome.runtime.lastError.message}`);
        return;
      }
      setAiStatus(res && res.success ? '연결 성공' : `실패: ${res?.error || '알 수 없는 오류'}`);
    });
  });
}

(async () => {
  await migrateLegacyStorageKeys();
  loadNotionSettings();
  loadAiSettings();
  bindNotionSettingsHandlers();
  bindAiSettingsHandlers();

  chrome.storage.local.get(CTL_STORAGE_KEYS.githubToken, (data) => {
    const token = data[CTL_STORAGE_KEYS.githubToken];
    if (token === null || token === undefined) {
      action = true;
      $('#auth_mode').show();
    } else {
      // To validate user, load user object from GitHub.
      const AUTHENTICATION_URL = 'https://api.github.com/user';

      const xhr = new XMLHttpRequest();
      xhr.addEventListener('readystatechange', function () {
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
            /* Show MAIN FEATURES */
            chrome.storage.local.get(CTL_STORAGE_KEYS.modeType, (data2) => {
              if (data2 && data2[CTL_STORAGE_KEYS.modeType] === 'commit') {
                $('#commit_mode').show();
                /* Get problem stats and repo link */
                chrome.storage.local.get([CTL_STORAGE_KEYS.stats, CTL_STORAGE_KEYS.githubRepo], (data3) => {
                  const ctlHook = data3[CTL_STORAGE_KEYS.githubRepo];
                  if (ctlHook) {
                    const repoLink = `<a target="blank" style="color: #8f6a2f !important;" href="https://github.com/${ctlHook}">${ctlHook}</a>`;
                    const updateRepoUrl = () => {
                      $('#repo_url').html(`${I18N.t('popup.yourRepo')} ${repoLink}`);
                    };
                    updateRepoUrl();
                    I18N.onChange(updateRepoUrl);
                  }
                });
              } else {
                $('#hook_mode').show();
              }
            });
          } else if (xhr.status === 401) {
            // bad oAuth
            // reset token and redirect to authorization process again!
            chrome.storage.local.set({ [CTL_STORAGE_KEYS.githubToken]: null }, () => {
              console.log('BAD oAuth!!! Redirecting back to oAuth process');
              action = true;
              $('#auth_mode').show();
            });
          }
        }
      });
      xhr.open('GET', AUTHENTICATION_URL, true);
      xhr.setRequestHeader('Authorization', `token ${token}`);
      xhr.send();
    }
  });

/*
  초기에 활성화 데이터가 존재하는지 확인, 없으면 새로 생성, 있으면 있는 데이터에 맞게 버튼 조정
 */
  chrome.storage.local.get(CTL_STORAGE_KEYS.isEnabled, (data4) => {
    if (data4[CTL_STORAGE_KEYS.isEnabled] === undefined) {
      $('#onffbox').prop('checked', true);
      chrome.storage.local.set({ [CTL_STORAGE_KEYS.isEnabled]: $('#onffbox').is(':checked') }, () => { });
    } else {
      $('#onffbox').prop('checked', data4[CTL_STORAGE_KEYS.isEnabled]);
      chrome.storage.local.set({ [CTL_STORAGE_KEYS.isEnabled]: $('#onffbox').is(':checked') }, () => { });
    }
  });
/*
  활성화 버튼 클릭 시 storage에 활성 여부 데이터를 저장.
 */
  $('#onffbox').on('click', () => {
    chrome.storage.local.set({ [CTL_STORAGE_KEYS.isEnabled]: $('#onffbox').is(':checked') }, () => { });
  });
})();

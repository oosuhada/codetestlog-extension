/* global oAuth2, I18N */
/* eslint no-undef: "error" */

I18N.init();

let action = false;

$('#authenticate').on('click', () => {
  if (action) {
    oAuth2.begin();
  }
});

/* Get URL for welcome page */
$('#welcome_URL').attr('href', `chrome-extension://${chrome.runtime.id}/welcome.html`);
$('#hook_URL').attr('href', `chrome-extension://${chrome.runtime.id}/welcome.html`);

(async () => {
  await migrateLegacyStorageKeys();

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
                    const repoLink = `<a target="blank" style="color: cadetblue !important;" href="https://github.com/${ctlHook}">${ctlHook}</a>`;
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

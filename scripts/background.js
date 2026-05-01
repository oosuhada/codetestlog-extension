importScripts('ctl_storage_keys.js');
importScripts('core/notion_client.js');

const CTL_PANEL_STATE_KEY = CTL_STORAGE_KEYS.sidePanelState || 'ctl_side_panel_state';
const CTL_PANEL_HISTORY_LIMIT = 5;
const CTL_PANEL_EVENT_LIMIT = 50;

function chromeStorageGet(keys) {
  return new Promise((resolve) => {
    chrome.storage.local.get(keys, resolve);
  });
}

function chromeStorageSet(values) {
  return new Promise((resolve) => {
    chrome.storage.local.set(values, resolve);
  });
}

function getPanelTodayKey(timestamp = Date.now()) {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function createEmptyPanelState() {
  return {
    lastCommit: null,
    currentProblem: null,
    todayStats: { date: getPanelTodayKey(), total: 0, correct: 0, problems: [] },
    history: [],
    processedEventIds: [],
  };
}

function normalizePanelState(rawState) {
  const state = { ...createEmptyPanelState(), ...(rawState || {}) };
  state.todayStats = {
    date: state.todayStats?.date || getPanelTodayKey(),
    total: Number(state.todayStats?.total || 0),
    correct: Number(state.todayStats?.correct || 0),
    problems: Array.isArray(state.todayStats?.problems) ? state.todayStats.problems : [],
  };
  if (state.todayStats.date !== getPanelTodayKey()) {
    state.todayStats = { date: getPanelTodayKey(), total: 0, correct: 0, problems: [] };
  }
  if (state.currentProblem) {
    state.currentProblem = {
      ...state.currentProblem,
      attempts: Array.isArray(state.currentProblem.attempts) ? state.currentProblem.attempts : [],
      attemptCount: Number(state.currentProblem.attemptCount || 0),
    };
  }
  state.history = Array.isArray(state.history) ? state.history.slice(0, CTL_PANEL_HISTORY_LIMIT) : [];
  state.processedEventIds = Array.isArray(state.processedEventIds)
    ? state.processedEventIds.slice(-CTL_PANEL_EVENT_LIMIT)
    : [];
  return state;
}

async function getPanelState() {
  const data = await chromeStorageGet([CTL_PANEL_STATE_KEY]);
  return normalizePanelState(data[CTL_PANEL_STATE_KEY]);
}

async function savePanelState(state) {
  await chromeStorageSet({ [CTL_PANEL_STATE_KEY]: normalizePanelState(state) });
}

function notifyPanelStateUpdated(state, event) {
  try {
    const result = chrome.runtime.sendMessage({
      type: 'CTL_PANEL_STATE_UPDATED',
      payload: { state: normalizePanelState(state), event },
    });
    if (result && typeof result.catch === 'function') {
      result.catch(() => {});
    }
  } catch (_) {}
}

function normalizePanelPayload(payload = {}) {
  return {
    eventId: payload.eventId || `${Date.now()}_${Math.random().toString(36).slice(2)}`,
    phase: payload.phase || 'complete',
    result: payload.result || 'wrong',
    problemId: `${payload.problemId || 'unknown'}`,
    problemName: payload.problemName || payload.title || 'unknown',
    site: payload.site || 'unknown',
    fileName: payload.fileName || '',
    commitPath: payload.commitPath || payload.directory || '',
    success: payload.success !== false,
    errorMessage: payload.errorMessage || '',
    attemptCount: Number(payload.attemptCount || 0),
    timestamp: Number(payload.timestamp || Date.now()),
  };
}

function ensurePanelCurrentProblem(state, event, useFirstAttemptAt) {
  const isDifferentProblem = !state.currentProblem
    || state.currentProblem.id !== event.problemId
    || state.currentProblem.site !== event.site;

  if (isDifferentProblem) {
    state.currentProblem = {
      id: event.problemId,
      title: event.problemName,
      site: event.site,
      firstAttemptAt: useFirstAttemptAt ? event.timestamp : null,
      attempts: [],
      attemptCount: event.attemptCount || 0,
    };
  } else {
    state.currentProblem.title = event.problemName || state.currentProblem.title;
    state.currentProblem.attemptCount = Math.max(
      Number(state.currentProblem.attemptCount || 0),
      event.attemptCount || 0,
    );
    if (useFirstAttemptAt && !state.currentProblem.firstAttemptAt) {
      state.currentProblem.firstAttemptAt = event.timestamp;
    }
  }

  return state.currentProblem;
}

function applyProblemContextToPanelState(state, payload = {}) {
  const event = normalizePanelPayload({ ...payload, phase: 'context', timestamp: Date.now() });
  ensurePanelCurrentProblem(state, event, false);
  return { state, event };
}

function applyCommitEventToPanelState(state, payload = {}) {
  const event = normalizePanelPayload(payload);
  const eventKey = `${event.eventId}:${event.phase}`;

  ensurePanelCurrentProblem(state, event, event.phase !== 'start');
  if (event.phase === 'start') {
    return { state, event };
  }

  if (state.processedEventIds.includes(eventKey)) {
    return { state, event };
  }
  state.processedEventIds.push(eventKey);
  state.processedEventIds = state.processedEventIds.slice(-CTL_PANEL_EVENT_LIMIT);

  const currentProblem = state.currentProblem;
  currentProblem.attempts.push(event.result);
  currentProblem.attemptCount = Math.max(
    Number(currentProblem.attemptCount || 0),
    event.attemptCount || 0,
    currentProblem.attempts.length,
  );

  state.lastCommit = {
    result: event.result,
    problemId: event.problemId,
    problemName: event.problemName,
    site: event.site,
    fileName: event.fileName,
    commitPath: event.commitPath,
    success: event.success,
    errorMessage: event.errorMessage,
    timestamp: event.timestamp,
  };

  state.todayStats.total += 1;
  if (event.result === 'correct') {
    state.todayStats.correct += 1;
    const problemKey = `${event.site}_${event.problemId}`;
    if (!state.todayStats.problems.includes(problemKey)) {
      state.todayStats.problems.push(problemKey);
    }
  }

  state.history.unshift({
    result: event.result,
    problemId: event.problemId,
    problemName: event.problemName,
    site: event.site,
    success: event.success,
    timestamp: event.timestamp,
  });
  state.history = state.history.slice(0, CTL_PANEL_HISTORY_LIMIT);

  return { state, event };
}

async function updatePanelStateFromMessage(request) {
  const state = await getPanelState();
  const result = request.type === 'CTL_PROBLEM_CONTEXT'
    ? applyProblemContextToPanelState(state, request.payload)
    : applyCommitEventToPanelState(state, request.payload);
  await savePanelState(result.state);
  notifyPanelStateUpdated(result.state, result.event);
  return { ok: true };
}

function enableSidePanelBehavior() {
  if (!chrome.sidePanel || !chrome.sidePanel.setPanelBehavior) return;
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error('[CTL] Side Panel action 설정 실패:', error));
}

enableSidePanelBehavior();
chrome.runtime.onInstalled.addListener(enableSidePanelBehavior);
chrome.runtime.onStartup.addListener(enableSidePanelBehavior);

if (chrome.action?.onClicked && chrome.sidePanel?.open) {
  chrome.action.onClicked.addListener((tab) => {
    if (!tab || !tab.id) return;
    chrome.sidePanel.open({ tabId: tab.id }).catch(() => {});
  });
}

/**
 * solvedac 문제 데이터를 파싱해오는 함수.
 * @param {int} problemId
 */
async function SolvedApiCall(problemId) {
  return fetch(`https://solved.ac/api/v3/problem/show?problemId=${problemId}`, { method: 'GET' })
    .then((query) => query.json());
}

async function buildGithubFileUrl(commitPath, fileName) {
  const data = await chromeStorageGet([CTL_STORAGE_KEYS.githubRepo, CTL_STORAGE_KEYS.stats]);
  const repo = data[CTL_STORAGE_KEYS.githubRepo];
  if (!repo || !commitPath || !fileName) return '';

  const stats = data[CTL_STORAGE_KEYS.stats] || {};
  const branch = stats.branches?.[repo] || 'main';
  const encodedBranch = `${branch}`.split('/').map(encodeURIComponent).join('/');
  const path = encodeURIComponent(`${commitPath}/${fileName}`).replace(/%2F/g, '/');
  return `https://github.com/${repo}/blob/${encodedBranch}/${path}`;
}

function shouldCreateNotionEntry(payload = {}) {
  return payload.success === true && (payload.phase === 'complete' || !payload.phase);
}

async function recordSuccessfulCommitToNotion(payload = {}) {
  if (!shouldCreateNotionEntry(payload)) return { skipped: true };

  const githubUrl = await buildGithubFileUrl(payload.commitPath, payload.fileName);
  return createNotionEntry({
    title: payload.problemName,
    site: payload.site,
    level: payload.level || '',
    result: payload.result,
    language: payload.language || '',
    attemptCount: payload.attemptCount || 1,
    submittedAt: new Date(payload.timestamp || Date.now()).toISOString(),
    githubUrl,
    code: payload.code || '',
  });
}

function handleMessage(request, sender, sendResponse) {
  migrateLegacyStorageKeys();

  if (request && request.type === 'CTL_NOTION_TEST') {
    testNotionConnection()
      .then((response) => sendResponse(response))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request && (request.type === 'CTL_COMMIT_EVENT' || request.type === 'CTL_PROBLEM_CONTEXT')) {
    if (request.type === 'CTL_COMMIT_EVENT') {
      recordSuccessfulCommitToNotion(request.payload).catch((error) => {
        console.error('[CTL] Notion optional flow failed:', error);
      });
    }

    updatePanelStateFromMessage(request)
      .then((response) => sendResponse(response))
      .catch((error) => {
        console.error('[CTL] Side Panel 상태 갱신 실패:', error);
        sendResponse({ ok: false, error: error.message });
      });
    return true;
  }

  if (request && request.closeWebPage === true && request.isSuccess === true) {
    /* Set username */
    chrome.storage.local.set(
      { [CTL_STORAGE_KEYS.githubUsername]: request.username } /* , () => {
      window.localStorage.ctl_github_username = request.username;
    } */,
    );

    /* Set token */
    chrome.storage.local.set(
      { [CTL_STORAGE_KEYS.githubToken]: request.token } /* , () => {
      window.localStorage[request.KEY] = request.token;
    } */,
    );

    /* Close pipe */
    chrome.storage.local.set({ [CTL_STORAGE_KEYS.oauthPipe]: false }, () => {
      console.log('Closed pipe.');
    });

    // chrome.tabs.getSelected(null, function (tab) {
    //   chrome.tabs.remove(tab.id);
    // });

    /* Go to onboarding for UX */
    const urlOnboarding = `chrome-extension://${chrome.runtime.id}/welcome.html`;
    chrome.tabs.create({ url: urlOnboarding, selected: true }); // creates new tab
  } else if (request && request.closeWebPage === true && request.isSuccess === false) {
    alert('Something went wrong while trying to authenticate your profile!');
    chrome.tabs.getSelected(null, function (tab) {
      chrome.tabs.remove(tab.id);
    });
  } else if (request && request.sender == "baekjoon" && request.task == "SolvedApiCall") {
    SolvedApiCall(request.problemId).then((res) => sendResponse(res));
    //sendResponse(SolvedApiCall(request.problemId))
  }
  return true;
}

chrome.runtime.onMessage.addListener(handleMessage);

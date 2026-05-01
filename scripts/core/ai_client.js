// Optional AI feedback client for Algolog.
// API keys are read from chrome.storage.local and are never bundled in source.
var CTLAiClient = globalThis.CTLAiClient || (() => {
  const AI_ANALYZABLE_RESULTS = new Set([
    'correct',
    'wrong',
    'timeout',
    'runtime_error',
    'compile_error',
    'memory_exceeded',
    'partial',
  ]);

  const DEFAULT_MODELS = {
    groq: 'llama-3.1-8b-instant',
    deepseek: 'deepseek-chat',
    openai: 'gpt-4o-mini',
    anthropic: 'claude-3-5-haiku-20241022',
  };

  function storageGet(keys) {
    return new Promise((resolve) => chrome.storage.local.get(keys, resolve));
  }

  function storageSet(values) {
    return new Promise((resolve) => chrome.storage.local.set(values, resolve));
  }

  function normalizeApiKeys(rawValue) {
    const rawItems = Array.isArray(rawValue)
      ? rawValue
      : `${rawValue || ''}`.split(/\n+/);

    return rawItems
      .map((line) => `${line || ''}`.trim())
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

  async function getAiConfig() {
    const keys = [
      CTL_STORAGE_KEYS.aiProvider,
      CTL_STORAGE_KEYS.aiApiKey,
      CTL_STORAGE_KEYS.aiApiKeys,
      CTL_STORAGE_KEYS.aiOnlyWrong,
      CTL_STORAGE_KEYS.aiKeyCursor,
    ];
    const data = await storageGet(keys);
    const provider = data[CTL_STORAGE_KEYS.aiProvider] || '';
    const apiKeys = normalizeApiKeys(data[CTL_STORAGE_KEYS.aiApiKeys]);
    const fallbackKeys = normalizeApiKeys(data[CTL_STORAGE_KEYS.aiApiKey]);

    return {
      provider,
      apiKeys: apiKeys.length ? apiKeys : fallbackKeys,
      onlyWrong: data[CTL_STORAGE_KEYS.aiOnlyWrong] !== false,
      keyCursor: Number(data[CTL_STORAGE_KEYS.aiKeyCursor] || 0),
    };
  }

  function hasAiConfig(config) {
    return Boolean(config?.provider && Array.isArray(config.apiKeys) && config.apiKeys.length > 0);
  }

  function shouldAnalyzeResult(result, config) {
    if (!AI_ANALYZABLE_RESULTS.has(result)) return false;
    return !(config.onlyWrong && result === 'correct');
  }

  function getResultLabel(result) {
    return {
      correct: '정답',
      wrong: '오답',
      timeout: '시간 초과',
      runtime_error: '런타임 에러',
      compile_error: '컴파일 에러',
      memory_exceeded: '메모리 초과',
      partial: '부분 점수',
    }[result] || result || '알 수 없음';
  }

  function buildAnalysisPrompt({ code, result, language, problemTitle, level }) {
    const safeCode = `${code || ''}`.slice(0, 1800);
    return `코딩테스트 풀이를 분석해주세요.

문제: ${problemTitle || '알 수 없음'} (${level || '난이도 미상'})
언어: ${language || 'Unknown'}
결과: ${getResultLabel(result)}

코드:
\`\`\`${`${language || ''}`.toLowerCase()}
${safeCode}
\`\`\`

한국어로 2-3줄만 답해주세요.
코드 전체를 다시 쓰지 말고, 가장 가능성이 큰 실수와 바로 확인할 지점만 짚어주세요.`;
  }

  function makeHttpError(provider, status, body) {
    const message = body?.error?.message || body?.message || `HTTP ${status}`;
    const error = new Error(`${provider} API 오류: ${message}`);
    error.status = status;
    error.provider = provider;
    return error;
  }

  async function readJsonResponse(provider, response) {
    const text = await response.text();
    let body = {};
    if (text) {
      try {
        body = JSON.parse(text);
      } catch (_) {
        body = { message: text.slice(0, 240) };
      }
    }
    if (!response.ok) throw makeHttpError(provider, response.status, body);
    return body;
  }

  function isRetryableAcrossKeys(error) {
    return [401, 403, 408, 409, 429, 500, 502, 503, 504].includes(Number(error?.status));
  }

  async function callOpenAiCompatible({ provider, apiKey, url, model, prompt }) {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: 'You are a concise Korean coding-test coach. Focus on likely bugs, edge cases, and next checks.',
          },
          { role: 'user', content: prompt },
        ],
        max_tokens: 300,
        temperature: 0.25,
      }),
    });
    const body = await readJsonResponse(provider, response);
    return body.choices?.[0]?.message?.content?.trim() || '';
  }

  async function callGroq(apiKey, prompt) {
    return callOpenAiCompatible({
      provider: 'Groq',
      apiKey,
      url: 'https://api.groq.com/openai/v1/chat/completions',
      model: DEFAULT_MODELS.groq,
      prompt,
    });
  }

  async function callDeepSeek(apiKey, prompt) {
    return callOpenAiCompatible({
      provider: 'DeepSeek',
      apiKey,
      url: 'https://api.deepseek.com/chat/completions',
      model: DEFAULT_MODELS.deepseek,
      prompt,
    });
  }

  async function callOpenAI(apiKey, prompt) {
    return callOpenAiCompatible({
      provider: 'OpenAI',
      apiKey,
      url: 'https://api.openai.com/v1/chat/completions',
      model: DEFAULT_MODELS.openai,
      prompt,
    });
  }

  async function callAnthropic(apiKey, prompt) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: DEFAULT_MODELS.anthropic,
        max_tokens: 300,
        temperature: 0.25,
        system: 'You are a concise Korean coding-test coach. Focus on likely bugs, edge cases, and next checks.',
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    const body = await readJsonResponse('Anthropic', response);
    return body.content?.find((item) => item.type === 'text')?.text?.trim() || '';
  }

  async function callProvider(provider, apiKey, prompt) {
    switch (provider) {
      case 'groq':
        return callGroq(apiKey, prompt);
      case 'deepseek':
        return callDeepSeek(apiKey, prompt);
      case 'openai':
        return callOpenAI(apiKey, prompt);
      case 'anthropic':
        return callAnthropic(apiKey, prompt);
      default:
        return '';
    }
  }

  async function callWithKeyRotation(config, prompt) {
    const apiKeys = config.apiKeys;
    const startIndex = apiKeys.length ? Math.abs(config.keyCursor) % apiKeys.length : 0;
    let lastError = null;

    for (let offset = 0; offset < apiKeys.length; offset += 1) {
      const keyIndex = (startIndex + offset) % apiKeys.length;
      try {
        const content = await callProvider(config.provider, apiKeys[keyIndex], prompt);
        await storageSet({ [CTL_STORAGE_KEYS.aiKeyCursor]: (keyIndex + 1) % apiKeys.length });
        return content;
      } catch (error) {
        lastError = error;
        console.warn(`[ALG] AI key ${keyIndex + 1}/${apiKeys.length} failed:`, error.message);
        if (!isRetryableAcrossKeys(error)) break;
      }
    }

    throw lastError || new Error('AI 요청에 실패했습니다.');
  }

  async function analyzeCode(params) {
    const config = await getAiConfig();
    if (!hasAiConfig(config) || !shouldAnalyzeResult(params?.result, config)) return null;
    const prompt = buildAnalysisPrompt(params || {});
    return callWithKeyRotation(config, prompt);
  }

  async function testConnection() {
    const config = await getAiConfig();
    if (!hasAiConfig(config)) {
      return { success: false, error: 'AI 프로바이더와 API Key를 입력하세요.' };
    }

    const prompt = '한국어로 "연결 성공"이라고만 답해주세요.';
    try {
      const message = await callWithKeyRotation(config, prompt);
      return {
        success: Boolean(message),
        provider: config.provider,
        keyCount: config.apiKeys.length,
        message,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  return {
    analyzeCode,
    buildAnalysisPrompt,
    getAiConfig,
    hasAiConfig,
    shouldAnalyzeResult,
    testConnection,
  };
})();

globalThis.CTLAiClient = CTLAiClient;

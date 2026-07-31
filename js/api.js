/* ========================================
   深大吃啥 · DeepSeek API 调用封装
   ======================================== */

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

/**
 * 测试 API Key 是否有效
 * @param {string} apiKey
 * @returns {Promise<{ok: boolean, message: string}>}
 */
async function testApiConnection(apiKey) {
  if (!apiKey || !apiKey.trim()) {
    return { ok: false, message: 'API Key 为空，请先填写' };
  }

  try {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey.trim(),
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: '回复"OK"' }],
        max_tokens: 10,
      }),
    });

    if (response.ok) {
      return { ok: true, message: '✅ API Key 有效，连接正常！' };
    }

    const errorData = await response.json().catch(() => ({}));
    const errMsg = errorData.error?.message || '';

    if (response.status === 401) {
      return { ok: false, message: '❌ API Key 无效，请检查是否复制完整。去 platform.deepseek.com/api_keys 重新生成。' };
    }
    if (response.status === 402) {
      return { ok: false, message: '❌ 账户余额不足，请去 platform.deepseek.com 充值。' };
    }
    if (response.status === 429) {
      return { ok: false, message: '⚠️ 请求太频繁，稍后再试。' };
    }
    return { ok: false, message: '❌ 错误 ' + response.status + '：' + (errMsg || '未知错误') };
  } catch (e) {
    return { ok: false, message: '❌ 网络连接失败：' + e.message };
  }
}

/**
 * 调用 DeepSeek API 获取三餐推荐
 * @param {Object} params
 * @param {string} params.moodEmoji - 心情 emoji
 * @param {string} params.moodLabel - 心情标签
 * @param {string} params.moodText - 心情文字补充
 * @param {Object} params.settings - 用户设置
 * @returns {Promise<Object>} 三餐推荐结果
 */
async function getMealRecommendations({ moodEmoji, moodLabel, moodText, settings }) {
  if (!settings.apiKey) {
    throw new Error('NO_API_KEY');
  }

  const systemPrompt = buildSystemPrompt();
  const userMessage = buildUserMessage(moodEmoji, moodLabel, moodText, settings);

  const body = {
    model: settings.model || 'deepseek-chat',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    max_tokens: 1024,
    temperature: 0.85,
    response_format: { type: 'json_object' },
  };

  const response = await fetch(DEEPSEEK_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + settings.apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const err = new Error('API_ERROR');
    err.status = response.status;
    err.apiMessage = errorData.error?.message || `HTTP ${response.status}`;
    throw err;
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('NO_TEXT_RESPONSE');
  }

  // 解析 JSON
  let jsonStr = content.trim();

  // 去掉可能的 markdown 代码块标记
  const jsonMatch = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  let result;
  try {
    result = JSON.parse(jsonStr);
  } catch (parseErr) {
    const objMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (objMatch) {
      try {
        result = JSON.parse(objMatch[0]);
      } catch (e) {
        throw new Error('JSON_PARSE_ERROR');
      }
    } else {
      throw new Error('JSON_PARSE_ERROR');
    }
  }

  // 验证必要字段
  const required = ['breakfast', 'lunch', 'dinner'];
  for (const key of required) {
    if (!result[key] || !result[key].name) {
      throw new Error('INCOMPLETE_RESPONSE');
    }
  }

  return result;
}

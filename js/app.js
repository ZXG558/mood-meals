/* ========================================
   心情三餐 · 主应用逻辑
   ======================================== */

// ----- 全局状态 -----
const state = {
  selectedMood: null,       // { emoji, label, value }
  settings: { ...DEFAULT_SETTINGS },
  currentResult: null,      // 当前推荐结果
  isLoading: false,
};

// ----- DOM 引用 -----
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const dom = {
  moodGrid: $('#moodGrid'),
  moodText: $('#moodText'),
  charCount: $('#charCount'),
  btnRecommend: $('#btnRecommend'),
  hintText: $('#hintText'),
  moodSection: $('#moodSection'),
  resultSection: $('#resultSection'),
  resultMood: $('#resultMood'),
  loadingContainer: $('#loadingContainer'),
  loadingText: $('#loadingText'),
  mealsContainer: $('#mealsContainer'),
  errorContainer: $('#errorContainer'),
  errorMsg: $('#errorMsg'),
  overallNote: $('#overallNote'),
  overlay: $('#overlay'),
  settingsPanel: $('#settingsPanel'),
  toast: $('#toast'),
};

// ----- 初始化 -----
function init() {
  loadSettings();
  renderMoodButtons();
  bindEvents();
  updateRecommendButton();
}

// ----- 设置管理 -----
function loadSettings() {
  try {
    const saved = localStorage.getItem('mood-meals-settings');
    if (saved) {
      state.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    }
  } catch (e) {
    state.settings = { ...DEFAULT_SETTINGS };
  }
  // 回填设置面板
  $('#apiKey').value = state.settings.apiKey || '';
  $('#allergies').value = state.settings.allergies || '';
  $('#taste').value = state.settings.taste || '';
  $('#dietType').value = state.settings.dietType || '';
  $('#cuisine').value = state.settings.cuisine || '';
  $('#modelSelect').value = state.settings.model || DEFAULT_SETTINGS.model;
}

function saveSettings() {
  state.settings.apiKey = $('#apiKey').value.trim();
  state.settings.allergies = $('#allergies').value.trim();
  state.settings.taste = $('#taste').value;
  state.settings.dietType = $('#dietType').value;
  state.settings.cuisine = $('#cuisine').value;
  state.settings.model = $('#modelSelect').value;

  localStorage.setItem('mood-meals-settings', JSON.stringify(state.settings));
  showToast('✅ 设置已保存');
  closeSettings();
}

// ----- 渲染心情按钮 -----
function renderMoodButtons() {
  dom.moodGrid.innerHTML = '';
  MOOD_OPTIONS.forEach((mood) => {
    const btn = document.createElement('button');
    btn.className = 'mood-btn';
    btn.dataset.value = mood.value;
    btn.innerHTML = `
      <span class="mood-emoji">${mood.emoji}</span>
      <span class="mood-label">${mood.label}</span>
    `;
    btn.addEventListener('click', () => selectMood(mood, btn));
    dom.moodGrid.appendChild(btn);
  });
}

// ----- 心情选择 -----
function selectMood(mood, btnEl) {
  // 取消之前的选择
  $$('.mood-btn').forEach(b => b.classList.remove('selected'));

  if (state.selectedMood && state.selectedMood.value === mood.value) {
    // 再次点击取消选择
    state.selectedMood = null;
  } else {
    state.selectedMood = mood;
    btnEl.classList.add('selected');
  }

  updateRecommendButton();
}

function updateRecommendButton() {
  const hasApiKey = !!state.settings.apiKey;
  const hasMood = !!state.selectedMood;

  dom.btnRecommend.disabled = !hasMood;

  if (!hasApiKey) {
    dom.hintText.textContent = '⚠️ 请先在设置中填写 API Key';
    dom.hintText.style.color = 'var(--color-error)';
    dom.btnRecommend.disabled = true;
  } else if (!hasMood) {
    dom.hintText.textContent = '👆 先选一个心情，再点推荐';
    dom.hintText.style.color = 'var(--color-text-lighter)';
  } else {
    dom.hintText.textContent = '准备好了，点推荐吧！✨';
    dom.hintText.style.color = 'var(--color-success)';
  }
}

// ----- 推荐流程 -----
async function handleRecommend() {
  if (state.isLoading) return;
  if (!state.selectedMood) return;
  if (!state.settings.apiKey) {
    showToast('⚠️ 请先在设置中填写 API Key');
    return;
  }

  state.isLoading = true;

  // 切换到结果区
  dom.moodSection.classList.add('hidden');
  dom.resultSection.classList.remove('hidden');
  dom.resultMood.textContent = `心情：${state.selectedMood.emoji} ${state.selectedMood.label}`;
  showLoading();

  try {
    const result = await getMealRecommendations({
      moodEmoji: state.selectedMood.emoji,
      moodLabel: state.selectedMood.label,
      moodText: dom.moodText.value,
      settings: state.settings,
    });

    state.currentResult = result;
    hideLoading();
    renderMeals(result);
  } catch (err) {
    hideLoading();
    handleError(err);
  }

  state.isLoading = false;
}

function showLoading() {
  dom.loadingContainer.classList.remove('hidden');
  dom.mealsContainer.classList.add('hidden');
  dom.errorContainer.classList.add('hidden');

  // 随机有趣的加载文案
  const loadingTexts = [
    '正在为你精心搭配…',
    '翻阅菜谱中…',
    '咨询营养师中…',
    '厨房飘来了灵感…',
    '正在考虑你的口味…',
    'AI大厨正在思考…',
  ];
  dom.loadingText.textContent = loadingTexts[Math.floor(Math.random() * loadingTexts.length)];
}

function hideLoading() {
  dom.loadingContainer.classList.add('hidden');
}

// ----- 渲染结果 -----
function renderMeals(result) {
  dom.mealsContainer.classList.remove('hidden');
  dom.errorContainer.classList.add('hidden');

  const meals = [
    { key: 'breakfast', idPrefix: 'breakfast' },
    { key: 'lunch', idPrefix: 'lunch' },
    { key: 'dinner', idPrefix: 'dinner' },
  ];

  meals.forEach(({ key, idPrefix }) => {
    const meal = result[key];
    if (meal) {
      $(`#${idPrefix}Name`).textContent = meal.name || '—';
      $(`#${idPrefix}Desc`).textContent = meal.description || '';
      $(`#${idPrefix}Reason`).textContent = '💡 ' + (meal.mood_reason || '');
      $(`#${idPrefix}Calories`).textContent = meal.calories || '';
      $(`#${idPrefix}Tips`).textContent = meal.tips || '';
    }
  });

  if (result.overall_note) {
    dom.overallNote.textContent = '💬 ' + result.overall_note;
    dom.overallNote.classList.remove('hidden');
  } else {
    dom.overallNote.classList.add('hidden');
  }

  // 滚动到结果区
  dom.resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ----- 错误处理 -----
function handleError(err) {
  dom.mealsContainer.classList.add('hidden');
  dom.errorContainer.classList.remove('hidden');

  let msg = '出了点问题，请稍后再试。';
  if (err.message === 'NO_API_KEY') {
    msg = '请先在设置中填写你的 Anthropic API Key。';
  } else if (err.status === 401) {
    msg = 'API Key 无效，请检查是否填写正确。';
  } else if (err.status === 403) {
    msg = 'API Key 没有权限，请检查账户状态。';
  } else if (err.status === 429) {
    msg = '请求太频繁了，请稍等片刻再试。';
  } else if (err.status === 529) {
    msg = 'Claude API 暂时繁忙，请稍后再试。';
  } else if (err.message === 'JSON_PARSE_ERROR') {
    msg = 'AI 返回格式异常，请重试一次。';
  } else if (err.message === 'INCOMPLETE_RESPONSE') {
    msg = 'AI 返回数据不完整，请重试一次。';
  } else if (err.apiMessage) {
    msg = err.apiMessage;
  }

  dom.errorMsg.textContent = msg;
}

// ----- 重新推荐 -----
function handleRetry() {
  state.currentResult = null;
  dom.moodSection.classList.remove('hidden');
  dom.resultSection.classList.add('hidden');

  // 随机微调一下心情文字以获得不同结果
  if (dom.moodText.value.trim()) {
    const variations = ['', '来点不一样的？', '换个口味吧~', '上次的不太满意'];
    const suffix = variations[Math.floor(Math.random() * variations.length)];
    if (suffix && !dom.moodText.value.includes(suffix)) {
      dom.moodText.value = dom.moodText.value.trim() + '，' + suffix;
    }
  }

  dom.moodSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  // 直接触发推荐
  setTimeout(() => handleRecommend(), 300);
}

// ----- 复制菜单 -----
function handleCopy() {
  if (!state.currentResult) return;

  const b = state.currentResult.breakfast;
  const l = state.currentResult.lunch;
  const d = state.currentResult.dinner;

  const text = [
    '🍽️ 心情三餐 · 今日菜单',
    '',
    `🥣 早餐：${b.name}`,
    `   ${b.description}`,
    `   ${b.calories} | ${b.tips}`,
    '',
    `🍱 午餐：${l.name}`,
    `   ${l.description}`,
    `   ${l.calories} | ${l.tips}`,
    '',
    `🍲 晚餐：${d.name}`,
    `   ${d.description}`,
    `   ${d.calories} | ${d.tips}`,
    '',
    state.currentResult.overall_note ? `💬 ${state.currentResult.overall_note}` : '',
    '',
    '—— 由 Claude AI 精心搭配',
  ].join('\n');

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      showToast('📋 已复制到剪贴板，可以发朋友圈啦');
    }).catch(() => {
      fallbackCopy(text);
    });
  } else {
    fallbackCopy(text);
  }
}

function fallbackCopy(text) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  textarea.style.top = '-9999px';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  try {
    document.execCommand('copy');
    showToast('📋 已复制到剪贴板');
  } catch (e) {
    showToast('⚠️ 复制失败，请尝试截图保存');
  }
  document.body.removeChild(textarea);
}

// ----- 设置面板 -----
function openSettings() {
  // 回填当前值
  $('#apiKey').value = state.settings.apiKey || '';
  $('#allergies').value = state.settings.allergies || '';
  $('#taste').value = state.settings.taste || '';
  $('#dietType').value = state.settings.dietType || '';
  $('#cuisine').value = state.settings.cuisine || '';
  $('#modelSelect').value = state.settings.model || DEFAULT_SETTINGS.model;

  dom.overlay.classList.remove('hidden');
  dom.settingsPanel.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeSettings() {
  dom.overlay.classList.add('hidden');
  dom.settingsPanel.classList.add('hidden');
  document.body.style.overflow = '';
  // 刷新推荐按钮状态
  loadSettings();
  updateRecommendButton();
}

// ----- Toast -----
let toastTimer = null;
function showToast(message, duration = 2500) {
  if (toastTimer) clearTimeout(toastTimer);
  dom.toast.textContent = message;
  dom.toast.classList.remove('hidden');
  toastTimer = setTimeout(() => {
    dom.toast.classList.add('hidden');
  }, duration);
}

// ----- 事件绑定 -----
function bindEvents() {
  // 推荐按钮
  dom.btnRecommend.addEventListener('click', handleRecommend);

  // 文字输入字符计数
  dom.moodText.addEventListener('input', () => {
    const len = dom.moodText.value.length;
    dom.charCount.textContent = `${len}/200`;
    if (len > 180) {
      dom.charCount.style.color = 'var(--color-error)';
    } else {
      dom.charCount.style.color = 'var(--color-text-lighter)';
    }
  });

  // 设置
  $('#btnSettings').addEventListener('click', openSettings);
  $('#btnCloseSettings').addEventListener('click', closeSettings);
  dom.overlay.addEventListener('click', closeSettings);
  $('#btnSaveSettings').addEventListener('click', saveSettings);

  // 重试
  $('#btnRetry').addEventListener('click', handleRetry);
  $('#btnRetryError').addEventListener('click', handleRetry);

  // 复制
  $('#btnCopy').addEventListener('click', handleCopy);

  // 键盘：ESC 关闭设置
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSettings();
  });

  // API Key 变化时更新推荐按钮
  $('#apiKey').addEventListener('input', () => {
    state.settings.apiKey = $('#apiKey').value.trim();
    updateRecommendButton();
  });
}

// ----- 启动 -----
document.addEventListener('DOMContentLoaded', init);

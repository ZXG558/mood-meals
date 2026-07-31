/* ========================================
   深大吃啥 · 主应用逻辑
   ======================================== */

// ----- 全局状态 -----
const state = {
  selectedMood: null,
  selectedMeals: ['lunch', 'dinner'],
  settings: { ...DEFAULT_SETTINGS },
  currentResult: null,
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
  resultTitle: $('#resultTitle'),
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
  updateMealChips();
}

// ----- 设置管理 -----
function loadSettings() {
  try {
    const saved = localStorage.getItem('shenzhen-eats-settings');
    if (saved) {
      state.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    }
  } catch (e) {
    state.settings = { ...DEFAULT_SETTINGS };
  }
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

  localStorage.setItem('shenzhen-eats-settings', JSON.stringify(state.settings));
  showToast('✅ 设置已保存');
  closeSettings();
}

// ----- 餐次选择（chip 按钮） -----
function updateMealChips() {
  $$('#mealSelector .chip').forEach(chip => {
    const meal = chip.dataset.meal;
    if (state.selectedMeals.includes(meal)) {
      chip.classList.add('selected');
    } else {
      chip.classList.remove('selected');
    }
  });
}

// ----- 心情按钮 -----
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

function selectMood(mood, btnEl) {
  $$('.mood-btn').forEach(b => b.classList.remove('selected'));
  if (state.selectedMood && state.selectedMood.value === mood.value) {
    state.selectedMood = null;
  } else {
    state.selectedMood = mood;
    btnEl.classList.add('selected');
  }
  updateRecommendButton();
}

function updateRecommendButton() {
  const hasApiKey = !!state.settings.apiKey;
  const hasMeal = state.selectedMeals.length > 0;

  if (!hasApiKey) {
    dom.hintText.textContent = '⚠️ 请先在设置中填写 DeepSeek API Key';
    dom.hintText.style.color = 'var(--color-error)';
    dom.btnRecommend.disabled = true;
  } else if (!hasMeal) {
    dom.hintText.textContent = '👆 至少选一餐';
    dom.hintText.style.color = 'var(--color-text-lighter)';
    dom.btnRecommend.disabled = true;
  } else {
    dom.hintText.textContent = '准备好了，点推荐吧！✨';
    dom.hintText.style.color = 'var(--color-success)';
    dom.btnRecommend.disabled = false;
  }
}

// ----- 收集所有输入参数 -----
function collectParams() {
  return {
    moodEmoji: state.selectedMood ? state.selectedMood.emoji : '🤔',
    moodLabel: state.selectedMood ? state.selectedMood.label : '没选',
    moodText: dom.moodText.value,
    budget: $('#budget').value,
    timeAvail: $('#timeAvail').value,
    dineLocation: $('#dineLocation').value,
    foodType: $('#foodType').value,
    groupSize: $('#groupSize').value,
    selectedMeals: state.selectedMeals,
    settings: state.settings,
  };
}

// ----- 推荐流程 -----
async function handleRecommend() {
  if (state.isLoading) return;
  if (state.selectedMeals.length === 0) return;
  if (!state.settings.apiKey) {
    showToast('⚠️ 请先在设置中填写 DeepSeek API Key');
    return;
  }

  state.isLoading = true;
  const params = collectParams();

  // 切换到结果区
  dom.moodSection.classList.add('hidden');
  dom.resultSection.classList.remove('hidden');

  const mealNames = { breakfast: '早餐', lunch: '午餐', dinner: '晚餐' };
  const selectedNames = params.selectedMeals.map(m => mealNames[m]).join(' · ');
  dom.resultTitle.textContent = '你的' + selectedNames;
  dom.resultMood.textContent = state.selectedMood
    ? `状态：${state.selectedMood.emoji} ${state.selectedMood.label}`
    : '';

  showLoading();

  try {
    const result = await getMealRecommendations(params);
    state.currentResult = result;
    hideLoading();
    renderMeals(result, params.selectedMeals);
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

  const loadingTexts = [
    '正在搜索深大周边美食…',
    '翻桂庙小吃街菜单中…',
    '帮你排除踩雷选项…',
    '食堂还是外卖，这是个问题…',
    '正在咨询深大老饕…',
    'AI大厨正在脑中检索…',
  ];
  dom.loadingText.textContent = loadingTexts[Math.floor(Math.random() * loadingTexts.length)];
}

function hideLoading() {
  dom.loadingContainer.classList.add('hidden');
}

// ----- 渲染结果 -----
function renderMeals(result, selectedMeals) {
  dom.mealsContainer.classList.remove('hidden');
  dom.errorContainer.classList.add('hidden');

  const mealKeys = ['breakfast', 'lunch', 'dinner'];

  mealKeys.forEach(key => {
    const card = document.getElementById(key + 'Card');
    const meal = result[key];

    if (!meal || !meal.name || !selectedMeals.includes(key)) {
      card.classList.add('hidden');
      return;
    }

    card.classList.remove('hidden');
    $('#' + key + 'Name').textContent = meal.name || '—';
    $('#' + key + 'Desc').textContent = meal.description || '';

    // 标签：在哪吃、价格、耗时
    const whereEl = $('#' + key + 'Where');
    const priceEl = $('#' + key + 'Price');
    const timeEl = $('#' + key + 'Time');

    whereEl.textContent = '📍 ' + (meal.where_to_get || '');
    whereEl.classList.toggle('hidden', !meal.where_to_get);

    priceEl.textContent = '💰 ' + (meal.price || '');
    priceEl.classList.toggle('hidden', !meal.price);

    timeEl.textContent = '⏱️ ' + (meal.time_needed || '');
    timeEl.classList.toggle('hidden', !meal.time_needed);

    $('#' + key + 'Reason').textContent = '💡 ' + (meal.mood_reason || '');
    $('#' + key + 'Tips').textContent = meal.tips ? '💬 ' + meal.tips : '';
  });

  if (result.overall_note) {
    dom.overallNote.textContent = '💬 ' + result.overall_note;
    dom.overallNote.classList.remove('hidden');
  } else {
    dom.overallNote.classList.add('hidden');
  }

  dom.resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ----- 错误处理 -----
function handleError(err) {
  dom.mealsContainer.classList.add('hidden');
  dom.errorContainer.classList.remove('hidden');

  let msg = '出了点问题，请稍后再试。';
  if (err.message === 'NO_API_KEY') {
    msg = '请先在设置中填写你的 DeepSeek API Key。';
  } else if (err.status === 401) {
    msg = 'API Key 无效，请检查是否填写正确。';
  } else if (err.status === 402) {
    msg = 'API 账户余额不足，请去 DeepSeek 平台充值。';
  } else if (err.status === 429) {
    msg = '请求太频繁了，请稍等片刻再试。';
  } else if (err.message === 'JSON_PARSE_ERROR') {
    msg = 'AI 返回格式异常，请重试一次。';
  } else if (err.message === 'INCOMPLETE_RESPONSE') {
    msg = 'AI 返回数据不完整，请重试一次。';
  } else if (err.apiMessage) {
    msg = 'API 返回错误：' + err.apiMessage;
  } else if (err.message) {
    msg = '错误：' + err.message;
  }

  dom.errorMsg.textContent = msg;
}

// ----- 重新推荐 -----
function handleRetry() {
  state.currentResult = null;
  dom.moodSection.classList.remove('hidden');
  dom.resultSection.classList.add('hidden');
  dom.moodSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  setTimeout(() => handleRecommend(), 300);
}

// ----- 复制菜单 -----
function handleCopy() {
  if (!state.currentResult) return;

  const mealLabels = { breakfast: '🥣 早餐', lunch: '🍱 午餐', dinner: '🍲 晚餐' };
  const lines = ['🍽️ 深大吃啥 · 今日推荐', ''];

  state.selectedMeals.forEach(key => {
    const m = state.currentResult[key];
    if (m && m.name) {
      lines.push(mealLabels[key] + '：' + m.name);
      if (m.description) lines.push('   ' + m.description);
      if (m.where_to_get) lines.push('   📍 ' + m.where_to_get);
      if (m.price) lines.push('   💰 ' + m.price);
      if (m.time_needed) lines.push('   ⏱️ ' + m.time_needed);
      if (m.tips) lines.push('   💬 ' + m.tips);
      lines.push('');
    }
  });

  if (state.currentResult.overall_note) {
    lines.push('💬 ' + state.currentResult.overall_note);
    lines.push('');
  }
  lines.push('—— 由 DeepSeek AI 搭配 · 深大粤海校区');

  const text = lines.join('\n');

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      showToast('📋 已复制，可以发到宿舍群了！');
    }).catch(() => fallbackCopy(text));
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
  try { document.execCommand('copy'); showToast('📋 已复制到剪贴板'); }
  catch (e) { showToast('⚠️ 复制失败，请截图保存'); }
  document.body.removeChild(textarea);
}

// ----- 设置面板 -----
function openSettings() {
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
  loadSettings();
  updateRecommendButton();
}

// ----- Toast -----
let toastTimer = null;
function showToast(message, duration = 2500) {
  if (toastTimer) clearTimeout(toastTimer);
  dom.toast.textContent = message;
  dom.toast.classList.remove('hidden');
  toastTimer = setTimeout(() => { dom.toast.classList.add('hidden'); }, duration);
}

// ----- 事件绑定 -----
function bindEvents() {
  // 餐次选择
  $$('#mealSelector .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const meal = chip.dataset.meal;
      if (state.selectedMeals.includes(meal)) {
        if (state.selectedMeals.length > 1) {
          state.selectedMeals = state.selectedMeals.filter(m => m !== meal);
        }
      } else {
        state.selectedMeals = [...state.selectedMeals, meal];
      }
      updateMealChips();
      updateRecommendButton();
    });
  });

  // 推荐按钮
  dom.btnRecommend.addEventListener('click', handleRecommend);

  // 文字输入字符计数
  dom.moodText.addEventListener('input', () => {
    const len = dom.moodText.value.length;
    dom.charCount.textContent = `${len}/200`;
    dom.charCount.style.color = len > 180 ? 'var(--color-error)' : 'var(--color-text-lighter)';
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

  // 测试 API 连接
  $('#btnTestKey').addEventListener('click', async () => {
    const key = $('#apiKey').value.trim();
    const resultEl = $('#testResult');
    resultEl.classList.remove('hidden');
    resultEl.textContent = '⏳ 正在测试…';
    const result = await testApiConnection(key);
    resultEl.textContent = result.message;
    resultEl.style.color = result.ok ? 'var(--color-success)' : 'var(--color-error)';
  });

  // ESC 关闭设置
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

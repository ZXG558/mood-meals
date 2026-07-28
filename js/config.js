/* ========================================
   心情三餐 · 配置 & Prompt 模板
   ======================================== */

// 心情选项
const MOOD_OPTIONS = [
  { emoji: '😊', label: '开心', value: 'happy' },
  { emoji: '😢', label: '难过', value: 'sad' },
  { emoji: '😫', label: '疲惫', value: 'tired' },
  { emoji: '⚡', label: '精力充沛', value: 'energetic' },
  { emoji: '😰', label: '焦虑', value: 'anxious' },
  { emoji: '🥱', label: '犯懒', value: 'lazy' },
  { emoji: '😋', label: '嘴馋', value: 'craving' },
  { emoji: '🤔', label: '选择困难', value: 'indecisive' },
];

// 默认设置
const DEFAULT_SETTINGS = {
  apiKey: '',
  allergies: '',
  taste: '',
  dietType: '',
  cuisine: '',
  model: 'claude-sonnet-4-20250514',
};

// 当前季节
function getCurrentSeason() {
  const month = new Date().getMonth() + 1; // 1-12
  if (month >= 3 && month <= 5) return '春季';
  if (month >= 6 && month <= 8) return '夏季';
  if (month >= 9 && month <= 11) return '秋季';
  return '冬季';
}

// 当前时段
function getTimeOfDay() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 10) return '早晨';
  if (hour >= 10 && hour < 14) return '中午';
  if (hour >= 14 && hour < 18) return '下午';
  if (hour >= 18 && hour < 22) return '傍晚';
  return '深夜';
}

// 构建用户偏好描述
function buildPreferencesText(settings) {
  const parts = [];
  if (settings.allergies) parts.push('忌口/过敏：' + settings.allergies);
  if (settings.taste) parts.push('口味偏好：' + settings.taste);
  if (settings.dietType) parts.push('饮食类型：' + settings.dietType);
  if (settings.cuisine) parts.push('偏好的菜系：' + settings.cuisine);
  return parts.length > 0 ? parts.join('；') : '无特殊要求，大众口味即可';
}

// 构建发送给 Claude 的系统 Prompt
function buildSystemPrompt() {
  return `你是一位温暖又专业的营养师兼私厨。用户会根据当下的心情，请你推荐一日三餐。
你需要：
1. 推荐真正好吃、在中国容易获取或容易做的菜
2. 每餐推荐要解释"为什么这道菜适合用户此刻的心情"
3. 考虑季节（${getCurrentSeason()}）和时段，推荐应季、符合时段的食物
4. 给实用的小贴士

请**只返回 JSON**，不要任何其他文字。格式：
{
  "breakfast": {
    "name": "菜名",
    "description": "一句话描述这道菜",
    "mood_reason": "为什么这道菜适合用户此刻的心情",
    "calories": "约XXX kcal",
    "tips": "实用小贴士（搭配建议/做法技巧）"
  },
  "lunch": { ... 同上 ... },
  "dinner": { ... 同上 ... },
  "overall_note": "整体点评，温暖鼓励的一句话（30字以内）"
}`;
}

// 构建用户消息
function buildUserMessage(moodEmoji, moodLabel, moodText, settings) {
  const preferencesText = buildPreferencesText(settings);
  let message = `【我此刻的心情】${moodEmoji} ${moodLabel}`;
  if (moodText.trim()) {
    message += `（${moodText.trim()}）`;
  }
  message += `\n【饮食偏好】${preferencesText}`;
  message += `\n【当前时段】${getTimeOfDay()}`;
  message += `\n【当前季节】${getCurrentSeason()}`;
  message += `\n\n请根据以上信息，为我推荐今天的一日三餐。`;
  return message;
}

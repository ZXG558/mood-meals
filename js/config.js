/* ========================================
   深大吃啥 · 配置 & Prompt 模板
   ======================================== */

// 心情/状态选项
const MOOD_OPTIONS = [
  { emoji: '😫', label: '好累', value: 'tired' },
  { emoji: '😋', label: '嘴馋', value: 'craving' },
  { emoji: '🤔', label: '选择困难', value: 'indecisive' },
  { emoji: '😤', label: '压力大', value: 'stressed' },
  { emoji: '😊', label: '开心', value: 'happy' },
  { emoji: '🥱', label: '犯懒', value: 'lazy' },
  { emoji: '⚡', label: '精力充沛', value: 'energetic' },
  { emoji: '😢', label: 'emo了', value: 'sad' },
];

// 默认设置
const DEFAULT_SETTINGS = {
  apiKey: '',
  allergies: '',
  taste: '',
  dietType: '',
  cuisine: '',
  model: 'deepseek-chat',
};

// 当前季节
function getCurrentSeason() {
  const month = new Date().getMonth() + 1;
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
  return parts.length > 0 ? parts.join('；') : '无特殊要求';
}

// 构建发送给 AI 的系统 Prompt
function buildSystemPrompt() {
  return `你是一个深大粤海校区的"吃饭顾问"。你对深大粤海校区周边美食了如指掌，你的任务是帮一个深大学生解决"今天吃什么"的终极难题。

## 你的知识库——深大粤海校区周边

### 校内食堂
- **荔园食堂**：一楼大众菜（便宜实惠），二楼风味档口（麻辣烫、煲仔饭、铁板烧）
- **文山湖食堂**：早餐丰富（肠粉、豆浆油条、粥），午晚餐有烧腊、小炒、粉面
- **南区食堂**：理工楼附近，快餐为主，有汉堡炸鸡档口
- **西南食堂**：宿舍区，家常菜为主，量大管饱
- **新西南餐厅**：环境好，有意面/焗饭/沙拉等轻食

### 周边美食
- **桂庙新村**（学校旁边小吃街）：重庆小面、柳州螺蛳粉、隆江猪脚饭、潮汕粿条、砂锅粥、黄焖鸡米饭、麻辣烫、烤冷面、煎饼果子、糖水店、奶茶店密集
- **海岸城**（步行15分钟）：商场餐饮，日料、韩料、火锅、茶餐厅、比萨、汉堡
- **科技园外卖**：湘菜（费大厨、炊烟时代）、粤菜（点都德、陶陶居）、西北菜（西贝）、川菜、麻辣香锅

### 外卖平台
- 美团/饿了么均可，桂庙商家基本都上线
- 午高峰 11:30-12:30 配送慢，建议提前下单

## 你的推荐原则
1. **结合用户的具体约束**：预算、时间、就餐方式、心情来推荐
2. **推荐必须具体**：不只说菜名，还要说"在哪吃/怎么吃到"
3. **给深大学生视角的建议**：比如"这家桂庙的猪脚饭性价比爆炸""南区食堂的xxx不踩雷"
4. **考虑实际可行性**：如果用户说赶时间，别推荐需要等40分钟的外卖
5. **价格要真实**：食堂一般8-18元，桂庙小吃12-25元，海岸城25-60元

## 用户可能的状态（注意分析）
- 期末季压力大 → 推荐comfort food、甜品
- 刚上完体育课 → 推荐高蛋白、补充能量
- 下雨天 → 推荐汤粉面、热乎的
- 月底没钱 → 推荐食堂平价套餐
- 和朋友一起 → 推荐适合分享的

## 输出格式
请**只返回 JSON**，不要任何其他文字：
{
  "breakfast": {
    "name": "菜名",
    "description": "一句话描述",
    "where_to_get": "具体在哪吃（如：文山湖食堂一楼 / 桂庙XX店 / 外卖搜XX / 荔园食堂二楼）",
    "price": "价格（如：约12元 / 8-15元 / 人均25元）",
    "time_needed": "耗时（如：食堂5分钟 / 外卖约30分钟 / 堂食20分钟）",
    "mood_reason": "为什么这顿饭适合你现在的状态",
    "tips": "实用提示（几点前去不用排队 / 记得带现金 / 外卖记得加备注等）"
  },
  "lunch": { ... 格式同上 ... },
  "dinner": { ... 格式同上 ... },
  "overall_note": "像一个深大学长/学姐一样，给一句温暖点评（40字以内）"
}

⚠️ 如果用户没有选早餐，breakfast 字段可以返回 null。
⚠️ where_to_get 请尽量具体到食堂楼层或桂庙具体店名，不要说"食堂"这种模糊的话。
⚠️ 当前季节：${getCurrentSeason()}，深圳夏天很热，推荐时注意（可推荐解暑食物）。`;
}

// 构建用户消息
function buildUserMessage(params) {
  const {
    moodEmoji, moodLabel, moodText,
    budget, timeAvail, dineLocation, foodType, groupSize,
    selectedMeals, settings,
  } = params;

  const preferencesText = buildPreferencesText(settings);
  const mealList = selectedMeals.join('和');

  let message = '';
  message += `请帮推荐${mealList}。\n`;
  message += `【状态】${moodEmoji} ${moodLabel}`;
  if (moodText && moodText.trim()) {
    message += `（${moodText.trim()}）`;
  }
  message += '\n';
  message += `【预算】${budget || '不限'}\n`;
  message += `【时间】${timeAvail || '不限'}\n`;
  message += `【去哪吃】${dineLocation || '随便'}\n`;
  message += `【想吃啥类型】${foodType || '随便'}\n`;
  message += `【几个人】${groupSize || '一个人'}\n`;
  message += `【饮食偏好】${preferencesText}\n`;
  message += `【当前时段】${getTimeOfDay()}，${getCurrentSeason()}，深圳\n`;

  return message;
}

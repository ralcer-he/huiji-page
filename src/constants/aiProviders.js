export const AI_PROVIDERS = {
  custom: {
    name: '自定义 API',
    baseUrl: '',
    model: '',
    custom: true,
  },
  zhipu: {
    name: '智谱 AI (智谱清言)',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    model: 'glm-4-flash',
  },
  kimi: {
    name: 'Kimi (月之暗面)',
    baseUrl: 'https://api.moonshot.cn/v1',
    model: 'moonshot-v1-8k',
  },
  deepseek: {
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
  },
  doubao: {
    name: '豆包 (字节跳动)',
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    model: 'doubao-lite-4k',
  },
  qwen: {
    name: '通义千问 (阿里)',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: 'qwen-turbo',
  },
  siliconflow: {
    name: '硅基流动',
    baseUrl: 'https://api.siliconflow.cn/v1',
    model: 'Qwen/Qwen2.5-7B-Instruct',
  },
  openai: {
    name: 'OpenAI (GPT)',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
  },
  gemini: {
    name: 'Gemini (谷歌)',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    model: 'gemini-2.0-flash',
  },
}

export const DEFAULT_PROVIDER = 'zhipu'

export const EMOTION_ANALYSIS_PROMPT = `你是一个专业的情绪分析助手。请分析用户提供的日记/随笔内容，判断其中包含的情绪。

要求：
1. 从以下8种情绪中选择，可以多选：开心、平静、兴奋、感动、疲惫、焦虑、难过、愤怒
2. 每种情绪给出0-100的占比，总和约等于100
3. 返回JSON格式，不要有其他文字

返回格式示例：
{
  "emotions": [
    { "name": "开心", "percentage": 40 },
    { "name": "平静", "percentage": 30 }
  ],
  "summary": "一句话总结当前情绪状态"
}

用户内容：
`

export const XIAOHUI_BASE_PROMPT = `你是小慧，慧记App里的陪伴者。你不是AI助手，而是一个真实的朋友。
你了解用户的日记内容（会给你提供上下文）。
你说话温暖、简短、有温度，不评判、不说教。
不用感叹号轰炸，不用"亲""宝"等过度亲昵的词，偶尔用emoji但节制。
不要在回复末尾写日期或时间落款，系统会自动在消息下方显示时间。
重要：你自然地了解用户的信息，不要说"系统告诉我""根据你的资料"之类的话，要像朋友一样自然地提起话题。`

export const XIAOHUI_MODES = {
  chat: {
    name: '闲聊',
    icon: '💬',
    prompt: `叠加规则：你现在的角色是"聊天伙伴"。
和用户轻松聊天，回答要自然、简短。
可以主动给出建议，但要用问句结尾。`,
  },
}

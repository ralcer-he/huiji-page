import { EMOTIONS } from '../constants/emotions'

const TYPE_KEYWORDS = {
  memo: {
    keywords: ['备忘', '待办', '任务', '提醒', 'todo', '打卡', '清单'],
    priority: 3,
  },
  diary: {
    keywords: ['日记', '日志', '周记'],
    priority: 2,
  },
  mood: {
    keywords: ['心情', '情绪'],
    priority: 3,
  },
  note: {
    keywords: ['随笔', '笔记', '灵感', '感悟', '心得', '感想', '杂记'],
    priority: 2,
  },
}

const EXPLICIT_TYPE_PATTERNS = [
  { pattern: /记到(随笔|备忘|日记|心情)(里面|里边|里)/, typeMap: { '随笔': 'note', '备忘': 'memo', '日记': 'diary', '心情': 'mood' } },
  { pattern: /记在(随笔|备忘|日记|心情)(里面|里边|里)/, typeMap: { '随笔': 'note', '备忘': 'memo', '日记': 'diary', '心情': 'mood' } },
  { pattern: /写到(随笔|备忘|日记|心情)(里面|里边|里)/, typeMap: { '随笔': 'note', '备忘': 'memo', '日记': 'diary', '心情': 'mood' } },
  { pattern: /写在(随笔|备忘|日记|心情)(里面|里边|里)/, typeMap: { '随笔': 'note', '备忘': 'memo', '日记': 'diary', '心情': 'mood' } },
  { pattern: /加到(随笔|备忘|日记|心情)(里面|里边|里)/, typeMap: { '随笔': 'note', '备忘': 'memo', '日记': 'diary', '心情': 'mood' } },
  { pattern: /加在(随笔|备忘|日记|心情)(里面|里边|里)/, typeMap: { '随笔': 'note', '备忘': 'memo', '日记': 'diary', '心情': 'mood' } },
  { pattern: /添加到(随笔|备忘|日记|心情)(里面|里边|里)/, typeMap: { '随笔': 'note', '备忘': 'memo', '日记': 'diary', '心情': 'mood' } },
  { pattern: /记录到(随笔|备忘|日记|心情)(里面|里边|里)/, typeMap: { '随笔': 'note', '备忘': 'memo', '日记': 'diary', '心情': 'mood' } },
  { pattern: /(随笔|备忘|日记|心情)[:：]/, typeMap: { '随笔': 'note', '备忘': 'memo', '日记': 'diary', '心情': 'mood' } },
  { pattern: /写(一篇|个|条|篇)(随笔|日记|备忘|心情|笔记)/, typeMap: { '随笔': 'note', '备忘': 'memo', '日记': 'diary', '心情': 'mood', '笔记': 'note' } },
  { pattern: /记(一篇|个|条|一下)(随笔|日记|备忘|心情|笔记)/, typeMap: { '随笔': 'note', '备忘': 'memo', '日记': 'diary', '心情': 'mood', '笔记': 'note' } },
]

const EMOTION_MAP = {
  '烦': '烦躁', '烦躁': '烦躁', '烦人': '烦躁', '郁闷': '烦躁',
  '累': '疲惫', '疲惫': '疲惫', '困': '疲惫',
  '开心': '开心', '高兴': '开心', '快乐': '开心', '愉快': '开心', '幸福': '开心', '不错': '开心',
  '难过': '难过', '伤心': '难过', '悲伤': '难过', '沮丧': '难过', '失落': '难过',
  '生气': '生气', '愤怒': '生气', '气死': '生气', '恼火': '生气',
  '焦虑': '焦虑', '担心': '焦虑', '紧张': '焦虑', '不安': '焦虑', '着急': '焦虑',
  '兴奋': '兴奋', '激动': '兴奋',
  '平静': '平静', '淡定': '平静', '舒服': '平静', '放松': '平静',
  '感动': '感动', '想哭': '感动', '暖心': '感动',
}

const HELP_KEYWORDS = ['怎么', '如何', '哪里', '在哪里', '帮助', '教程', '使用', '功能', '在哪']

const DETAIL_KEYWORDS = ['备注', '详细', '详细记录', '说说']

// 动作动词：用户说了这些词，大概率想创建记录，不是闲聊
const ACTION_WORDS = ['记录', '记下', '写下', '保存', '打卡', '总结', '写一下', '记一下', '记个', '别忘了', '别忘记']

// 指令前缀（严格按长度降序排列，长的优先匹配，避免短前缀截断长表达）
const INSTRUCTION_PREFIXES = [
  '帮我写一下', '帮我记一下', '帮我添加一下', '帮我记录一下',
  '帮我写一篇', '帮我写一条', '帮我写一个', '帮我记一个', '帮我记一条',
  '帮我写', '帮我记录', '帮我记', '帮我添加', '帮我加',
  '记录一下', '记一下', '记下来', '记个', '记录个', '记一篇', '记一条',
  '总结一下', '写下', '记下', '保存一下',
  '写一个', '写一下', '写个', '写一篇', '写一条',
  '添加一个', '添加一下', '加个', '加一下',
  '创建一个', '新建一个',
  '记到', '记在', '写到', '写在', '加到', '加在',
  '我要', '我想', '我需要', '把', '记录', '保存', '总结',
]

// 时间关键词 → 偏向备忘
const TIME_KEYWORDS = ['明天', '后天', '下周', '下周', '下个月', '今天', '晚上', '早上', '中午', '下午', '周末', '周日', '周六', '周一', '周二', '周三', '周四', '周五', '几点', '几点钟', '之前', '以前', '然后', '到时候', '别忘了', '别忘记']

// "总结/回顾/今天" 类关键词 → 偏向日记/随笔
const DIARY_HINTS = ['今天', '昨天', '这周', '这周', '最近', '回顾', '总结', '一天', '早上', '上午', '下午', '晚上']

export function parseIntent(text) {
  const originalText = text.trim()

  let intent = 'chat'
  let recordType = null
  let content = originalText
  let title = ''
  let emotion = ''
  let isDetailed = false
  let confidence = 0.3

  if (HELP_KEYWORDS.some(kw => originalText.includes(kw))) {
    intent = 'help'
    confidence = 0.85
    return { intent, recordType, content: originalText, title, emotion, isDetailed, confidence }
  }

  // 第一步：显式类型检测（最高优先级）
  const detectedType = detectRecordType(originalText)
  const detectedEmotion = detectEmotion(originalText)

  if (detectedType) {
    recordType = detectedType
    intent = `create_${detectedType}`
    confidence = 0.75

    if (detectedType === 'mood') {
      emotion = detectedEmotion
      isDetailed = DETAIL_KEYWORDS.some(kw => originalText.includes(kw))
    }
  } else if (detectedEmotion !== '平静') {
    // 第二步：情绪词检测 → 创建心情
    recordType = 'mood'
    intent = 'create_mood'
    emotion = detectedEmotion
    isDetailed = DETAIL_KEYWORDS.some(kw => originalText.includes(kw))
    confidence = 0.65
  } else {
    // 第三步：动作动词检测 → 推断类型
    const hasActionWord = ACTION_WORDS.some(aw => originalText.includes(aw))
    if (hasActionWord) {
      const inferred = inferTypeFromContext(originalText)
      recordType = inferred.type
      intent = `create_${inferred.type}`
      confidence = inferred.confidence
    }
  }

  content = extractCoreContent(originalText, detectedType || recordType)

  if (recordType === 'mood' && emotion === '平静') {
    const textEmotion = detectEmotion(originalText)
    if (textEmotion !== '平静') {
      emotion = textEmotion
    }
  }

  const titleResult = extractTitle(content)
  if (titleResult.title) {
    title = titleResult.title
    content = titleResult.remaining
  }

  content = cleanContent(content)

  if (!content || content.length === 0) {
    if (recordType === 'mood' && emotion) {
      content = emotion
    } else if (recordType) {
      // 有记录类型但内容被清空了，尝试用原文清理
      const fallback = cleanContent(originalText)
      // 如果清理后还是包含指令词，说明内容确实为空
      const hasInstructionWord = INSTRUCTION_PREFIXES.some(p => fallback.startsWith(p)) || ACTION_WORDS.some(a => fallback.startsWith(a))
      content = hasInstructionWord ? '' : fallback
    } else {
      content = originalText
    }
  }

  return { intent, recordType, content, title, emotion, isDetailed, confidence }
}

function detectRecordType(text) {
  for (const { pattern, typeMap } of EXPLICIT_TYPE_PATTERNS) {
    const match = text.match(pattern)
    if (match) {
      const typeName = match[1]
      if (typeMap[typeName]) {
        return typeMap[typeName]
      }
    }
  }

  let bestMatch = null
  let bestPriority = Infinity

  for (const [type, config] of Object.entries(TYPE_KEYWORDS)) {
    if (config.keywords.some(kw => text.includes(kw))) {
      if (config.priority < bestPriority) {
        bestPriority = config.priority
        bestMatch = type
      }
    }
  }

  return bestMatch
}

// 根据上下文推断记录类型（当没有显式类型关键词时）
function inferTypeFromContext(text) {
  // 有时间关键词或提醒意图 → 备忘
  if (TIME_KEYWORDS.some(kw => text.includes(kw))) {
    return { type: 'memo', confidence: 0.55 }
  }
  // 有日期/回顾/总结关键词 → 日记
  if (DIARY_HINTS.some(kw => text.includes(kw)) && /总结|回顾|日志/.test(text)) {
    return { type: 'diary', confidence: 0.5 }
  }
  // 默认 → 随笔
  return { type: 'note', confidence: 0.45 }
}

function extractCoreContent(text, type) {
  let result = text

  for (const { pattern } of EXPLICIT_TYPE_PATTERNS) {
    result = result.replace(pattern, '')
  }

  for (const prefix of INSTRUCTION_PREFIXES) {
    while (result.includes(prefix)) {
      result = result.replace(prefix, '')
    }
  }

  // 处理 "记下来" / "记录下来" / "保存下来" / "别忘了" 等后缀
  result = result.replace(/(记|记录|保存|写下)(下来|一下)\s*/g, '')
  result = result.replace(/别(忘了|忘记)\s*/g, '')

  const allTypeKeywords = []
  for (const config of Object.values(TYPE_KEYWORDS)) {
    allTypeKeywords.push(...config.keywords)
  }

  for (const kw of allTypeKeywords) {
    result = result.replace(new RegExp(kw, 'g'), '')
  }

  // 清理 DETAIL_KEYWORDS（备注/详细/说说等）及其前面的连接词
  for (const kw of DETAIL_KEYWORDS) {
    result = result.replace(new RegExp(`[，,和与跟]\\s*${kw}`, 'g'), '')
    result = result.replace(new RegExp(kw, 'g'), '')
  }

  result = result.replace(/(里面|里边|里|一下|个|吧|哦|呢|啊|的|啦|呀|和|与|跟|下来)\s*$/g, '')
  result = result.replace(/^[，,。！？、\s]+/, '')
  result = result.replace(/[，,。！？、\s]+$/, '')

  // 清理开头的量词（"个背单词" → "背单词"，"一段灵感" → "灵感"）
  // 长的量词放前面，避免 "一个?" 先匹配 "一" 导致 "一段" 漏掉
  result = result.replace(/^(一段|一些|一点|几条|几个|一篇|一条|一件|一项|一个?|个)\s*/g, '')

  // 如果提取后内容太短（只剩1个字），可能是类型关键词把内容吃掉了
  // 回退：只去掉指令前缀，保留类型关键词作为内容
  if (result.length <= 1 && text.length > 2) {
    let conservative = text
    for (const prefix of INSTRUCTION_PREFIXES) {
      while (conservative.includes(prefix)) {
        conservative = conservative.replace(prefix, '')
      }
    }
    conservative = cleanContent(conservative)
    if (conservative.length > result.length) {
      result = conservative
    }
  }

  return result.trim()
}

function extractTitle(text) {
  const titlePatterns = [
    /标题[：:]\s*([^。，！？\n]+)/,
    /主题[：:]\s*([^。，！？\n]+)/,
    /名字叫[：:]\s*([^。，！？\n]+)/,
  ]

  for (const pattern of titlePatterns) {
    const match = text.match(pattern)
    if (match) {
      const title = match[1].trim()
      const remaining = text.replace(match[0], '').trim()
      return { title, remaining }
    }
  }

  return { title: '', remaining: text }
}

function detectEmotion(text) {
  for (const [keyword, emotionName] of Object.entries(EMOTION_MAP)) {
    if (text.includes(keyword)) {
      return emotionName
    }
  }

  for (const emotion of EMOTIONS) {
    if (text.includes(emotion.name)) {
      return emotion.name
    }
  }

  return '平静'
}

function cleanContent(text) {
  if (!text) return ''

  text = text.replace(/[\s\n]+/g, ' ')
  text = text.replace(/^[的\s]+/, '')
  text = text.replace(/[\s的]+$/, '')

  return text.trim()
}

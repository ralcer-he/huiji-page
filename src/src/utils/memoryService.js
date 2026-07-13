import {
  getUserProfile,
  saveUserProfile,
  searchMemoryEvents,
  markMemoryAccessed,
  addMemoryEvent,
} from '../db/database'

const STOP_WORDS = new Set([
  '的', '了', '是', '在', '我', '有', '和', '就', '不', '人', '都', '一', '一个',
  '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好',
  '自己', '这', '那', '它', '他', '她', '吗', '吧', '呢', '啊', '嗯', '哦', '哈',
  '那', '什么', '怎么', '为什么', '这个', '那个', '可以', '可能', '应该', '觉得',
])

export function extractKeywords(text) {
  const cleaned = text.replace(/[，。！？、；：""''（）【】《》\s,.!?;:"'()]/g, ' ')

  const words = []
  let current = ''
  for (const char of cleaned) {
    if (STOP_WORDS.has(char)) {
      if (current.length >= 2) words.push(current)
      current = ''
    } else if (char === ' ') {
      if (current.length >= 2) words.push(current)
      current = ''
    } else {
      current += char
    }
  }
  if (current.length >= 2) words.push(current)

  return [...new Set(words)].slice(0, 8)
}

export async function buildMemoryContext(userMessage, options = {}) {
  const { maxMemories = 3, maxChars = 300 } = options

  const keywords = extractKeywords(userMessage)

  const memories = await searchMemoryEvents(keywords, maxMemories)

  for (const mem of memories) {
    await markMemoryAccessed(mem.id)
  }

  if (memories.length === 0) {
    return { context: '', memoryCount: 0 }
  }

  const memoryLines = memories.map(m => `- ${m.content}`)
  let context = memoryLines.join('\n')

  if (context.length > maxChars) {
    context = context.slice(0, maxChars) + '...'
  }

  return { context, memoryCount: memories.length, keywords }
}

export async function updateProfileFromMessage(userMessage, aiResponse) {
  const profile = await getUserProfile()
  const updates = {}

  // 检测音乐相关偏好
  const musicKeywords = ['歌', '音乐', 'ヨルシカ', '米津玄師', 'YOASOBI', 'RADWIMPS', '听']
  if (musicKeywords.some(kw => userMessage.includes(kw))) {
    const existing = profile.preferences.music || []
    const mentioned = musicKeywords.filter(kw => userMessage.includes(kw))
    updates.preferences = {
      ...profile.preferences,
      music: [...new Set([...existing, ...mentioned])].slice(0, 20),
    }
  }

  // 检测动漫相关偏好
  const animeKeywords = ['番', '动漫', '动画', '石之门', '间谍过家家', '夏目', '排球少年']
  if (animeKeywords.some(kw => userMessage.includes(kw))) {
    const existing = profile.preferences.anime || []
    const mentioned = animeKeywords.filter(kw => userMessage.includes(kw))
    updates.preferences = {
      ...(updates.preferences || profile.preferences),
      anime: [...new Set([...existing, ...mentioned])].slice(0, 20),
    }
  }

  // 检测情绪倾向
  const negativeWords = ['烦', '累', '难过', '焦虑', '压力', '崩溃', '孤独']
  const positiveWords = ['开心', '高兴', '兴奋', '满足', '幸福', '期待']
  const negCount = negativeWords.filter(w => userMessage.includes(w)).length
  const posCount = positiveWords.filter(w => userMessage.includes(w)).length

  if (negCount > posCount) {
    updates.personality = { ...profile.personality, emotionalTendency: 'sensitive' }
  } else if (posCount > negCount) {
    updates.personality = { ...profile.personality, emotionalTendency: 'optimistic' }
  }

  // 检测重要日子（生日、考试、面试等）
  const dayKeywords = [
    { pattern: /生日|生辰/, event: '生日' },
    { pattern: /考试|高考|考研|考公/, event: '考试' },
    { pattern: /面试/, event: '面试' },
    { pattern: /入职|上班第一天/, event: '入职' },
    { pattern: /毕业/, event: '毕业' },
    { pattern: /纪念日|周年/, event: '纪念日' },
  ]
  const existingMilestones = profile.milestones || []
  const newMilestones = []
  for (const { pattern, event } of dayKeywords) {
    if (pattern.test(userMessage) && !existingMilestones.some(m => m.event === event)) {
      newMilestones.push({ date: new Date().toISOString(), event })
    }
  }
  if (newMilestones.length > 0) {
    updates.milestones = [...existingMilestones, ...newMilestones].slice(0, 20)
  }

  if (Object.keys(updates).length > 0) {
    await saveUserProfile(updates)
  }
}

export async function maybeCreateMemoryEvent(userMessage, aiResponse, conversationContext) {
  const shouldStore = checkIfKeyEvent(userMessage, conversationContext)

  if (!shouldStore) return null

  const summary = userMessage.length > 100
    ? userMessage.slice(0, 100) + '...'
    : userMessage

  const keywords = extractKeywords(userMessage)

  let emotionalWeight = 3
  if (/难过|崩溃|哭|孤独|害怕|恐惧/.test(userMessage)) emotionalWeight = 5
  else if (/开心|兴奋|惊喜|生日|纪念/.test(userMessage)) emotionalWeight = 4
  else if (/第一次|初次|刚开始|以前|之前|那年/.test(userMessage)) emotionalWeight = 4

  const event = await addMemoryEvent({
    type: shouldStore.type,
    content: summary,
    keywords,
    emotionalWeight,
  })

  return event
}

function checkIfKeyEvent(message, context) {
  // 心事分享（谈心）
  if (/难过|崩溃|哭|孤独|害怕|焦虑|压力|烦|累|不开心|失落|迷茫|委屈|心疼|担心/.test(message)) {
    return { type: 'heart_talk', reason: 'emotional_content' }
  }
  // 里程碑（先于重要日子检查，"认识X天"归为里程碑纪念）
  if (/第一次|初次|刚开始|认识.*天/.test(message)) {
    return { type: 'milestone', reason: 'milestone' }
  }
  // 重要日子
  if (/生日|考试|面试|纪念日|周年|结婚|订婚|毕业|入职|离职|搬家|出国/.test(message)) {
    return { type: 'important_day', reason: 'important_date' }
  }
  // 过往事情
  if (/以前|之前|上次|那年|那时候|小时候|回忆|记得.*曾经|曾经的/.test(message)) {
    return { type: 'past_event', reason: 'past_memory' }
  }
  // 偏好分享
  if (/我喜欢|我最喜欢|我最爱|我超喜欢|我本命|我的爱好/.test(message)) {
    return { type: 'preference', reason: 'preference_shared' }
  }
  // 深度对话（消息较长）
  if (message.length > 80 && /觉得|认为|感觉|思考|想不通/.test(message)) {
    return { type: 'heart_talk', reason: 'deep_conversation' }
  }
  return null
}

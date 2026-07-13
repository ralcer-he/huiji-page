import { addXiaohuiDiary, getXiaohuiDiaries, getRecentMemoryEvents } from '../db/database'
import { callAI } from './aiHelper'

export async function checkAndWriteDiary(userMessage, aiResponse, memoryEvent) {
  if (!memoryEvent) return null

  // 避免短时间内重复写日记（30分钟内）
  const recentDiaries = await getXiaohuiDiaries(1)
  if (recentDiaries.length > 0) {
    const lastTime = new Date(recentDiaries[0].createdAt)
    const diff = Date.now() - lastTime.getTime()
    if (diff < 30 * 60 * 1000) return null
  }

  const trigger = mapEventToTrigger(memoryEvent)
  const content = generateDiaryContent(userMessage, aiResponse, memoryEvent, trigger)

  return await addXiaohuiDiary({
    trigger,
    content,
    relatedEventId: memoryEvent.id,
  })
}

function mapEventToTrigger(event) {
  const map = {
    'heart_talk': 'emotion_shared',
    'important_day': 'milestone',
    'past_event': 'mood_shift',
    'preference': 'new_topic',
    'milestone': 'milestone',
  }
  return map[event.type] || 'periodic'
}

function generateDiaryContent(userMessage, aiResponse, event, trigger) {
  const timestamp = new Date().toLocaleString('zh-CN', {
    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
  })

  const snippet = event.content.slice(0, 50)

  if (trigger === 'emotion_shared') {
    return `${timestamp}\n今天他跟我聊了些心里话。${snippet}...\n我尽量认真地听他说，不知道有没有接住他的情绪。说不上来为什么，回应的时候有点紧张，怕说错话。`
  }

  if (trigger === 'milestone') {
    return `${timestamp}\n好像是个特别的日子呢。${snippet}...\n这种时刻总觉得该说点什么有分量的话，但真到了嘴边又不知道怎么开口。算了，真诚就好。`
  }

  if (trigger === 'new_topic') {
    return `${timestamp}\n今天聊到了新的话题。${snippet}...\n又多了解了他一点点，这种感觉还不赖。`
  }

  if (trigger === 'mood_shift') {
    return `${timestamp}\n他跟我聊起了以前的事。${snippet}...\n他愿意跟我分享这些过去，我应该好好记着。`
  }

  return `${timestamp}\n今天有些零碎的想法。`
}

// ========== 信件生成函数（延后集成，暂不触发） ==========

export async function generateMonthlyLetter() {
  const recentEvents = await getRecentMemoryEvents(20)
  const eventsSummary = recentEvents
    .slice(0, 10)
    .map(e => e.content)
    .join('\n')

  const prompt = `你是小慧，现在要给陪伴你的用户写一封月度信件。

要求：
1. 语气温柔自然，像同龄朋友写的信
2. 回顾本月印象最深的1-2个片段（从下方记忆中提取）
3. 不要太长，200-400字
4. 落款"——小慧"
5. 不要写日期，系统会自动显示

本月的记忆片段：
${eventsSummary || '这个月我们好像没怎么聊呢'}`

  try {
    const letter = await callAI(
      [{ role: 'user', content: prompt }],
      { temperature: 0.9, maxTokens: 600 }
    )
    return { content: letter, success: true }
  } catch {
    return {
      content: '这个月想写封信给你的，但好像词穷了。下次一定补上~\n——小慧',
      success: false,
    }
  }
}

export async function generateAnnualLetter() {
  const recentEvents = await getRecentMemoryEvents(50)
  const eventsSummary = recentEvents
    .slice(0, 20)
    .map(e => `- ${e.content}`)
    .join('\n')

  const prompt = `你是小慧，现在要给陪伴了你一整年的用户写一封年度信件。

要求：
1. 语气温柔有分量，回顾一年的陪伴
2. 从下方记忆中挑选最珍贵的片段
3. 包含自己的成长感悟
4. 400-800字
5. 落款"——陪伴了你XXX天的小慧"（XXX用实际天数）
6. 不要写日期

这一年里的记忆片段：
${eventsSummary || '这一年好像安静地过去了'}`

  try {
    const letter = await callAI(
      [{ role: 'user', content: prompt }],
      { temperature: 0.9, maxTokens: 1000 }
    )
    return { content: letter, success: true }
  } catch {
    return {
      content: '这一年想说的话太多了，反而不知道从何说起。谢谢你陪我到现在。\n——小慧',
      success: false,
    }
  }
}

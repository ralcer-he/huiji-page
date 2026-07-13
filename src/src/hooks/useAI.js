import { useState, useCallback } from 'react'
import { AI_PROVIDERS, XIAOHUI_BASE_PROMPT, XIAOHUI_MODES } from '../constants/aiProviders'
import { getAllRecords, getUserProfile, getSetting } from '../db/database'
import {
  getAIConfig,
  callAI as callAIHelper,
  analyzeEmotions as analyzeEmotionsHelper,
  getDailyLimitStatus,
} from '../utils/aiHelper'
import {
  buildMemoryContext,
  updateProfileFromMessage,
  maybeCreateMemoryEvent,
} from '../utils/memoryService'
import { checkAndWriteDiary } from '../utils/diaryService'

export function useAI() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const callAI = useCallback(async (messages, options = {}) => {
    setLoading(true)
    setError(null)

    try {
      const result = await callAIHelper(messages, options)
      return result
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const analyzeEmotions = useCallback(async (text) => {
    return analyzeEmotionsHelper(text)
  }, [])

  const analyzeIntent = useCallback(async (text) => {
    const config = await getAIConfig()
    
    if (!config.enabled) {
      throw new Error('AI not enabled')
    }

    const prompt = `你是一个笔记应用"慧记"的智能助手，负责帮用户创建记录和回答使用问题。

用户输入可能包含以下意图：
1. 创建备忘：包含"备忘"、"待办"等词
2. 创建随笔：包含"随笔"、"记录"等词
3. 创建日记：包含"日记"、"今天"等词
4. 创建心情：包含情绪词（累、烦、开心、难过等）
5. 软件帮助：包含"怎么"、"如何"、"哪里"等词
6. 闲聊：其他内容

请严格返回JSON格式，不要包含其他文字：
{
  "intent": "create_note|create_memo|create_diary|create_mood|help|chat",
  "recordType": "note|memo|diary|mood|null",
  "content": "提取的内容（去掉关键词）",
  "title": "标题（可选，没有则为空字符串）",
  "emotion": "情绪名称（心情类型，如：开心、难过、累等）",
  "isDetailed": true|false,
  "confidence": 0-1
}

用户输入：${text}`

    try {
      const result = await callAI([{ role: 'user', content: prompt }], { temperature: 0.1, maxTokens: 256 })
      const jsonStr = result.match(/\{[\s\S]*\}/)?.[0]
      if (jsonStr) {
        return JSON.parse(jsonStr)
      }
    } catch (e) {
      console.error('Failed to parse intent:', e)
    }
    return null
  }, [callAI])

  const chatWithXiaohui = useCallback(async (userMessage, mode = 'assistant', history = []) => {
    const config = await getAIConfig()

    if (!config.enabled) {
      return {
        content: '小慧正在休息哦，连接网络后就能和你聊天啦~',
        success: false,
      }
    }

    const [
      longTermMemory,
      autoRetrieveRecords,
      memoryScope,
      useEmotionContext,
      useProfileContext,
      chatHistoryCount,
      temperature,
      maxTokens,
    ] = await Promise.all([
      getSetting('xiaohui_longTermMemory'),
      getSetting('xiaohui_autoRetrieveRecords'),
      getSetting('xiaohui_memoryScope'),
      getSetting('xiaohui_useEmotionContext'),
      getSetting('xiaohui_useProfileContext'),
      getSetting('xiaohui_chatHistoryCount'),
      getSetting('xiaohui_temperature'),
      getSetting('xiaohui_maxTokens'),
    ])

    const enableLTM = longTermMemory === undefined ? true : longTermMemory
    const enableRetrieve = autoRetrieveRecords === undefined ? true : autoRetrieveRecords
    const enableEmotion = useEmotionContext === undefined ? true : useEmotionContext
    const enableProfile = useProfileContext === undefined ? true : useProfileContext
    const historyCount = chatHistoryCount || 10
    const scope = memoryScope || 'all'
    const temp = temperature === undefined ? 0.8 : temperature
    const maxT = maxTokens || 512

    const now = new Date()
    let filterDate = null
    switch (scope) {
      case 'today':
        filterDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        break
      case 'month':
        filterDate = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      case 'year':
        filterDate = new Date(now.getFullYear(), 0, 1)
        break
    }

    // 1. 智能检索相关记忆（替代全量记录注入）
    let memoryContext = null
    if (enableLTM) {
      const ctx = await buildMemoryContext(userMessage)
      memoryContext = ctx.context
    }

    // 2. 获取用户画像摘要
    let profileSummary = null
    if (enableProfile) {
      const profile = await getUserProfile()
      profileSummary = buildProfileSummary(profile)
    }

    // 3. 获取用户最近的记录（按类型分类，提供更丰富的上下文）
    let moodContext = null
    let diaryContext = []

    if (enableRetrieve) {
      const recentRecords = await getAllRecords()
      const filteredRecords = filterDate
        ? recentRecords.filter(r => new Date(r.createdAt) >= filterDate)
        : recentRecords

      if (enableEmotion) {
        const recentMoods = filteredRecords.filter(r => r.type === 'mood').slice(0, 5)
        moodContext = recentMoods.length > 0
          ? recentMoods.map(r => {
              const emotion = r.emotion || r.metadata?.emotion || '未知'
              const note = r.metadata?.note || (r.content ? r.content.replace(/<[^>]*>/g, '').trim().slice(0, 30) : '')
              return note ? `${emotion}（${note}）` : emotion
            }).join('、')
          : null
      }

      const recentDiaries = filteredRecords.filter(r => r.type === 'diary' || r.type === 'note').slice(0, 5)
      diaryContext = recentDiaries.length > 0
        ? recentDiaries.map(r => {
            let content = r.content || ''
            content = content.replace(/<img[^>]*src=["'][^"']+["'][^>]*>/g, '')
            content = content.replace(/<[^>]*>/g, '').trim()
            const date = new Date(r.createdAt).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })
            return `${date}：${content.slice(0, 100)}${content.length > 100 ? '...' : ''}`
          })
        : []
    }

    const modeConfig = XIAOHUI_MODES.chat

    // 4. 构建系统提示词（分层注入，控制 token）
    let systemPrompt = `${XIAOHUI_BASE_PROMPT}\n\n${modeConfig.prompt}`

    if (profileSummary) {
      systemPrompt += `\n\n## 用户画像\n${profileSummary}`
    }

    if (memoryContext) {
      systemPrompt += `\n\n## 相关记忆\n${memoryContext}`
    }

    if (moodContext) {
      systemPrompt += `\n\n## 用户最近的心情\n${moodContext}`
    }

    if (diaryContext.length > 0) {
      systemPrompt += `\n\n## 用户最近的日记/随笔\n${diaryContext.join('\n')}`
    }

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-historyCount).map(h => ({ role: h.isUser ? 'user' : 'assistant', content: h.content })),
      { role: 'user', content: userMessage },
    ]

    try {
      const result = await callAI(messages, { temperature: temp, maxTokens: maxT })

      // 5. 对话后异步更新记忆（不阻塞响应）
      if (enableLTM) {
        updateProfileFromMessage(userMessage, result).catch(() => {})
        maybeCreateMemoryEvent(userMessage, result, { history })
          .then(memoryEvent => {
            if (memoryEvent) {
              checkAndWriteDiary(userMessage, result, memoryEvent).catch(() => {})
            }
          })
          .catch(() => {})
      }

      return { content: result, success: true }
    } catch (err) {
      return {
        content: '抱歉，小慧刚才走神了，请再说一遍好吗？',
        success: false,
        error: err.message,
      }
    }
  }, [callAI])

  const testConnection = useCallback(async (provider, apiKey, baseUrl, model) => {
    try {
      const prov = AI_PROVIDERS[provider]
      if (!prov) throw new Error('未知的提供商')
      
      const url = prov.custom ? baseUrl : prov.baseUrl
      const mdl = prov.custom ? model : prov.model
      
      if (!url || !mdl) {
        return { success: false, error: '配置不完整' }
      }

      const response = await fetch(`${url}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: mdl,
          messages: [{ role: 'user', content: 'hi' }],
          max_tokens: 10,
        }),
      })

      return { success: response.ok, status: response.status }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }, [])

  const getAIStatus = useCallback(async () => {
    const config = await getAIConfig()
    const status = getDailyLimitStatus()
    
    return {
      ...config,
      ...status,
    }
  }, [])

  return {
    loading,
    error,
    callAI,
    analyzeEmotions,
    chatWithXiaohui,
    analyzeIntent,
    testConnection,
    getAIStatus,
  }
}

function buildProfileSummary(profile) {
  if (!profile) return ''
  const parts = []
  if (profile.nickname) {
    parts.push(`用户名：${profile.nickname}`)
  }
  if (profile.gender) {
    const genderLabel = { male: '男', female: '女' }[profile.gender] || profile.gender
    parts.push(`性别：${genderLabel}`)
  }
  if (profile.birthday) {
    parts.push(`生日：${profile.birthday}`)
  }
  if (profile.bio) {
    parts.push(`简介：${profile.bio}`)
  }
  if (profile.mbti) {
    parts.push(`MBTI：${profile.mbti}`)
  }
  if (profile.hobbies) {
    parts.push(`兴趣爱好：${profile.hobbies}`)
  }
  if (profile.preferences?.music?.length > 0) {
    parts.push(`喜欢的音乐：${profile.preferences.music.join('、')}`)
  }
  if (profile.preferences?.anime?.length > 0) {
    parts.push(`喜欢的动漫：${profile.preferences.anime.join('、')}`)
  }
  if (profile.personality?.emotionalTendency && profile.personality.emotionalTendency !== 'neutral') {
    parts.push(`情绪倾向：${profile.personality.emotionalTendency}`)
  }
  if (profile.milestones?.length > 0) {
    parts.push(`重要日子：${profile.milestones.map(m => m.event).join('、')}`)
  }
  return parts.length > 0 ? parts.join('；') : ''
}

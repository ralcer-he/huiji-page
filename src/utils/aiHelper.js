import { AI_PROVIDERS, DEFAULT_PROVIDER, EMOTION_ANALYSIS_PROMPT } from '../constants/aiProviders'
import { matchEmotionsByKeywords } from './emotionKeywords'
import { getSetting, saveRecord as dbSaveRecord } from '../db/database'

const DAILY_LIMIT_KEY = 'ai_daily_call_count'
const DAILY_LIMIT_DATE_KEY = 'ai_daily_call_date'
const DAILY_LIMIT = 50

const BUILTIN_KEY_PARTS = [
  '2447d7663b4a4f768fe0034221c4409b',
  'CkGGbRNC2gQ3JJMH'
]

function getTodayStr() {
  return new Date().toISOString().split('T')[0]
}

export function checkDailyLimit() {
  const today = getTodayStr()
  const savedDate = localStorage.getItem(DAILY_LIMIT_DATE_KEY)
  if (savedDate !== today) {
    localStorage.setItem(DAILY_LIMIT_DATE_KEY, today)
    localStorage.setItem(DAILY_LIMIT_KEY, '0')
    return { remaining: DAILY_LIMIT, count: 0 }
  }
  const count = parseInt(localStorage.getItem(DAILY_LIMIT_KEY) || '0', 10)
  return { remaining: DAILY_LIMIT - count, count }
}

export function incrementDailyCount() {
  const { count } = checkDailyLimit()
  localStorage.setItem(DAILY_LIMIT_KEY, String(count + 1))
}

export function decrementDailyCount() {
  const { count } = checkDailyLimit()
  if (count > 0) {
    localStorage.setItem(DAILY_LIMIT_KEY, String(count - 1))
  }
}

export function getDailyLimitStatus() {
  const { remaining, count } = checkDailyLimit()
  return { dailyUsed: count, dailyRemaining: remaining, dailyLimit: DAILY_LIMIT }
}

function getBuiltinApiKey() {
  if (import.meta.env.VITE_AI_API_KEY) {
    return import.meta.env.VITE_AI_API_KEY
  }
  return BUILTIN_KEY_PARTS.join('.')
}

function getBuiltinBaseUrl() {
  return import.meta.env.VITE_AI_BASE_URL || AI_PROVIDERS[DEFAULT_PROVIDER].baseUrl
}

function getBuiltinModel() {
  return import.meta.env.VITE_AI_MODEL || AI_PROVIDERS[DEFAULT_PROVIDER].model
}

export async function getAIConfig() {
  const customProvider = await getSetting('aiProvider')
  const aiEnabled = await getSetting('aiEnabled')
  const useBuiltinFree = await getSetting('useBuiltinFree')
  
  if (aiEnabled === false) {
    return { level: 4, enabled: false }
  }

  // 优先读取当前选择提供商的独立 key
  let customApiKey = await getSetting(`aiApiKey_${customProvider}`)
  
  // 如果没有，尝试读取通用的 aiApiKey
  if (!customApiKey) {
    customApiKey = await getSetting('aiApiKey')
  }
  
  const customBaseUrl = await getSetting('aiBaseUrl')
  const customModel = await getSetting('aiModel')
  
  // 如果用户选择使用内置免费额度（默认开启），或者没有配置自定义Key，就用内置免费额度
  if (useBuiltinFree !== false || !customApiKey) {
    const builtinKey = getBuiltinApiKey()
    if (builtinKey) {
      const { remaining } = checkDailyLimit()
      if (remaining > 0) {
        return {
          level: 2,
          enabled: true,
          provider: DEFAULT_PROVIDER,
          apiKey: builtinKey,
          baseUrl: getBuiltinBaseUrl(),
          model: getBuiltinModel(),
          remaining,
          useBuiltinFree: true,
        }
      }
    }
  }

  if (customApiKey && customProvider) {
    const provider = AI_PROVIDERS[customProvider]
    const isCustom = provider?.custom
    return {
      level: 1,
      enabled: true,
      provider: customProvider,
      apiKey: customApiKey,
      baseUrl: isCustom ? (customBaseUrl || '') : provider.baseUrl,
      model: isCustom ? (customModel || '') : provider.model,
      hasCustomConfig: isCustom && customBaseUrl,
      useBuiltinFree: false,
    }
  }

  const builtinKey = getBuiltinApiKey()
  if (builtinKey) {
    const { remaining } = checkDailyLimit()
    if (remaining > 0) {
      return {
        level: 2,
        enabled: true,
        provider: DEFAULT_PROVIDER,
        apiKey: builtinKey,
        baseUrl: getBuiltinBaseUrl(),
        model: getBuiltinModel(),
        remaining,
        useBuiltinFree: true,
      }
    }
  }

  return { level: 3, enabled: false, reason: 'no_key' }
}

export async function testAIConnection(provider, apiKey, baseUrl, model) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 15000)
  
  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: 'user', content: 'hi' }],
        temperature: 0.1,
        max_tokens: 10,
      }),
      signal: controller.signal,
    })
    
    clearTimeout(timeoutId)
    
    if (!response.ok) {
      let errorMsg = `连接失败 (${response.status})`
      try {
        const errData = await response.json()
        if (errData.error?.message) {
          errorMsg = errData.error.message
        }
      } catch {}
      return { success: false, error: errorMsg }
    }
    
    const data = await response.json()
    const content = data.choices?.[0]?.message?.content
    
    if (!content) {
      return { success: false, error: 'API 返回内容为空' }
    }
    
    return { success: true }
  } catch (err) {
    clearTimeout(timeoutId)
    if (err.name === 'AbortError') {
      return { success: false, error: '连接超时，请检查网络或 API 地址' }
    }
    return { success: false, error: `网络错误: ${err.message}` }
  }
}

export async function callAI(messages, options = {}) {
  const config = await getAIConfig()
  
  if (!config.enabled) {
    throw new Error('AI 功能不可用')
  }

  const isLevel2 = config.level === 2
  const maxRetries = options.retry !== false ? (isLevel2 ? 2 : 1) : 0
  
  let lastError = null
  let countIncremented = false
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (isLevel2 && !countIncremented) {
      incrementDailyCount()
      countIncremented = true
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000)
    
    try {
      const response = await fetch(`${config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: options.model || config.model,
          messages,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokens ?? 1024,
        }),
        signal: options.signal || controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        let errorMsg = `API 请求失败 (${response.status})`
        try {
          const errData = await response.json()
          if (errData.error?.message) {
            errorMsg = errData.error.message
          }
        } catch {}
        
        if (response.status === 401 || response.status === 403) {
          if (isLevel2 && countIncremented) {
            decrementDailyCount()
            countIncremented = false
          }
          throw new Error('API Key 无效，请检查您的密钥')
        }
        
        if (response.status === 429) {
          if (isLevel2 && countIncremented) {
            decrementDailyCount()
            countIncremented = false
          }
          throw new Error('请求过于频繁，请稍后再试')
        }
        
        if (response.status >= 500 && attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)))
          lastError = new Error(errorMsg)
          continue
        }
        
        if (isLevel2 && countIncremented) {
          decrementDailyCount()
          countIncremented = false
        }
        throw new Error(errorMsg)
      }

      const data = await response.json()
      const content = data.choices?.[0]?.message?.content
      
      if (!content) {
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 500))
          lastError = new Error('API 返回内容为空')
          continue
        }
        if (isLevel2 && countIncremented) {
          decrementDailyCount()
          countIncremented = false
        }
        throw new Error('API 返回内容为空')
      }
      
      return content
    } catch (err) {
      clearTimeout(timeoutId)
      
      if (err.name === 'AbortError') {
        if (isLevel2 && countIncremented) {
          decrementDailyCount()
          countIncremented = false
        }
        throw new Error('请求超时，请检查网络连接')
      }
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)))
        lastError = err
        continue
      }
      
      if (isLevel2 && countIncremented) {
        decrementDailyCount()
        countIncremented = false
      }
      throw new Error(`网络错误: ${err.message}`)
    }
  }
  
  if (isLevel2 && countIncremented) {
    decrementDailyCount()
  }
  throw lastError || new Error('请求失败')
}

export async function analyzeEmotions(text) {
  try {
    const config = await getAIConfig()
    
    if (!config.enabled || !text || text.trim().length < 5) {
      const emotions = matchEmotionsByKeywords(text)
      return {
        emotions: emotions.length > 0 
          ? emotions.map(name => ({ name, percentage: Math.floor(100 / emotions.length) }))
          : [],
        summary: '',
        source: 'local',
      }
    }

    const result = await callAI([
      { role: 'system', content: EMOTION_ANALYSIS_PROMPT },
      { role: 'user', content: text },
    ], { temperature: 0.3, maxTokens: 512 })

    try {
      const parsed = JSON.parse(result)
      return { ...parsed, source: 'ai' }
    } catch {
      const emotions = matchEmotionsByKeywords(text)
      return {
        emotions: emotions.length > 0
          ? emotions.map(name => ({ name, percentage: Math.floor(100 / emotions.length) }))
          : [],
        summary: '',
        source: 'local',
      }
    }
  } catch {
    const emotions = matchEmotionsByKeywords(text)
    return {
      emotions: emotions.length > 0
        ? emotions.map(name => ({ name, percentage: Math.floor(100 / emotions.length) }))
        : [],
      summary: '',
      source: 'local',
    }
  }
}

export async function analyzeAndSaveEmotions(record) {
  if (!record.content) return record
  
  let text = record.content
  text = text.replace(/<img[^>]*src=["'][^"']+["'][^>]*>/g, '')
  text = text.replace(/<[^>]*>/g, '')
  
  if (!text.trim()) return record
  
  const result = await analyzeEmotions(text)
  
  if (result.emotions && result.emotions.length > 0) {
    const updatedRecord = {
      ...record,
      emotions: result.emotions.map(e => e.name),
      emotionAnalysis: result,
    }
    await dbSaveRecord(updatedRecord)
    return updatedRecord
  }
  
  return record
}

export function triggerEmotionAnalysis(record) {
  if (record.type === 'mood') return
  if (!record.content) return
  
  setTimeout(() => {
    analyzeAndSaveEmotions(record).catch(() => {})
  }, 500)
}

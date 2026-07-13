import { EMOTIONS } from '../constants/emotions'
import { stripHtml } from './recordHelpers'

const STOP_WORDS = new Set([
  '今天', '昨天', '感觉', '觉得', '真的', '非常',
  '我', '你', '他', '她', '它', '这', '那', '就', '都', '也', '还', '又', '再',
  '的', '了', '是', '有', '在', '和', '与', '及', '或',
  '工作', '上班', '下班', '学习', '吃饭', '睡觉', '早上', '晚上', '下午', '上午',
  '一个', '一下', '一直', '一样', '一点', '什么', '怎么', '为什么',
  '可以', '不能', '应该', '需要', '想要', '希望', '喜欢', '不喜欢',
  '好', '不好', '很', '太', '特别', '非常', '特别', '真的',
  '天', '日', '周', '月', '年', '时间', '时候', '现在', '过去', '未来',
  // English stop words
  'the', 'and', 'are', 'was', 'were', 'been', 'being',
  'have', 'has', 'had', 'having', 'does', 'did', 'doing',
  'will', 'would', 'could', 'should', 'may', 'might', 'shall', 'can',
  'this', 'that', 'these', 'those', 'its', 'his', 'her', 'our', 'your', 'their',
  'with', 'from', 'into', 'about', 'between', 'through', 'during',
  'before', 'after', 'above', 'below', 'under', 'over',
  'not', 'but', 'nor', 'than', 'then', 'just', 'also', 'only',
  'for', 'each', 'some', 'any', 'all', 'both', 'few', 'more', 'most',
  'very', 'much', 'many', 'such', 'what', 'which', 'who', 'whom',
  'when', 'where', 'how', 'why', 'there', 'here', 'still',
  'you', 'they', 'them', 'she', 'him', 'out', 'down',
  'like', 'know', 'want', 'need', 'think', 'make', 'get',
  'went', 'come', 'came', 'good', 'great', 'really', 'thing',
  'today', 'tomorrow', 'yesterday', 'morning', 'evening', 'night',
])

export function generateInsight(moodRecords, emotionStats) {
  if (!moodRecords || moodRecords.length === 0) {
    return {
      dominantEmoji: '',
      dominantIconName: '',
      dominantName: '暂无数据',
      dominantPercentage: 0,
      dominantColor: '#94A3B8',
      summary: '记录心情后可查看分析',
      stability: 0,
      emotionTypes: [],
      suggestions: [],
    }
  }

  const topEmotion = (emotionStats?.emotions?.[0]) || EMOTIONS[0]
  const recordCount = moodRecords.length

  const stability = Number(Math.min(40 + topEmotion.percentage * 0.6, 95).toFixed(1))
  const emotionTypes = (emotionStats?.emotions || []).slice(0, 5)

  const summary = ''

  const suggestions = []

  if (topEmotion.name === '疲惫' || topEmotion.name === '焦虑') {
    suggestions.push(
      { title: '规律作息', desc: '保证充足睡眠' },
      { title: '适度运动', desc: '散步或拉伸' },
      { title: '减少屏幕时间', desc: '睡前远离手机' },
    )
  } else if (topEmotion.name === '开心' || topEmotion.name === '兴奋') {
    suggestions.push(
      { title: '记录美好时刻', desc: '留存开心回忆' },
      { title: '分享快乐', desc: '与亲友交流' },
      { title: '保持节奏', desc: '继续做喜欢的事' },
    )
  } else if (topEmotion.name === '难过' || topEmotion.name === '愤怒') {
    suggestions.push(
      { title: '接纳情绪', desc: '允许自己感受' },
      { title: '找人倾诉', desc: '和信任的人聊聊' },
      { title: '转移注意', desc: '做些轻松的事' },
    )
  } else {
    suggestions.push(
      { title: '保持平和', desc: '维持当前状态' },
      { title: '尝试新事物', desc: '丰富生活体验' },
      { title: '自我关怀', desc: '做喜欢的事' },
    )
  }

  return {
    dominantEmoji: topEmotion.emoji,
    dominantIconName: topEmotion.iconName,
    dominantName: topEmotion.name,
    dominantPercentage: topEmotion.percentage,
    dominantColor: topEmotion.color,
    summary,
    stability,
    emotionTypes,
    suggestions,
  }
}

export function extractKeywords(records, period = 7, thresholds = null) {
  const allContent = records
    .filter(r => r.content)
    .map(r => {
      let text = stripHtml(r.content)
      text = text.replace(/[a-zA-Z0-9+/=]{50,}/g, '')
      return text
    })
    .join(' ')

  if (!allContent) return []

  const wordFreq = {}

  const segments = allContent.split(/[\s\n\r，。！？、；：""''（）《》【】\[\].,!?;:\(\)\/\\—\-_]+/)

  segments.forEach(seg => {
    if (!seg || seg.length < 2) return
    if (STOP_WORDS.has(seg) || STOP_WORDS.has(seg.toLowerCase())) return
    if (/^\d+$/.test(seg)) return

    wordFreq[seg] = (wordFreq[seg] || 0) + 1
  })

  let minCount = 1
  const periodKey = period === 3 ? '3days' : period === 7 ? '7days' : period === 30 ? '30days' : period
  if (thresholds && thresholds[periodKey] !== undefined) {
    minCount = thresholds[periodKey]
  } else if (period === 3 || period === '3days') {
    minCount = 3
  } else if (period === 7 || period === '7days') {
    minCount = 5
  } else if (period === 30 || period === '30days') {
    minCount = 20
  }

  return Object.entries(wordFreq)
    .filter(([, count]) => count >= minCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([word, count]) => ({
      word,
      weight: Math.min(count / 3, 1),
    }))
}

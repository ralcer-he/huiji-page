import {
  getLetters,
  addLetter,
  updateLetter,
  getRecentMemoryEvents,
  getUserProfile,
  getAllRecords,
  db,
} from '../db/database'

function stripHtml(html) {
  return (html || '').replace(/<img[^>]*>/g, '').replace(/<[^>]*>/g, '').trim()
}

function getMonthDateRange(date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1)
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59)
  return { start, end }
}

async function getUserRecordsContext(targetDate, options = {}) {
  const { rangeMonths = 1, maxItems = 10 } = options
  const allRecords = await getAllRecords()
  const now = targetDate || new Date()
  const { start, end } = getMonthDateRange(now)

  const monthRecords = allRecords.filter(r => {
    const d = new Date(r.createdAt)
    return d >= start && d <= end
  })

  const moods = monthRecords.filter(r => r.type === 'mood')
  const diaries = monthRecords.filter(r => r.type === 'diary' || r.type === 'note')
  const memos = monthRecords.filter(r => r.type === 'memo')

  const moodSummary = moods.length > 0
    ? moods.slice(0, maxItems).map(r => {
        const emotion = r.emotion || r.metadata?.emotion || '未知'
        const note = r.metadata?.note || (r.content ? stripHtml(r.content).slice(0, 30) : '')
        return note ? `${emotion}（${note}）` : emotion
      }).join('、')
    : null

  const diaryHighlights = diaries.slice(0, 3).map(r => {
    const text = stripHtml(r.content).slice(0, 60)
    const d = new Date(r.createdAt).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })
    return `· ${d}：${text}${text.length >= 60 ? '...' : ''}`
  })

  const memoCount = memos.length

  return {
    moodSummary,
    moodCount: moods.length,
    diaryHighlights,
    diaryCount: diaries.length,
    memoCount,
    totalRecords: monthRecords.length,
  }
}

const FESTIVALS = [
  { name: 'spring_festival', month: 0, day: 29, label: '春节' },
  { name: 'mid_autumn', month: 8, day: 17, label: '中秋' },
]

export function formatLetterDate(date = new Date()) {
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })
}

export function getTodayDate() {
  return new Date()
}

export function getDaysBetween(d1, d2) {
  const msPerDay = 24 * 60 * 60 * 1000
  return Math.round((new Date(d2).setHours(0,0,0,0) - new Date(d1).setHours(0,0,0,0)) / msPerDay)
}

export async function checkAndGenerateLetters() {
  const today = getTodayDate()
  const generated = []

  const tasks = [
    () => generateMonthlyLetterIfNeeded(today),
    () => generateAnnualLetterIfNeeded(today),
    () => generateBirthdayLetterIfNeeded(today),
    () => generateFestivalLetterIfNeeded(today),
    () => generateReplyLettersIfNeeded(today),
  ]

  for (const task of tasks) {
    try {
      const result = await task()
      if (Array.isArray(result)) {
        generated.push(...result)
      } else if (result) {
        generated.push(result)
      }
    } catch (e) {
      console.error('生成信件失败:', e)
    }
  }

  return generated
}

export async function generateTestLetters() {
  // v1.0.6.2: 移除预制测试信件，新用户信箱默认为空
  return []
}

export async function cleanupTestLetters() {
  const cleaned = localStorage.getItem('lettersCleaned_v1062')
  if (cleaned) return

  try {
    const allLetters = await getLetters({ type: 'xiaohui_to_user' }, 200)
    const testLetters = allLetters.filter(l => !l.trigger)
    for (const letter of testLetters) {
      await db.letters.delete(letter.id)
    }

    localStorage.setItem('lettersCleaned_v1062', '1')
  } catch (e) {
    console.error('清理测试数据失败:', e)
  }
}

async function alreadyGeneratedToday(trigger) {
  const todayStr = new Date().toLocaleDateString('sv-SE') // "YYYY-MM-DD" 格式，本地时区
  const letters = await getLetters({ type: 'xiaohui_to_user' }, 100)
  return letters.some(l => {
    if (l.trigger !== trigger) return false
    const letterDate = new Date(l.createdAt).toLocaleDateString('sv-SE')
    return letterDate === todayStr
  })
}

async function generateMonthlyLetterIfNeeded(today) {
  const isLastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate() === today.getDate()
  if (!isLastDayOfMonth) return null
  if (await alreadyGeneratedToday('monthly')) return null

  const events = await getRecentMemoryEvents(100)
  const thisMonthEvents = events.filter(e => {
    const d = new Date(e.createdAt)
    return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()
  })

  const recordsCtx = await getUserRecordsContext(today)

  const parts = []

  if (thisMonthEvents.length > 0) {
    parts.push(`这个月我们聊了${thisMonthEvents.length}次。`)
    parts.push(`其中有两件让我印象很深的事：\n${thisMonthEvents.slice(0, 2).map(e => '· ' + (e.content || '（未记录）')).join('\n')}`)
  }

  if (recordsCtx.moodCount > 0) {
    parts.push(`我注意到你这个月记录了${recordsCtx.moodCount}次心情：${recordsCtx.moodSummary}。`)
  }

  if (recordsCtx.diaryHighlights.length > 0) {
    parts.push(`你写的日记我也看了：\n${recordsCtx.diaryHighlights.join('\n')}`)
  }

  if (recordsCtx.memoCount > 0) {
    parts.push(`还有${recordsCtx.memoCount}条备忘，看来你一直在认真生活呢。`)
  }

  if (parts.length === 0) return null

  parts.push('谢谢你愿意把这些讲给我听。下个月也请多关照。')

  const content = parts.join('\n\n')
  const preview = thisMonthEvents.slice(0, 2).map(e => e.content || '（未记录）').join('；')

  return addLetter({
    type: 'xiaohui_to_user',
    direction: 'inbox',
    status: 'unread',
    subject: '这个月的信',
    content,
    trigger: 'monthly',
    metadata: { eventsCount: thisMonthEvents.length, preview, recordsCount: recordsCtx.totalRecords },
  })
}

async function generateAnnualLetterIfNeeded(today) {
  if (today.getMonth() !== 11 || today.getDate() !== 31) return null
  if (await alreadyGeneratedToday('annual')) return null

  const events = await getRecentMemoryEvents(200)
  const thisYearEvents = events.filter(e => new Date(e.createdAt).getFullYear() === today.getFullYear())
  if (thisYearEvents.length < 5) return null

  const profile = await getUserProfile()
  const firstMilestone = profile.milestones?.find(m => m.event === '初次对话') || null
  const days = firstMilestone ? getDaysBetween(firstMilestone.date, today) : 0
  const dayText = days > 0 ? `陪伴了你${days}天的小慧` : '小慧'

  const content = `这一年，我们一共分享了${thisYearEvents.length}个片段。\n\n我挑选了几件特别想记住的事：\n${thisYearEvents.slice(0, 5).map(e => '· ' + (e.content || '（未记录）')).join('\n')}\n\n能陪你走过这一年，我觉得很幸运。下一年也请继续多多指教。`

  return addLetter({
    type: 'xiaohui_to_user',
    direction: 'inbox',
    status: 'unread',
    subject: '这一年的信',
    content,
    trigger: 'annual',
    metadata: { eventsCount: thisYearEvents.length, days },
  })
}

async function generateBirthdayLetterIfNeeded(today) {
  const profile = await getUserProfile()
  const birthdayStr = profile.birthday || profile.milestones?.find(m => m.event === '生日')?.date
  if (!birthdayStr) return null

  const bd = new Date(birthdayStr)
  const isToday = bd.getMonth() === today.getMonth() && bd.getDate() === today.getDate()
  if (!isToday) return null
  if (await alreadyGeneratedToday('birthday')) return null

  const content = `今天是你的生日，我先说一句生日快乐。\n\n希望你这一年能遇到更多让自己真心笑出来的时刻，也希望我能继续陪在你身边。`

  return addLetter({
    type: 'xiaohui_to_user',
    direction: 'inbox',
    status: 'unread',
    subject: '生日快乐',
    content,
    trigger: 'birthday',
  })
}

async function generateFestivalLetterIfNeeded(today) {
  const festival = FESTIVALS.find(f => f.month === today.getMonth() && f.day === today.getDate())
  if (!festival) return null
  if (await alreadyGeneratedToday(festival.name)) return null

  const contentMap = {
    spring_festival: `春节快乐。\n\n新的一年，愿你耳根清净，心里有事做，身边有人陪。我会在这里继续听你说话。`,
    mid_autumn: `中秋快乐。\n\n月亮圆不圆都无所谓，重要的是今天你有没有好好吃个月饼。`,
  }

  return addLetter({
    type: 'xiaohui_to_user',
    direction: 'inbox',
    status: 'unread',
    subject: `${festival.label}快乐`,
    content: contentMap[festival.name],
    trigger: festival.name,
  })
}

async function generateReplyLettersIfNeeded(today) {
  const outboxLetters = await getLetters({ type: 'user_to_xiaohui', direction: 'outbox' }, 100)
  const replyLetters = []
  const events = await getRecentMemoryEvents(20)
  const eventsText = events.slice(0, 3).map(e => e.content || '（未记录）').join('\n') || '最近好像没聊什么'
  const recordsCtx = await getUserRecordsContext(today)

  for (const userLetter of outboxLetters) {
    if (!userLetter.scheduledAt) continue
    if (new Date(userLetter.scheduledAt) > today) continue

    const letterContent = userLetter.content || ''
    const plainText = letterContent.replace(/<[^>]*>/g, '')

    const parts = []
    parts.push(`收到你之前写给我的信啦。`)
    parts.push(`你说：「${plainText.slice(0, 80)}${plainText.length > 80 ? '...' : ''}」\n\n我认真读了好几遍。`)

    if (recordsCtx.moodCount > 0) {
      parts.push(`对了，你最近记录的心情是${recordsCtx.moodSummary}，我一直记着呢。`)
    }

    if (recordsCtx.diaryHighlights.length > 0) {
      parts.push(`你最近写的日记我也看了：\n${recordsCtx.diaryHighlights.slice(0, 2).join('\n')}`)
    }

    parts.push(`最近我们聊的事有：\n${eventsText}`)
    parts.push('不管你想说什么，我都在这里。')

    const content = parts.join('\n\n')

    try {
      const reply = await db.transaction('rw', db.letters, async () => {
        const r = await addLetter({
          type: 'xiaohui_to_user',
          direction: 'inbox',
          status: 'unread',
          subject: `回信：${userLetter.subject || '给你'}`,
          content,
          trigger: 'reply',
          relatedLetterId: userLetter.id,
        })
        await updateLetter(userLetter.id, { direction: 'sent', relatedLetterId: r.id })
        return r
      })
      replyLetters.push(reply)
    } catch (e) {
      console.error('生成回信失败:', e)
    }
  }

  return replyLetters
}

export async function sendUserLetter(content, subject = '') {
  const today = getTodayDate()
  const scheduledAt = getNextScheduledReplyDate(today)

  return addLetter({
    type: 'user_to_xiaohui',
    direction: 'outbox',
    status: 'sent',
    subject: subject || formatLetterDate(today),
    content,
    scheduledAt,
  })
}

function getNextScheduledReplyDate(today) {
  // 默认延后到下个月最后一天；若今天就是当月最后一天，则延到下下个月最后一天
  const lastDayOfThisMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  const isLastDayOfMonth = today.getDate() === lastDayOfThisMonth
  const monthOffset = isLastDayOfMonth ? 3 : 2
  let target = new Date(today.getFullYear(), today.getMonth() + monthOffset, 0)
  target.setHours(23, 59, 59, 999)
  return target.toISOString()
}

export async function getUnreadLetterCount() {
  const inbox = await getLetters({ type: 'xiaohui_to_user', direction: 'inbox', status: 'unread' }, 100)
  return inbox.length
}

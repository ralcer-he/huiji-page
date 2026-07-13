
export function calculateStreak(records) {
  if (!records || records.length === 0) return 0

  const dates = new Set(
    records.map(r => new Date(r.createdAt).toISOString().split('T')[0])
  )

  let streak = 0
  const today = new Date()

  for (let i = 0; i < 365; i++) {
    const checkDate = new Date(today)
    checkDate.setDate(checkDate.getDate() - i)
    const dateStr = checkDate.toISOString().split('T')[0]

    if (dates.has(dateStr)) {
      streak++
    } else {
      break
    }
  }

  return streak
}

export function getLocalDateStr(dateInput) {
  const d = new Date(dateInput)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function groupRecordsByDate(records) {
  const grouped = {}
  records.forEach(record => {
    const date = getLocalDateStr(record.createdAt)
    if (!grouped[date]) {
      grouped[date] = []
    }
    grouped[date].push(record)
  })
  return grouped
}

export function formatDateLabel(dateStr) {
  const date = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.toDateString() === today.toDateString()) return '今天'
  if (date.toDateString() === yesterday.toDateString()) return '昨天'

  const diff = Math.floor((today - date) / (1000 * 60 * 60 * 24))
  if (diff < 7) {
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    return weekdays[date.getDay()]
  }

  return `${date.getMonth() + 1}月${date.getDate()}日`
}

export function stripHtml(html) {
  if (!html) return ''
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  return tmp.textContent || tmp.innerText || ''
}

export function getIntensityLabel(value) {
  if (value <= 20) return '微弱'
  if (value <= 40) return '一般'
  if (value <= 60) return '中等'
  if (value <= 80) return '较强'
  return '强烈'
}

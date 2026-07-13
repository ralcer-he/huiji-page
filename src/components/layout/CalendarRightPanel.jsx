import { useState, useEffect } from 'react'
import Icon from '../ui/Icon'
import { getRecordsByDateRange } from '../../db/database'

const WEEK_DAYS = ['一', '二', '三', '四', '五', '六', '日']

// 情绪颜色映射（与 constants/emotions.js 中 EMOTIONS 对象的 color 字段对应，
// 此处用于日历面板情绪条形图着色，保留独立定义以便自定义面板配色）
const EMOTION_COLORS = {
  '开心': '#F59E0B',
  '平静': '#10B981',
  '感动': '#EC4899',
  '兴奋': '#F97316',
  '满足': '#5DADE2',
  '感恩': '#8B5CF6',
  '思念': '#6366F1',
  '焦虑': '#EF4444',
  '疲惫': '#94A3B8',
  '低落': '#64748B',
}

function getWeekRange() {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
  monday.setHours(0, 0, 0, 0)

  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)

  return { start: monday, end: sunday }
}

function getMonthRange() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
  return { start, end }
}

function aggregateEmotions(records) {
  const counts = {}
  for (const record of records) {
    const emotions = record.emotions || []
    for (const emotion of emotions) {
      counts[emotion] = (counts[emotion] || 0) + 1
    }
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
}

function formatDate(d) {
  return `${d.getMonth() + 1}/${d.getDate()}`
}

export default function CalendarRightPanel({ onNavigate }) {
  const [weekEmotions, setWeekEmotions] = useState([])
  const [weekRecordCount, setWeekRecordCount] = useState(0)
  const [monthRecordCount, setMonthRecordCount] = useState(0)
  const [monthEmotionDays, setMonthEmotionDays] = useState(0)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const week = getWeekRange()
      const month = getMonthRange()

      const [weekRecords, monthRecords] = await Promise.all([
        getRecordsByDateRange(week.start, week.end),
        getRecordsByDateRange(month.start, month.end),
      ])

      setWeekEmotions(aggregateEmotions(weekRecords))
      setWeekRecordCount(weekRecords.length)
      setMonthRecordCount(monthRecords.length)

      const emotionDays = new Set(
        monthRecords
          .filter(r => r.emotions && r.emotions.length > 0)
          .map(r => {
            const d = new Date(r.createdAt)
            return `${d.getMonth()}-${d.getDate()}`
          })
      )
      setMonthEmotionDays(emotionDays.size)
    } catch (e) {
      console.error('加载日历面板数据失败:', e)
    }
  }

  const handleGoToday = () => {
    const today = new Date()
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    onNavigate(`/calendar?date=${dateStr}`)
  }

  const today = new Date()
  const weekStart = getWeekRange().start

  return (
    <div className="space-y-3">
      {/* 回到今日 */}
      <button
        onClick={handleGoToday}
        className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-[13px] font-medium transition-colors duration-150"
        style={{
          backgroundColor: 'var(--accent)',
          color: '#fff',
        }}
        onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
        onMouseLeave={e => e.currentTarget.style.opacity = '1'}
      >
        <Icon name="calendar" size={15} color="#fff" />
        <span>回到今日</span>
        <span className="text-[11px] opacity-80">{formatDate(today)}</span>
      </button>

      {/* 情绪速览 - 本周 */}
      <div className="rounded-xl p-4 space-y-3"
        style={{ backgroundColor: 'var(--bg-card)', boxShadow: 'var(--shadow-sm)' }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[12px] font-medium"
            style={{ color: 'var(--muted)' }}
          >
            <Icon name="mood" size={14} />
            <span>本周情绪</span>
          </div>
          <span className="text-[11px]" style={{ color: 'var(--muted)' }}>
            {weekRecordCount} 条记录
          </span>
        </div>

        {weekEmotions.length === 0 ? (
          <div className="text-[13px] py-3 text-center" style={{ color: 'var(--muted)' }}>
            本周暂无情绪记录
          </div>
        ) : (
          <div className="space-y-2">
            {weekEmotions.map(([emotion, count]) => {
              const maxCount = weekEmotions[0][1]
              const pct = Math.max(8, (count / maxCount) * 100)
              const barColor = EMOTION_COLORS[emotion] || 'var(--accent)'
              return (
                <div key={emotion} className="space-y-1">
                  <div className="flex items-center justify-between text-[12px]">
                    <span style={{ color: 'var(--ink)' }}>{emotion}</span>
                    <span style={{ color: 'var(--muted)' }}>{count}</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden"
                    style={{ backgroundColor: 'var(--bg)' }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${pct}%`, backgroundColor: barColor }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 本月统计 */}
      <div className="rounded-xl p-4 space-y-3"
        style={{ backgroundColor: 'var(--bg-card)', boxShadow: 'var(--shadow-sm)' }}
      >
        <div className="flex items-center gap-2 text-[12px] font-medium"
          style={{ color: 'var(--muted)' }}
        >
          <Icon name="bar-chart" size={14} />
          <span>本月统计</span>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between py-2 px-3 rounded-lg"
            style={{ backgroundColor: 'var(--bg)' }}
          >
            <span className="text-[13px]" style={{ color: 'var(--ink)' }}>记录总数</span>
            <span className="text-[14px] font-semibold" style={{ color: 'var(--ink-strong)' }}>
              {monthRecordCount}
            </span>
          </div>
          <div className="flex items-center justify-between py-2 px-3 rounded-lg"
            style={{ backgroundColor: 'var(--bg)' }}
          >
            <span className="text-[13px]" style={{ color: 'var(--ink)' }}>情绪记录天数</span>
            <span className="text-[14px] font-semibold" style={{ color: 'var(--ink-strong)' }}>
              {monthEmotionDays}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

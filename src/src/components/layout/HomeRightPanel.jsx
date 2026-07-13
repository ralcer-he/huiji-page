import { useState, useEffect } from 'react'
import Icon from '../ui/Icon'
import { getAllRecords } from '../../db/database'

const TYPE_LABELS = {
  note: { label: '随笔', color: 'var(--type-note)' },
  mood: { label: '心情', color: 'var(--type-mood)' },
  memo: { label: '备忘', color: 'var(--type-memo)' },
  diary: { label: '日记', color: 'var(--type-diary)' },
}

function formatTime(date) {
  const d = new Date(date)
  const now = new Date()
  const diff = now - d
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`

  const month = d.getMonth() + 1
  const day = d.getDate()
  return `${month}/${day}`
}

function calcStreak(records) {
  if (!records.length) return 0

  const dateSet = new Set(
    records.map(r => {
      const d = new Date(r.createdAt)
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
    })
  )

  let streak = 0
  const today = new Date()
  for (let i = 0; i < 365; i++) {
    const check = new Date(today)
    check.setDate(check.getDate() - i)
    const key = `${check.getFullYear()}-${check.getMonth()}-${check.getDate()}`
    if (dateSet.has(key)) {
      streak++
    } else {
      break
    }
  }
  return streak
}

export default function HomeRightPanel({ onNavigate }) {
  const [recentRecords, setRecentRecords] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [streak, setStreak] = useState(0)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const all = await getAllRecords()
      setRecentRecords(all.slice(0, 5))
      setTotalCount(all.length)
      setStreak(calcStreak(all))
    } catch (e) {
      console.error('加载右侧面板数据失败:', e)
    }
  }

  const handleClick = (record) => {
    onNavigate(`/write?id=${record.id}`)
  }

  return (
    <div className="space-y-3">
      {/* 快速统计 */}
      <div className="rounded-xl p-4 space-y-3"
        style={{ backgroundColor: 'var(--bg-card)', boxShadow: 'var(--shadow-sm)' }}
      >
        <div className="flex items-center gap-2 text-[12px] font-medium"
          style={{ color: 'var(--muted)' }}
        >
          <Icon name="chart" size={14} />
          <span>快速统计</span>
        </div>
        <div className="flex gap-4">
          <div className="flex-1 text-center">
            <div className="text-[20px] font-semibold" style={{ color: 'var(--ink-strong)' }}>
              {totalCount}
            </div>
            <div className="text-[11px] mt-0.5" style={{ color: 'var(--muted)' }}>总记录</div>
          </div>
          <div className="flex-1 text-center">
            <div className="text-[20px] font-semibold" style={{ color: 'var(--ink-strong)' }}>
              {streak}
            </div>
            <div className="text-[11px] mt-0.5" style={{ color: 'var(--muted)' }}>连续天数</div>
          </div>
        </div>
      </div>

      {/* 最近记录 */}
      <div className="rounded-xl p-4 space-y-3"
        style={{ backgroundColor: 'var(--bg-card)', boxShadow: 'var(--shadow-sm)' }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[12px] font-medium"
            style={{ color: 'var(--muted)' }}
          >
            <Icon name="clock" size={14} />
            <span>最近记录</span>
          </div>
        </div>

        {recentRecords.length === 0 ? (
          <div className="text-[13px] py-4 text-center" style={{ color: 'var(--muted)' }}>
            暂无记录
          </div>
        ) : (
          <div className="space-y-2">
            {recentRecords.map(record => {
              const typeInfo = TYPE_LABELS[record.type] || TYPE_LABELS.note
              const title = record.title || '无标题'
              return (
                <div
                  key={record.id}
                  className="flex items-center gap-3 py-2 px-2 rounded-lg cursor-pointer transition-colors duration-150"
                  style={{ ':hover': { backgroundColor: 'var(--bg2)' } }}
                  onClick={() => handleClick(record)}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg2)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <span
                    className="text-[11px] font-medium px-2.5 py-0.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: typeInfo.color + '15', color: typeInfo.color }}
                  >
                    {typeInfo.label}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium truncate"
                      style={{ color: 'var(--ink)' }}
                    >
                      {title}
                    </div>
                    <div className="text-[11px] mt-0.5" style={{ color: 'var(--muted)' }}>
                      {formatTime(record.createdAt)}
                    </div>
                  </div>
                  <Icon name="chevron-right" size={14} color="var(--muted)" />
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

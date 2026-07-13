import { useState, useMemo } from 'react'
import { EMOTIONS } from '../constants/emotions'
import Icon from './ui/Icon'

function YearInPixels({ records, onDayClick }) {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [isExpanded, setIsExpanded] = useState(true)
  const [hoveredDay, setHoveredDay] = useState(null)

  // 获取某年的所有日期
  const yearDays = useMemo(() => {
    const days = []
    const startDate = new Date(selectedYear, 0, 1)
    const endDate = new Date(selectedYear, 11, 31)
    
    let current = startDate
    while (current <= endDate) {
      days.push(new Date(current))
      current.setDate(current.getDate() + 1)
    }
    return days
  }, [selectedYear])

  // 按日期分组记录
  const recordsByDate = useMemo(() => {
    const grouped = {}
    records.forEach(record => {
      if (record.emotions && record.emotions.length > 0) {
        const date = new Date(record.createdAt).toISOString().split('T')[0]
        if (!grouped[date]) {
          grouped[date] = { emotions: [], activities: [] }
        }
        grouped[date].emotions.push(...record.emotions)
        if (record.activities) {
          grouped[date].activities.push(...record.activities)
        }
      }
    })
    return grouped
  }, [records])

  // 获取日期的主导情绪
  const getDayEmotion = (date) => {
    const dateStr = date.toISOString().split('T')[0]
    const dayRecords = recordsByDate[dateStr]
    if (!dayRecords || dayRecords.emotions.length === 0) return null
    
    // 统计情绪出现次数
    const emotionCount = {}
    dayRecords.emotions.forEach(emo => {
      emotionCount[emo] = (emotionCount[emo] || 0) + 1
    })
    
    // 找出最多次数的情绪
    let maxCount = 0
    let dominantEmotion = null
    Object.entries(emotionCount).forEach(([emo, count]) => {
      if (count > maxCount) {
        maxCount = count
        dominantEmotion = emo
      }
    })
    
    const emotion = EMOTIONS.find(e => e.name === dominantEmotion)
    return emotion || null
  }

  // 获取月份标签
  const monthLabels = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']

  // 计算每个格子的宽度（7列 = 一周）
  const cellSize = 12
  const cellGap = 2
  const weeks = Math.ceil(yearDays.length / 7)

  // 获取某日期对应的情绪颜色
  const getDayColor = (date) => {
    const emotion = getDayEmotion(date)
    if (!emotion) return 'var(--bg)'
    return emotion.color
  }

  // 获取某日期对应的情绪图标
  const getDayIconName = (date) => {
    const emotion = getDayEmotion(date)
    if (!emotion) return null
    return emotion.iconName
  }

  // 格式化日期显示
  const formatDate = (date) => {
    return `${date.getMonth() + 1}月${date.getDate()}日`
  }

  // 计算年度统计
  const yearStats = useMemo(() => {
    const emotionStats = {}
    let totalDays = 0
    
    yearDays.forEach(day => {
      const emotion = getDayEmotion(day)
      if (emotion) {
        totalDays++
        emotionStats[emotion.name] = (emotionStats[emotion.name] || 0) + 1
      }
    })
    
    return {
      totalDays,
      emotionStats,
      emotionList: Object.entries(emotionStats)
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => {
          const emo = EMOTIONS.find(e => e.name === name)
          return { name, count, iconName: emo?.iconName, color: emo?.color, percentage: Math.round(count / totalDays * 100) }
        })
    }
  }, [yearDays, recordsByDate])

  return (
    <div className="huiji-card p-5">
      {/* 标题和年份选择 */}
      <div 
        className="flex items-center justify-between mb-4 cursor-pointer select-none"
        onClick={() => setIsExpanded(e => !e)}
      >
        <h3 className="text-sm font-medium flex items-center gap-2" style={{ color: 'var(--ink)' }}>
          <Icon name="calendar" size={16} color="var(--muted)" strokeWidth={1.5} />
          年度像素图
        </h3>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setSelectedYear(y => y - 1)}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors duration-200 hover:opacity-70"
              style={{ backgroundColor: 'var(--bg2)', color: 'var(--muted)' }}
            >
              ‹
            </button>
            <span className="text-sm font-medium w-16 text-center" style={{ color: 'var(--ink)' }}>
              {selectedYear}
            </span>
            <button
              onClick={() => setSelectedYear(y => y + 1)}
              disabled={selectedYear >= new Date().getFullYear()}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors duration-200 disabled:opacity-30 hover:opacity-70"
              style={{ backgroundColor: 'var(--bg2)', color: 'var(--muted)' }}
            >
              ›
            </button>
          </div>
          <Icon 
            name={isExpanded ? 'chevron-up' : 'chevron-down'} 
            size={16} 
            color="var(--muted)" 
            strokeWidth={1.5}
            className="transition-transform duration-200"
          />
        </div>
      </div>

      {/* 展开内容 */}
      <div style={{ 
        maxHeight: isExpanded ? '1000px' : '0', 
        overflow: 'hidden',
        transition: 'max-height 0.3s ease-out, opacity 0.2s ease-out',
        opacity: isExpanded ? 1 : 0,
      }}>

      {/* 年度统计数据 */}
      <div className="grid grid-cols-3 gap-2 mb-4 p-3 rounded-xl" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="text-center">
          <div className="text-lg font-bold" style={{ color: 'var(--accent)' }}>{yearStats.totalDays}</div>
          <div className="text-xs" style={{ color: 'var(--muted)' }}>记录天数</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold" style={{ color: 'var(--accent2)' }}>{Object.keys(yearStats.emotionStats).length}</div>
          <div className="text-xs" style={{ color: 'var(--muted)' }}>情绪种类</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold" style={{ color: 'var(--accent2)' }}>{Math.round(yearStats.totalDays / 365 * 100)}%</div>
          <div className="text-xs" style={{ color: 'var(--muted)' }}>年度覆盖率</div>
        </div>
      </div>

      {/* 月份标签 */}
      <div className="flex gap-1 mb-1 pl-8">
        {monthLabels.map((label, i) => (
          <div 
            key={i} 
            className="text-[8px] flex-1 text-center"
            style={{ color: 'var(--muted)' }}
          >
            {label}
          </div>
        ))}
      </div>

      {/* 像素网格 */}
      <div className="flex gap-1 overflow-x-auto pb-2">
        {/* 星期标签 */}
        <div className="flex flex-col gap-0.5 pr-1">
          {['', '一', '', '三', '', '五', ''].map((day, i) => (
            <div 
              key={i} 
              className="text-[8px] leading-3 flex items-center"
              style={{ height: cellSize, color: 'var(--muted)' }}
            >
              {day}
            </div>
          ))}
        </div>
        
        {/* 像素格子 */}
        <div className="flex gap-0.5">
          {yearDays.reduce((weeks, day, i) => {
            const dayOfWeek = day.getDay()
            // 新的一周
            if (dayOfWeek === 0 || weeks.length === 0) {
              weeks.push([])
            }
            
            const isToday = new Date().toISOString().split('T')[0] === day.toISOString().split('T')[0]
            const emotion = getDayEmotion(day)
            
            weeks[weeks.length - 1].push({
              date: day,
              day,
              isToday,
              color: getDayColor(day),
              emoji: getDayIconName(day),
              hasRecord: !!emotion,
            })
            
            return weeks
          }, []).map((week, weekIndex) => (
            <div key={weekIndex} className="flex flex-col gap-0.5">
              {week.map((day, dayIndex) => (
                <div
                  key={dayIndex}
                  className="rounded-sm cursor-pointer transition-colors duration-200 relative group"
                  style={{
                    width: cellSize,
                    height: cellSize,
                    border: day.isToday 
                      ? '1px solid var(--accent)' 
                      : day.hasRecord 
                        ? 'none' 
                        : '1px solid var(--rule)',
                    backgroundColor: day.hasRecord ? day.color : 'transparent',
                  }}
                  onMouseEnter={() => setHoveredDay(day)}
                  onMouseLeave={() => setHoveredDay(null)}
                  onClick={() => onDayClick?.(day.date)}
                >
                  {/* 悬停提示 */}
                  {hoveredDay === day && (
                    <div 
                      className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 rounded text-xs whitespace-nowrap z-10 pointer-events-none"
                      style={{ 
                        backgroundColor: 'var(--ink)',
                        color: 'var(--bg)',
                      }}
                    >
                      {formatDate(day.date)}
                      {day.emoji && <Icon name={day.emoji} size={10} color="var(--bg)" className="ml-1" />}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* 情绪图例 */}
      <div className="mt-4 pt-3 border-t" style={{ borderColor: 'var(--rule)' }}>
        <p className="text-xs mb-2" style={{ color: 'var(--muted)' }}>情绪图例</p>
        <div className="flex flex-wrap gap-2 justify-center">
          {EMOTIONS.map(emo => (
            <div
              key={emo.name}
              className="flex items-center gap-1.5"
            >
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: emo.color }} />
              <span className="text-xs" style={{ color: 'var(--ink)' }}>
                {emo.name}
              </span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--rule)' }} />
            <span className="text-xs" style={{ color: 'var(--muted)' }}>无记录</span>
          </div>
        </div>
      </div>

      {/* 情绪分布统计 */}
      {yearStats.emotionList.length > 0 && (
        <div className="mt-4 pt-3 border-t" style={{ borderColor: 'var(--rule)' }}>
          <p className="text-xs mb-2" style={{ color: 'var(--muted)' }}>年度情绪分布</p>
          <div className="space-y-2">
            {yearStats.emotionList.slice(0, 5).map(emo => (
              <div key={emo.name} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-sm flex-shrink-0"
                  style={{ backgroundColor: emo.color + '40', border: `1px solid ${emo.color}` }}
                />
                <span className="text-xs w-8 flex-shrink-0" style={{ color: 'var(--ink)' }}>{emo.name}</span>
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg2)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${emo.percentage}%`,
                      backgroundColor: emo.color + 'AA',
                    }}
                  />
                </div>
                <span className="text-xs w-10 text-right" style={{ color: 'var(--muted)' }}>
                  {emo.percentage}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      </div>
    </div>
  )
}

export default YearInPixels

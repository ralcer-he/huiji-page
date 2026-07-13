import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { getRecordsByDate, getAllRecords, deleteRecord } from '../db/database'
import { calculateDailyEmotions, getCalendarCellColor } from '../utils/calculateEmotions'
import { EMOTIONS } from '../constants/emotions'
import EmptyState from '../components/ui/EmptyState'
import Icon from '../components/ui/Icon'
import IconButton from '../components/ui/IconButton'
import { RECORD_TYPE_MAP } from '../constants/types'
import { stripHtml } from '../utils/recordHelpers'
import { useCalendarMode } from '../hooks/useAppSettings'
import { getLunarLabel, getFestival, solarToLunar } from '../utils/lunar'

function CalendarPage() {
  const navigate = useNavigate()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [allRecords, setAllRecords] = useState([])
  const [selectedDate, setSelectedDate] = useState(null)
  const [dayRecords, setDayRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const calendarMode = useCalendarMode()

  useEffect(() => {
    loadAllRecords()
  }, [])

  const loadAllRecords = async () => {
    setLoading(true)
    try {
      const records = await getAllRecords()
      setAllRecords(records)
    } catch (error) {
      console.error('加载记录失败:', error)
    }
    setLoading(false)
  }

  const calendarData = useMemo(() => {
    return generateCalendarData(currentDate, allRecords)
  }, [currentDate, allRecords])

  const monthStats = useMemo(() => {
    return calculateMonthStats(currentDate, allRecords)
  }, [currentDate, allRecords])

  const handleDateClick = async (dayInfo) => {
    if (!dayInfo.isCurrentMonth) return
    
    setSelectedDate(dayInfo.date)
    const records = await getRecordsByDate(dayInfo.date)
    setDayRecords(records)
  }

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  const handleDeleteRecord = async (id) => {
    await deleteRecord(id)
    loadAllRecords()
    if (selectedDate) {
      const records = await getRecordsByDate(selectedDate)
      setDayRecords(records)
    }
  }

  const weekdays = ['日', '一', '二', '三', '四', '五', '六']
  const monthStr = `${currentDate.getFullYear()}年${currentDate.getMonth() + 1}月`

  return (
    <div className="w-full py-6 animate-fade-in max-w-[900px] mx-auto">
      {/* 本月统计 */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="huiji-card p-4 text-center">
          <div className="text-2xl font-semibold mb-1" style={{ color: 'var(--accent)' }}>
            {monthStats.recordDays}
          </div>
          <div className="huiji-caption-secondary">记录天数</div>
        </div>
        <div className="huiji-card p-4 text-center">
          <div className="text-2xl font-semibold mb-1" style={{ color: 'var(--accent)' }}>
            {monthStats.totalRecords}
          </div>
          <div className="huiji-caption-secondary">总记录数</div>
        </div>
        <div className="huiji-card p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <span
              className="w-3.5 h-3.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: monthStats.topEmotion?.color || 'var(--muted)' }}
            />
            <span className="text-2xl font-semibold" style={{ color: 'var(--accent)' }}>
              {monthStats.topEmotion?.name || '—'}
            </span>
          </div>
          <div className="huiji-caption-secondary">本月主情绪</div>
        </div>
      </div>

      {/* 日历头部 */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={handlePrevMonth}
          className="p-2 rounded-xl transition-all duration-200 hover:bg-[var(--bg2)]"
          style={{ color: 'var(--muted)' }}
        >
          <Icon name="chevron-left" size={20} color="var(--muted)" strokeWidth={1.5} />
        </button>
        <h2 className="text-base font-bold" style={{ color: 'var(--ink)' }}>
          {monthStr}
        </h2>
        <button
          onClick={handleNextMonth}
          className="p-2 rounded-xl transition-all duration-200 hover:bg-[var(--bg2)]"
          style={{ color: 'var(--muted)' }}
        >
          <Icon name="chevron-right" size={20} color="var(--muted)" strokeWidth={1.5} />
        </button>
      </div>

      {/* 星期标题 */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekdays.map(day => (
          <div 
            key={day} 
            className="text-center text-xs font-medium py-2"
            style={{ color: 'var(--muted)' }}
          >
            {day}
          </div>
        ))}
      </div>

      {/* 日历格子 */}
      <div className="grid grid-cols-7 gap-1.5 mb-6">
        {calendarData.map((day, index) => {
          const isSelected = selectedDate && day.isCurrentMonth
            && selectedDate.getDate() === day.date.getDate()
            && selectedDate.getMonth() === day.date.getMonth()
            && selectedDate.getFullYear() === day.date.getFullYear()
          const isDetailed = calendarMode === 'detailed'
          const isToday = day.isCurrentMonth
            && day.date.getDate() === new Date().getDate()
            && day.date.getMonth() === new Date().getMonth()
            && day.date.getFullYear() === new Date().getFullYear()
          let lunarLabel = ''
          let isFestival = false
          if (isDetailed && day.isCurrentMonth) {
            const festival = getFestival(day.date.getFullYear(), day.date.getMonth() + 1, day.date.getDate())
            if (festival) {
              lunarLabel = festival
              isFestival = true
            } else {
              lunarLabel = getLunarLabel(day.date.getFullYear(), day.date.getMonth() + 1, day.date.getDate())
            }
          }
          return (
            <button
          key={index}
          onClick={() => handleDateClick(day)}
          disabled={!day.isCurrentMonth}
          className={`flex flex-col items-center justify-center transition-all duration-200 border ${
            day.isCurrentMonth ? 'cursor-pointer hover:shadow-sm' : 'cursor-default'
          } ${isDetailed ? 'h-[80px] md:h-[100px]' : 'h-[60px] md:h-[90px]'}`}
              style={{
                backgroundColor: isSelected
                  ? 'var(--accent-light)'
                  : (day.isCurrentMonth ? getCellLightColor(day.cellColor) : 'transparent'),
                borderColor: isSelected ? 'var(--accent)' : (isToday ? 'var(--accent)' : 'var(--rule)'),
                borderWidth: isSelected ? '2px' : (isToday ? '1.5px' : '1px'),
                borderRadius: 'var(--radius-card)',
                opacity: day.isCurrentMonth ? 1 : 0.3,
              }}
            >
              <span
                className="text-sm font-medium leading-none"
                style={{
                  color: isSelected
                    ? 'var(--accent)'
                    : (day.isCurrentMonth ? 'var(--ink)' : 'var(--muted)'),
                  fontWeight: isSelected || isToday ? 700 : 500,
                }}
              >
                {day.day}
              </span>
              {isDetailed && day.isCurrentMonth && (
                <span
                  className="text-[10px] mt-1 leading-none truncate max-w-full px-0.5"
                  style={{
                    color: isFestival
                      ? 'var(--accent)'
                      : (isSelected ? 'var(--accent)' : 'var(--muted)'),
                    fontWeight: isFestival ? 600 : 400,
                  }}
                >
                  {lunarLabel}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* 情绪图例 */}
      <div
        className="huiji-card p-4"
      >
        <p className="text-xs font-medium mb-3" style={{ color: 'var(--muted)' }}>
          情绪图例
        </p>
        <div className="flex flex-wrap gap-3">
          {EMOTIONS.slice(0, 8).map(emotion => (
            <div
              key={emotion.name}
              className="flex items-center gap-1.5"
            >
              <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: emotion.color }} />
              <span className="text-xs font-medium" style={{ color: 'var(--ink)' }}>
                {emotion.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 日期详情弹窗 */}
      {selectedDate && typeof document !== 'undefined' && createPortal(
        <DayDetailModal
          date={selectedDate}
          records={dayRecords}
          onClose={() => setSelectedDate(null)}
          onDelete={handleDeleteRecord}
          onEditRecord={(recordId) => {
            setSelectedDate(null)
            navigate(`/write?editId=${recordId}&from=calendar`)
          }}
          calendarMode={calendarMode}
        />,
        document.body
      )}
    </div>
  )
}

function DayDetailModal({ date, records, onClose, onDelete, onEditRecord, calendarMode }) {
  const dateStr = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  const weekday = weekdays[date.getDay()]
  const festival = getFestival(date.getFullYear(), date.getMonth() + 1, date.getDate())
  const lunar = solarToLunar(date.getFullYear(), date.getMonth() + 1, date.getDate())
  const isDetailed = calendarMode === 'detailed'
  
  const { topEmotion, emotions } = calculateDailyEmotions(records)

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const getRecordContentSummary = (record) => {
    if (record.type === 'mood') {
      return (record.emotions || []).join('、') || '未记录情绪'
    }
    if (record.type === 'diary') {
      return stripHtml(record.contentHTML || record.content || '')
    }
    if (record.type === 'note') {
      return stripHtml(record.contentHTML || record.content || '')
    }
    if (record.type === 'memo') {
      return record.content || ''
    }
    return ''
  }

  const getRecordTypeLabel = (type) => {
    const labels = { mood: '心情', diary: '日记', note: '随笔', memo: '备忘' }
    return labels[type] || type
  }

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center animate-fade-in"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={handleOverlayClick}
    >
      <div 
        className="w-[90%] max-w-[520px] rounded-2xl max-h-[75vh] md:max-h-[85vh] overflow-hidden flex flex-col animate-fade-in"
        style={{ backgroundColor: 'var(--bg)', borderRadius: 'var(--radius-modal)' }}
      >
        {/* 头部 */}
        <div 
          className="px-4 py-3 md:px-5 md:py-4 border-b flex items-center justify-between flex-shrink-0"
          style={{ borderColor: 'var(--rule)' }}
        >
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg transition-all duration-200 hover:bg-[var(--bg2)] md:hidden"
              style={{ color: 'var(--muted)' }}
            >
              <Icon name="chevron-left" size={20} color="var(--muted)" strokeWidth={1.5} />
            </button>
            <div>
              <h3 className="font-semibold text-sm md:text-base" style={{ color: 'var(--ink)' }}>
                {dateStr} {weekday}
              </h3>
              {isDetailed && (
                <p className="text-xs mt-0.5" style={{ color: festival ? 'var(--accent)' : 'var(--muted)', fontWeight: festival ? 600 : 400 }}>
                  {festival
                    ? `${festival} · 农历${lunar.ganzhi}${lunar.zodiac}年 ${lunar.monthName}月${lunar.dayName}`
                    : `农历${lunar.ganzhi}${lunar.zodiac}年 ${lunar.monthName}月${lunar.dayName}`}
                </p>
              )}
              <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                共 {records.length} 条记录
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg transition-all duration-200 hover:bg-[var(--bg2)]"
            style={{ color: 'var(--muted)' }}
          >
            <Icon name="close" size={20} color="var(--muted)" strokeWidth={1.5} />
          </button>
        </div>

        {/* 内容 */}
        <div className="flex-1 overflow-y-auto p-4 md:p-5">
          {records.length === 0 ? (
            <EmptyState iconName="calendar" title="暂无记录" />
          ) : (
            <div className="space-y-5">
              {/* 情绪概览 */}
              {emotions.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-3" style={{ color: 'var(--ink)' }}>
                    情绪概览
                  </h4>
                  
                  {/* 主情绪 */}
                  {topEmotion && (
                    <div 
                      className="p-4 rounded-xl mb-3 flex items-center gap-3"
                      style={{ 
                        backgroundColor: topEmotion.color + '30',
                        border: `1px solid ${topEmotion.color}50`,
                      }}
                    >
                      <Icon name={topEmotion.iconName} size={36} color={topEmotion.color} strokeWidth={1.5} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate" style={{ color: 'var(--ink)' }}>
                          {topEmotion.name}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--muted)' }}>
                          主导情绪 {topEmotion.percentage}%
                        </p>
                      </div>
                    </div>
                  )}

                  {/* 情绪占比 */}
                  <div className="space-y-2">
                    {emotions.map(emo => (
                      <div key={emo.name} className="flex items-center gap-3">
                        <Icon name={emo.iconName} size={16} color={emo.color} strokeWidth={1.5} className="flex-shrink-0" />
                        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--rule)' }}>
                          <div 
                            className="h-full rounded-full transition-all duration-500"
                            style={{ 
                              width: `${emo.percentage}%`,
                              backgroundColor: emo.color,
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

              {/* 今日记录 */}
              <div>
                <h4 className="text-sm font-medium mb-3" style={{ color: 'var(--ink)' }}>
                  今日记录
                </h4>
                <div className="space-y-1">
                  {records.map(record => {
                    const typeInfo = RECORD_TYPE_MAP[record.type]
                    const time = new Date(record.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
                    const contentSummary = getRecordContentSummary(record)
                    return (
                      <div
                        key={record.id}
                        onClick={() => onEditRecord?.(record.id)}
                        className="h-10 rounded-lg flex items-center gap-3 px-3 group cursor-pointer transition-colors duration-200 hover:bg-[var(--bg2)]"
                      >
                        <span
                          className="text-xs px-1.5 py-0.5 rounded flex-shrink-0"
                          style={{
                            backgroundColor: (typeInfo?.color || 'var(--muted)') + '15',
                            color: typeInfo?.color || 'var(--muted)',
                          }}
                        >
                          {getRecordTypeLabel(record.type)}
                        </span>
                        <span className="text-[13px] flex-shrink-0" style={{ color: 'var(--muted)' }}>
                          {time}
                        </span>
                        <div className="flex-1 min-w-0 line-clamp-1 text-sm" style={{ color: 'var(--ink)' }}>
                          {contentSummary || '暂无内容'}
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
                          <IconButton
                            name="trash"
                            onClick={(e) => { e.stopPropagation(); onDelete(record.id) }}
                            label="删除"
                            variant="danger"
                            size={14}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function generateCalendarData(currentDate, allRecords) {
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startWeekday = firstDay.getDay()
  const daysInMonth = lastDay.getDate()
  
  const days = []
  
  // 上个月的填充日
  const prevMonthLastDay = new Date(year, month, 0).getDate()
  for (let i = startWeekday - 1; i >= 0; i--) {
    days.push({
      day: prevMonthLastDay - i,
      isCurrentMonth: false,
      date: new Date(year, month - 1, prevMonthLastDay - i),
    })
  }
  
  // 当月的日期
  for (let i = 1; i <= daysInMonth; i++) {
    const date = new Date(year, month, i)
    const dayRecords = getRecordsForDate(allRecords, date)
    const cellColor = getCalendarCellColor(dayRecords)
    const { topEmotion } = calculateDailyEmotions(dayRecords)
    const hasEmotion = dayRecords.some(r => r.emotions && r.emotions.length > 0)
    
    days.push({
      day: i,
      isCurrentMonth: true,
      date,
      cellColor,
      hasEmotion,
      emoji: topEmotion?.iconName || '',
    })
  }
  
  // 下个月的填充日（补齐42格）
  const remaining = 42 - days.length
  for (let i = 1; i <= remaining; i++) {
    days.push({
      day: i,
      isCurrentMonth: false,
      date: new Date(year, month + 1, i),
    })
  }
  
  return days
}

// 将情绪色转为浅色填充（30% 透明度），禁用深色块
function getCellLightColor(cellColor) {
  if (!cellColor || cellColor.color === 'transparent') return 'var(--bg)'
  if (cellColor.color === 'var(--bg2)') return 'var(--bg2)'
  return cellColor.color + '4D'
}

function getRecordsForDate(allRecords, date) {
  const startOfDay = new Date(date)
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(date)
  endOfDay.setHours(23, 59, 59, 999)
  
  return allRecords.filter(r => {
    const recordDate = new Date(r.createdAt)
    return recordDate >= startOfDay && recordDate <= endOfDay
  })
}

function calculateMonthStats(currentDate, allRecords) {
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  
  const monthRecords = allRecords.filter(r => {
    const d = new Date(r.createdAt)
    return d.getFullYear() === year && d.getMonth() === month
  })
  
  const daysWithRecords = new Set(
    monthRecords.map(r => new Date(r.createdAt).getDate())
  )
  
  const { topEmotion } = calculateDailyEmotions(monthRecords)
  
  return {
    recordDays: daysWithRecords.size,
    totalRecords: monthRecords.length,
    topEmotion,
  }
}

export default CalendarPage

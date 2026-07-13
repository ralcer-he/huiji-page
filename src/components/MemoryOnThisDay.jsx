import { useState, useEffect } from 'react'
import { getAllRecords } from '../db/database'
import { getEmotionByName } from '../constants/emotions'
import Icon from './ui/Icon'

function MemoryOnThisDay() {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    loadMemories()
  }, [])

  const loadMemories = async () => {
    setLoading(true)
    try {
      const allRecords = await getAllRecords()
      const today = new Date()
      const month = today.getMonth()
      const day = today.getDate()
      const currentYear = today.getFullYear()
      
      const memories = allRecords.filter(record => {
        const recordDate = new Date(record.createdAt)
        return recordDate.getMonth() === month 
          && recordDate.getDate() === day 
          && recordDate.getFullYear() < currentYear
      }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      
      setRecords(memories)
    } catch (error) {
      console.error('加载回忆失败:', error)
    }
    setLoading(false)
  }

  const getYearsAgo = (dateStr) => {
    const then = new Date(dateStr)
    const now = new Date()
    const years = now.getFullYear() - then.getFullYear()
    return years
  }

  const getRecordPreview = (record) => {
    if (record.type === 'mood') {
      const emotion = record.emotions?.[0] ? getEmotionByName(record.emotions[0]) : null
      return emotion ? `${emotion.name}的心情` : '心情记录'
    }
    if (record.type === 'memo') {
      return record.content?.substring(0, 30) || '待办事项'
    }
    let text = record.content || ''
    text = text.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').substring(0, 40)
    return text || '无内容'
  }

  const getTypeLabel = (type) => {
    const labels = { note: '随笔', mood: '心情', memo: '备忘', diary: '日记' }
    return labels[type] || type
  }

  if (loading) {
    return (
      <div 
        className="w-full rounded-2xl p-5 mb-6 animate-pulse"
        style={{ backgroundColor: 'var(--bg)' }}
      >
        <div className="h-5 w-24 rounded" style={{ backgroundColor: 'var(--bg2)' }} />
      </div>
    )
  }

  if (records.length === 0) {
    return (
      <div 
        className="w-full rounded-2xl p-4 mb-6"
        style={{ 
          backgroundColor: 'var(--bg)',
          border: '1px solid var(--rule)',
        }}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--bg2)' }}>
            <Icon name="calendar" size={16} color="var(--muted)" strokeWidth={1.5} />
          </div>
          <div>
            <h3 className="text-sm font-medium mb-0.5" style={{ color: 'var(--ink)' }}>
              往年今日
            </h3>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>
              暂无历史记录
            </p>
          </div>
        </div>
      </div>
    )
  }

  const displayRecords = expanded ? records : records.slice(0, 2)

  return (
    <div 
      className="w-full rounded-2xl p-4 mb-6"
      style={{ 
        backgroundColor: 'var(--bg)',
        border: '1px solid var(--rule)',
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--bg2)' }}>
            <Icon name="calendar" size={16} color="var(--muted)" strokeWidth={1.5} />
          </div>
          <h3 className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
            {getYearsAgo(records[0].createdAt)} 年前的今天
          </h3>
        </div>
        <span 
          className="text-xs px-2 py-0.5 rounded-md"
          style={{ 
            backgroundColor: 'var(--accent)',
            color: 'white',
          }}
        >
          {records.length} 条
        </span>
      </div>
      
      <div className="space-y-2">
        {displayRecords.map(record => {
          const years = getYearsAgo(record.createdAt)
          return (
            <div 
              key={record.id}
              className="p-3 rounded-xl transition-colors duration-200"
              style={{ backgroundColor: 'var(--bg2)' }}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span 
                  className="text-xs"
                  style={{ color: 'var(--muted)' }}
                >
                  {getTypeLabel(record.type)}
                </span>
                <span className="text-xs" style={{ color: 'var(--muted)' }}>
                  {years} 年前
                </span>
              </div>
              <p className="text-sm line-clamp-2 leading-relaxed" style={{ color: 'var(--ink)' }}>
                {getRecordPreview(record)}
              </p>
            </div>
          )
        })}
      </div>
      
      {records.length > 2 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full mt-3 py-1.5 text-xs font-medium transition-colors duration-200 hover:opacity-70"
          style={{ color: 'var(--accent)' }}
        >
          {expanded ? '收起' : `展开全部 ${records.length} 条`}
        </button>
      )}
    </div>
  )
}

export default MemoryOnThisDay

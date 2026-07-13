import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import TypeTabs from '../components/write/TypeTabs'
import NoteEditor from '../components/write/NoteEditor'
import MoodSelector from '../components/write/MoodSelector'
import MemoList from '../components/write/MemoList'
import DiaryEditor from '../components/write/DiaryEditor'
import Icon from '../components/ui/Icon'
import { getRecordById } from '../db/database'
import { useWritePageTypes } from '../hooks/useAppSettings'

function WritePage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [activeType, setActiveType] = useState(null)
  const [customDate, setCustomDate] = useState(null)
  const [editingRecord, setEditingRecord] = useState(null)
  const [loadingEdit, setLoadingEdit] = useState(false)
  const writePageTypes = useWritePageTypes()

  const from = searchParams.get('from')
  const editId = searchParams.get('editId')

  useEffect(() => {
    if (editId) return
    setActiveType(prev => {
      if (prev && writePageTypes.includes(prev)) return prev
      return writePageTypes[0]
    })
  }, [writePageTypes, editId])

  useEffect(() => {
    const dateParam = searchParams.get('date')
    if (dateParam) {
      const parsed = new Date(dateParam)
      if (!isNaN(parsed.getTime())) {
        parsed.setHours(10, 0, 0, 0)
        setCustomDate(parsed)
      }
    } else {
      setCustomDate(null)
    }
  }, [searchParams])

  useEffect(() => {
    if (!editId) {
      setEditingRecord(null)
      return
    }

    const loadRecord = async () => {
      setLoadingEdit(true)
      try {
        const record = await getRecordById(editId)
        if (record) {
          setEditingRecord(record)
          setActiveType(record.type)
          if (record.createdAt) {
            const date = new Date(record.createdAt)
            setCustomDate(date)
          }
        }
      } catch (error) {
        console.error('加载记录失败:', error)
      }
      setLoadingEdit(false)
    }

    loadRecord()
  }, [editId])

  const handleSaved = (record) => {
    // 不再自动返回，改为手动按钮返回
  }

  const handleBackToCalendar = () => {
    navigate('/calendar')
  }

  const formatDateLabel = () => {
    if (!customDate) return ''
    const today = new Date()
    const isToday = customDate.getDate() === today.getDate()
      && customDate.getMonth() === today.getMonth()
      && customDate.getFullYear() === today.getFullYear()
    if (isToday) return ''
    const y = customDate.getFullYear()
    const m = String(customDate.getMonth() + 1).padStart(2, '0')
    const d = String(customDate.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  const dateLabel = formatDateLabel()
  const isEditing = !!editingRecord

  const renderEditor = () => {
    const props = {
      ...(customDate ? { customDate } : {}),
      setCustomDate,
      ...(editingRecord ? { editRecord: editingRecord } : {}),
      onSaved: handleSaved,
    }
    switch (activeType) {
      case 'note':
        return <NoteEditor key={`note-${customDate?.getTime() || 'today'}-${editingRecord?.id || 'new'}`} {...props} />
      case 'mood':
        return <MoodSelector key={`mood-${customDate?.getTime() || 'today'}-${editingRecord?.id || 'new'}`} {...props} />
      case 'memo':
        return <MemoList key={`memo-${customDate?.getTime() || 'today'}-${editingRecord?.id || 'new'}`} {...props} />
      case 'diary':
        return <DiaryEditor key={`diary-${customDate?.getTime() || 'today'}-${editingRecord?.id || 'new'}`} type="diary" {...props} />
      default:
        return null
    }
  }

  if (loadingEdit) {
    return (
      <div className="w-full flex flex-col items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full" />
        <p className="text-sm mt-4" style={{ color: 'var(--muted)' }}>加载中...</p>
      </div>
    )
  }

  return (
    <div className="w-full flex flex-col animate-fade-in">
      {/* 顶部操作栏 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {(dateLabel || isEditing) && (
            <>
              {from === 'calendar' && (
                <button
                  onClick={handleBackToCalendar}
                  aria-label="返回"
                  className="flex items-center justify-center w-9 h-9 rounded-[6px] transition-colors duration-200 hover:bg-[var(--bg2)]"
                  style={{
                    backgroundColor: 'transparent',
                    color: 'var(--ink)',
                    border: '1px solid var(--rule)',
                  }}
                >
                  <Icon name="back" size={18} color="var(--ink)" strokeWidth={1.5} />
                </button>
              )}
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-[6px] text-[13px]"
                style={{
                  backgroundColor: 'var(--bg2)',
                  color: 'var(--ink)',
                  borderLeft: '2px solid var(--accent)',
                }}
              >
                <Icon name={isEditing ? 'edit' : 'calendar'} size={14} color="var(--accent)" strokeWidth={1.5} />
                <span style={{ color: 'var(--muted)' }}>
                  {isEditing ? '编辑记录' : `补记 · ${dateLabel}`}
                </span>
              </div>
            </>
          )}
        </div>

        {/* 右侧操作区 */}
        <div className="flex items-center gap-2">
          {from === 'calendar' && (
            <button
              onClick={handleBackToCalendar}
              className="px-3 h-9 rounded-[6px] text-[13px] transition-colors duration-200"
              style={{
                backgroundColor: 'transparent',
                color: 'var(--accent)',
                border: '1px solid var(--accent)',
              }}
            >
              返回日历
            </button>
          )}
        </div>
      </div>

      {/* 类型标签 */}
      <div className="mb-6">
        <TypeTabs activeType={activeType} onChange={setActiveType} />
      </div>

      {/* 编辑器区域 */}
      <div className="flex-1 min-w-0 flex justify-center">
        {renderEditor()}
      </div>
    </div>
  )
}

export default WritePage

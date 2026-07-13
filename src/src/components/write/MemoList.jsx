import { useState, useEffect } from 'react'
import { saveRecord, deleteRecord, getRecordsByDate, getDailyMemos, saveDailyMemos } from '../../db/database'
import { triggerEmotionAnalysis } from '../../utils/aiHelper'
import EmptyState from '../ui/EmptyState'
import Icon from '../ui/Icon'
import { createPortal } from 'react-dom'

function MemoList({ customDate }) {
  const [items, setItems] = useState([])
  const [newItemText, setNewItemText] = useState('')
  const [dailyMemos, setDailyMemos] = useState([])
  const [showDailyMemosModal, setShowDailyMemosModal] = useState(false)
  const [newDailyMemoText, setNewDailyMemoText] = useState('')

  const effectiveDate = customDate || new Date()

  useEffect(() => {
    loadMemos()
    loadDailyMemos()
  }, [customDate])

  const loadMemos = async () => {
    const records = await getRecordsByDate(effectiveDate)
    const memos = records
      .filter(r => r.type === 'memo')
      .map(r => ({
        id: r.id,
        text: r.content,
        completed: r.completed || false,
        createdAt: r.createdAt,
        isDaily: false,
      }))
    memos.sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1
      return new Date(b.createdAt) - new Date(a.createdAt)
    })
    setItems(memos)
  }

  const loadDailyMemos = async () => {
    const saved = await getDailyMemos()
    setDailyMemos(saved || [])
  }

  const addDailyMemo = async () => {
    if (!newDailyMemoText.trim()) return
    const newMemos = [...dailyMemos, newDailyMemoText.trim()]
    await saveDailyMemos(newMemos)
    setDailyMemos(newMemos)
    setNewDailyMemoText('')
  }

  const deleteDailyMemo = async (index) => {
    const newMemos = dailyMemos.filter((_, i) => i !== index)
    await saveDailyMemos(newMemos)
    setDailyMemos(newMemos)
  }

  const addDailyMemoToToday = async (text) => {
    const timestamp = customDate ? customDate.getTime() : Date.now()
    const record = {
      id: `memo_${timestamp}_${Date.now()}`,
      type: 'memo',
      content: text,
      completed: false,
      tags: [],
    }
    if (customDate) {
      record.createdAt = customDate.toISOString()
    }
    await saveRecord(record)
    triggerEmotionAnalysis(record)
    loadMemos()
  }

  const addItem = async () => {
    if (!newItemText.trim()) return

    const timestamp = customDate ? customDate.getTime() : Date.now()
    const record = {
      id: `memo_${timestamp}`,
      type: 'memo',
      content: newItemText.trim(),
      completed: false,
      tags: [],
    }

    if (customDate) {
      record.createdAt = customDate.toISOString()
    }

    await saveRecord(record)
    triggerEmotionAnalysis(record)
    setNewItemText('')
    loadMemos()
  }

  const toggleItem = async (id) => {
    const item = items.find(i => i.id === id)
    if (!item) return

    const record = {
      id,
      type: 'memo',
      content: item.text,
      completed: !item.completed,
      tags: [],
      createdAt: item.createdAt.toISOString(),
    }

    await saveRecord(record)
    loadMemos()
  }

  const deleteItem = async (id) => {
    await deleteRecord(id)
    loadMemos()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      addItem()
    }
  }

  const completedCount = items.filter(i => i.completed).length
  const totalCount = items.length
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0

  return (
    <div className="w-full animate-fade-in">
      <div className="huiji-card p-5 max-w-[700px] mx-auto">
        {/* 标题和进度 */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-[16px] font-semibold" style={{ color: 'var(--ink-strong)' }}>
            今日待办
          </p>
          <div className="flex items-center gap-3">
            <span className="text-[14px]" style={{ color: 'var(--ink)' }}>
              {completedCount}/{totalCount}
            </span>
            <div
              className="h-1.5 w-24 rounded-full overflow-hidden"
              style={{ backgroundColor: 'var(--bg2)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${progress}%`,
                  backgroundColor: 'var(--accent)',
                }}
              />
            </div>
          </div>
        </div>

        {/* 备忘列表 */}
        <div className="mb-4">
          {items.length === 0 ? (
            <EmptyState iconName="memo" title="暂无待办" />
          ) : (
            <div className="space-y-0">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 px-2 h-12 transition-all duration-300 group hover:bg-[var(--bg2)] rounded-lg"
                  style={{
                    animation: `fadeIn 0.3s ease-out ${index * 0.05}s both`,
                    borderBottom: index < items.length - 1 ? '1px solid var(--rule)' : 'none',
                  }}
                >
                  {/* 勾选框 */}
                  <button
                    onClick={() => toggleItem(item.id)}
                    className="flex-shrink-0 w-5 h-5 rounded-[4px] border-2 flex items-center justify-center transition-colors duration-300"
                    style={{
                      backgroundColor: item.completed ? 'var(--accent)' : 'transparent',
                      borderColor: item.completed ? 'var(--accent)' : 'var(--rule)',
                    }}
                  >
                    {item.completed && (
                      <Icon name="check" size={14} color="white" strokeWidth={3} />
                    )}
                  </button>

                  {/* 文字 */}
                  <span
                    className="flex-1 text-sm transition-all duration-300 truncate"
                    style={{
                      color: item.completed ? 'var(--muted)' : 'var(--ink)',
                      textDecoration: item.completed ? 'line-through' : 'none',
                    }}
                  >
                    {item.text}
                  </span>

                  {/* 删除按钮 */}
                  <button
                    onClick={() => deleteItem(item.id)}
                    className="opacity-0 group-hover:opacity-100 transition-all p-1.5 rounded-lg hover:bg-red-50 hover:text-red-500"
                    style={{ color: 'var(--muted)' }}
                  >
                    <Icon name="trash" size={16} color="currentColor" strokeWidth={2} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 固定每日代办 */}
        {dailyMemos.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2 px-2">
              <span className="text-xs font-medium" style={{ color: 'var(--muted)' }}>固定每日代办</span>
            </div>
            <div className="space-y-0">
              {dailyMemos.map((text, index) => (
                <div
                  key={`daily-${index}`}
                  className="flex items-center gap-3 px-2 h-10 transition-all duration-300"
                  style={{
                    backgroundColor: 'var(--accent-light)',
                    borderBottom: index < dailyMemos.length - 1 ? '1px solid var(--accent-border)' : 'none',
                  }}
                >
                  <button
                    onClick={() => addDailyMemoToToday(text)}
                    className="flex-shrink-0 w-5 h-5 rounded-[4px] border-2 flex items-center justify-center transition-colors duration-300 hover:bg-white/30"
                    style={{
                      backgroundColor: 'transparent',
                      borderColor: 'white',
                    }}
                  >
                    <Icon name="plus" size={12} color="white" strokeWidth={2} />
                  </button>
                  <span
                    className="flex-1 text-sm"
                    style={{ color: 'var(--accent)' }}
                  >
                    {text}
                  </span>
                  <button
                    className="p-1 rounded transition-colors hover:bg-white/30"
                    title="固定代办"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2v6"/>
                      <path d="M5 10h14"/>
                      <path d="M7 10l5 12 5-12"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 添加新项 */}
        <div
          className="flex items-center gap-3 pt-4"
          style={{ borderTop: '1px solid var(--rule)' }}
        >
          <button
            onClick={addItem}
            disabled={!newItemText.trim()}
            className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-colors duration-300 disabled:opacity-40"
            style={{
              backgroundColor: newItemText.trim() ? 'var(--accent)' : 'var(--bg2)',
              color: newItemText.trim() ? 'white' : 'var(--muted)',
            }}
          >
            <Icon name="plus" size={20} color="currentColor" strokeWidth={2} />
          </button>
          <input
            type="text"
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="添加新的待办..."
            className="flex-1 bg-transparent outline-none text-sm px-3 py-2.5 rounded-[6px] transition-all duration-200 border focus:ring-2 focus:ring-[var(--accent-light)]"
            style={{ color: 'var(--ink)', backgroundColor: 'var(--bg2)', borderColor: 'var(--rule)' }}
          />
        </div>

        {/* 已完成计数和固定代办管理 */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t" style={{ borderColor: 'var(--rule)' }}>
          {completedCount > 0 && (
            <p className="text-[13px]" style={{ color: 'var(--muted)' }}>
              今日已完成 {completedCount} 项
            </p>
          )}
          {!completedCount && <div />}
          <button
            onClick={() => setShowDailyMemosModal(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-[6px] text-[13px] transition-colors duration-200 hover:bg-[var(--bg2)]"
            style={{
              backgroundColor: 'transparent',
              color: 'var(--accent)',
            }}
          >
            <Icon name="settings" size={14} color="var(--accent)" strokeWidth={1.5} />
            <span>管理固定代办</span>
          </button>
        </div>
      </div>

      {/* 固定每日代办管理弹窗 */}
      {showDailyMemosModal && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center animate-fade-in"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          onClick={() => setShowDailyMemosModal(false)}
        >
          <div 
            className="w-full max-w-sm mx-4 rounded-xl overflow-hidden animate-slide-up"
            style={{ backgroundColor: 'var(--bg)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 h-12 border-b" style={{ borderColor: 'var(--rule)' }}>
              <h3 className="font-bold" style={{ color: 'var(--ink)' }}>固定每日代办</h3>
              <button onClick={() => setShowDailyMemosModal(false)} className="p-2 rounded-lg transition-all hover:bg-[var(--bg2)]" style={{ color: 'var(--muted)' }}>
                <Icon name="close" size={20} color="var(--muted)" />
              </button>
            </div>
            <div className="p-5">
              <p className="text-xs mb-3" style={{ color: 'var(--muted)' }}>设置每天都会出现的代办事项，点击加号即可添加到今日待办</p>
              
              {/* 添加新固定代办 */}
              <div className="flex items-center gap-2 mb-4">
                <input
                  type="text"
                  value={newDailyMemoText}
                  onChange={(e) => setNewDailyMemoText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addDailyMemo()}
                  placeholder="添加新的固定代办..."
                  className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
                  style={{
                    backgroundColor: 'var(--bg2)',
                    color: 'var(--ink)',
                    border: '1px solid var(--rule)',
                  }}
                />
                <button
                  onClick={addDailyMemo}
                  disabled={!newDailyMemoText.trim()}
                  className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors duration-300 disabled:opacity-40"
                  style={{
                    backgroundColor: newDailyMemoText.trim() ? 'var(--accent)' : 'var(--bg2)',
                    color: newDailyMemoText.trim() ? 'white' : 'var(--muted)',
                  }}
                >
                  <Icon name="plus" size={18} color="currentColor" strokeWidth={2} />
                </button>
              </div>

              {/* 固定代办列表 */}
              {dailyMemos.length === 0 ? (
                <div className="text-center py-6">
                  <Icon name="memo" size={24} color="var(--placeholder)" strokeWidth={1} />
                  <p className="text-xs mt-2" style={{ color: 'var(--muted)' }}>暂无固定代办</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {dailyMemos.map((text, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 rounded-xl"
                      style={{ backgroundColor: 'var(--accent-light)' }}
                    >
                      <span className="text-sm" style={{ color: 'var(--accent)' }}>{text}</span>
                      <button
                        onClick={() => deleteDailyMemo(index)}
                        className="p-1.5 rounded-lg transition-all hover:bg-red-50 hover:text-red-500"
                        style={{ color: 'var(--muted)' }}
                      >
                        <Icon name="trash" size={14} color="currentColor" strokeWidth={2} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

export default MemoList

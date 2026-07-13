import { useState, useEffect, useCallback } from 'react'
import Icon from '../ui/Icon'
import { getDrafts, deleteDraft } from '../../db/database'

function DraftManager() {
  const [drafts, setDrafts] = useState([])
  const [expanded, setExpanded] = useState(false)

  const loadDrafts = useCallback(async () => {
    const list = await getDrafts()
    setDrafts(list)
  }, [])

  useEffect(() => {
    loadDrafts()
  }, [loadDrafts])

  const handleDelete = async (id) => {
    if (!confirm('确定删除这条草稿吗？')) return
    await deleteDraft(id)
    loadDrafts()
  }

  const formatTime = (dateStr) => {
    const d = new Date(dateStr)
    const now = new Date()
    const diff = now - d
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return '刚刚'
    if (mins < 60) return `${mins} 分钟前`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours} 小时前`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days} 天前`
    return d.toLocaleDateString('zh-CN')
  }

  return (
    <div>
      <button
        className="w-full flex items-center gap-3 px-5 py-4 text-left transition-all duration-200 group hover:bg-[var(--bg2)]"
        onClick={() => setExpanded(!expanded)}
      >
        <Icon name="note" size={18} color="var(--ink)" />
        <div className="flex-1 min-w-0">
          <div className="text-sm" style={{ color: 'var(--ink)', lineHeight: '1.7' }}>
            草稿箱
          </div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--muted)', lineHeight: '1.7' }}>
            {drafts.length === 0 ? '暂无草稿' : `${drafts.length} 条草稿`}
          </div>
        </div>
        <Icon
          name="chevron-right"
          size={16}
          color="var(--ink)"
          className={`transition-transform duration-200 flex-shrink-0 ${expanded ? 'rotate-90' : ''}`}
        />
      </button>

      {expanded && (
        <div>
          {drafts.length === 0 ? (
            <div className="px-5 pb-6 text-center">
              <p className="text-sm" style={{ color: 'var(--muted)', lineHeight: '1.7' }}>
                编辑日记时自动保存的草稿会显示在这里
              </p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: 'var(--rule)' }}>
              {drafts.map((draft) => (
                <div
                  key={draft.id}
                  className="flex items-center gap-3 px-5 py-3 transition-colors"
                  style={{ borderColor: 'var(--rule)' }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate" style={{ color: 'var(--ink)', lineHeight: '1.7' }}>
                      {draft.title || draft.content?.slice(0, 40) || '无标题草稿'}
                    </div>
                    <div className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                      {draft.type === 'diary' ? '日记' : draft.type === 'mood' ? '心情' : draft.type === 'memo' ? '备忘' : '随笔'}
                      {' · '}
                      {formatTime(draft.updatedAt)}
                    </div>
                  </div>
                  <button
                    className="p-2 rounded-lg transition-colors flex-shrink-0"
                    style={{ color: 'var(--muted)' }}
                    onClick={() => handleDelete(draft.id)}
                  >
                    <Icon name="trash" size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default DraftManager

import { useState, useEffect, useCallback } from 'react'
import Icon from '../ui/Icon'
import { getTemplates, saveTemplate, deleteTemplate, initDefaultTemplates } from '../../db/database'

const TYPE_LABELS = {
  diary: '日记',
  mood: '心情',
  memo: '备忘',
  note: '随笔',
}

function TemplateManager() {
  const [templates, setTemplates] = useState([])
  const [expanded, setExpanded] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editContent, setEditContent] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  const loadTemplates = useCallback(async () => {
    const list = await getTemplates()
    setTemplates(list)
  }, [])

  useEffect(() => {
    initDefaultTemplates()
    loadTemplates()
  }, [loadTemplates])

  const handleStartAdd = () => {
    setEditingId(null)
    setIsAdding(true)
    setEditName('')
    setEditContent('')
  }

  const handleStartEdit = (tpl) => {
    setEditingId(tpl.id)
    setIsAdding(false)
    setEditName(tpl.name)
    setEditContent(tpl.content || '')
  }

  const handleSave = async () => {
    const name = editName.trim()
    if (!name) return

    if (isAdding) {
      const id = `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
      await saveTemplate({
        id,
        name,
        type: 'diary',
        title: name,
        content: editContent,
        isSystem: false,
      })
      setIsAdding(false)
    } else {
      const tpl = templates.find(t => t.id === editingId)
      if (tpl) {
        await saveTemplate({
          ...tpl,
          name,
          title: name,
          content: editContent,
        })
      }
      setEditingId(null)
    }
    loadTemplates()
  }

  const handleCancel = () => {
    setEditingId(null)
    setIsAdding(false)
    setEditName('')
    setEditContent('')
  }

  const handleDelete = async (id) => {
    if (!confirm('确定删除这个模板吗？')) return
    await deleteTemplate(id)
    loadTemplates()
  }

  return (
    <div>
      {/* 标题行 */}
      <button
        className="w-full flex items-center gap-3 px-5 py-4 text-left transition-all duration-200 group hover:bg-[var(--bg2)]"
        onClick={() => setExpanded(!expanded)}
      >
        <Icon name="file" size={18} color="var(--muted)" />
        <div className="flex-1 min-w-0">
          <div className="text-sm" style={{ color: 'var(--ink)', lineHeight: '1.7' }}>
            日记模板
          </div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--muted)', lineHeight: '1.7' }}>
            {templates.length === 0 ? '暂无模板' : `${templates.length} 个模板`}
          </div>
        </div>
        <Icon
          name="chevron-right"
          size={16}
          color="var(--muted)"
          className={`transition-transform duration-200 flex-shrink-0 ${expanded ? 'rotate-90' : ''}`}
        />
      </button>

      {expanded && (
        <div>
          {/* 编辑/新增面板 */}
          {(isAdding || editingId) && (
            <div className="px-5 py-4 space-y-3" style={{ borderTop: '1px solid var(--rule)' }}>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="模板名称"
                maxLength={30}
                className="w-full px-4 py-2 text-sm rounded-lg outline-none"
                style={{
                  backgroundColor: 'var(--bg2)',
                  color: 'var(--ink)',
                  lineHeight: '1.7',
                }}
                autoFocus
              />
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                placeholder="模板内容（可选，填写后新建日记时自动填充）"
                rows={3}
                className="w-full px-4 py-2 text-sm rounded-lg outline-none resize-none"
                style={{
                  backgroundColor: 'var(--bg2)',
                  color: 'var(--ink)',
                  lineHeight: '1.7',
                }}
              />
              <div className="flex gap-2 justify-end">
                <button
                  className="px-4 py-2 text-sm rounded-lg transition-colors"
                  style={{ color: 'var(--muted)' }}
                  onClick={handleCancel}
                >
                  取消
                </button>
                <button
                  className="px-4 py-2 text-sm rounded-lg transition-colors"
                  style={{ backgroundColor: 'var(--accent)', color: 'white' }}
                  onClick={handleSave}
                >
                  保存
                </button>
              </div>
            </div>
          )}

          {/* 模板列表 */}
          {templates.length === 0 ? (
            <div className="px-5 pb-6 text-center">
              <p className="text-sm" style={{ color: 'var(--muted)', lineHeight: '1.7' }}>
                暂无模板，点击下方按钮新增
              </p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: 'var(--rule)' }}>
              {templates.map((tpl) => (
                <div
                  key={tpl.id}
                  className="flex items-center gap-3 px-5 py-3 transition-colors"
                  style={{ borderColor: 'var(--rule)' }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate" style={{ color: 'var(--ink)', lineHeight: '1.7' }}>
                      {tpl.name}
                    </div>
                    <div className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                      {TYPE_LABELS[tpl.type] || tpl.type}
                      {tpl.isSystem && (
                        <span
                          className="ml-1 px-1.5 py-0.5 rounded-full"
                          style={{
                            backgroundColor: 'var(--bg2)',
                            color: 'var(--muted)',
                            lineHeight: '1.6',
                          }}
                        >
                          系统预设
                        </span>
                      )}
                    </div>
                  </div>
                  {!tpl.isSystem && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        className="p-2 rounded-lg transition-colors"
                        style={{ color: 'var(--muted)' }}
                        onClick={() => handleStartEdit(tpl)}
                      >
                        <Icon name="edit" size={16} />
                      </button>
                      <button
                        className="p-2 rounded-lg transition-colors"
                        style={{ color: 'var(--muted)' }}
                        onClick={() => handleDelete(tpl.id)}
                      >
                        <Icon name="trash" size={16} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 新增按钮 */}
          {!isAdding && !editingId && (
            <div className="px-5 py-4">
              <button
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm transition-colors"
                style={{
                  color: 'var(--accent)',
                  backgroundColor: 'var(--bg2)',
                  lineHeight: '1.7',
                }}
                onClick={handleStartAdd}
              >
                <Icon name="plus" size={16} />
                <span>新增模板</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default TemplateManager

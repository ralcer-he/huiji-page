import { useState, useEffect, useCallback } from 'react'
import Icon from '../ui/Icon'
import { getCategories, saveCategory, deleteCategory } from '../../db/database'

const PRESET_COLORS = [
  '#5DADE2', // 蓝
  '#F59E0B', // 琥珀
  '#10B981', // 绿
  '#8B5CF6', // 紫
  '#EF4444', // 红
  '#EC4899', // 粉
  '#14B8A6', // 青
  '#F97316', // 橙
]

const BUILTIN_ICONS = [
  'file', 'edit', 'home', 'briefcase', 'heart', 'plane',
  'activity', 'star', 'book', 'music', 'camera', 'coffee',
  'tag', 'pin', 'gift', 'sun', 'moon', 'checkbox',
]

function CategoryManager({ onCategoriesChange }) {
  const [categories, setCategories] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('')
  const [editIcon, setEditIcon] = useState('file')
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)
  const [isAddingNew, setIsAddingNew] = useState(false)

  const loadCategories = useCallback(async () => {
    const list = await getCategories()
    setCategories(list)
    onCategoriesChange?.(list)
  }, [onCategoriesChange])

  useEffect(() => {
    loadCategories()
  }, [loadCategories])

  // 进入编辑模式
  const handleStartEdit = (cat) => {
    setEditingId(cat.id)
    setEditName(cat.name)
    setEditColor(cat.color)
    setEditIcon(cat.iconName || 'file')
    setDeleteConfirmId(null)
    setIsAddingNew(false)
  }

  // 保存编辑
  const handleSaveEdit = async () => {
    const name = editName.trim()
    if (!name) return

    const cat = categories.find(c => c.id === editingId)
    if (!cat) return

    await saveCategory({
      ...cat,
      name,
      color: editColor,
      iconName: editIcon,
    })
    setEditingId(null)
    loadCategories()
  }

  // 取消编辑
  const handleCancelEdit = () => {
    setEditingId(null)
    setIsAddingNew(false)
  }

  // 请求新增分类
  const handleStartAdd = () => {
    setEditingId(null)
    setIsAddingNew(true)
    setEditName('')
    setEditColor(PRESET_COLORS[0])
    setEditIcon('file')
    setDeleteConfirmId(null)
  }

  // 确认新增
  const handleConfirmAdd = async () => {
    const name = editName.trim()
    if (!name) return

    const id = `cat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    const maxOrder = categories.reduce((max, c) => Math.max(max, c.order || 0), 0)

    await saveCategory({
      id,
      name,
      color: editColor,
      iconName: editIcon,
      order: maxOrder + 1,
      isDefault: false,
    })
    setIsAddingNew(false)
    loadCategories()
  }

  // 请求删除
  const handleRequestDelete = (id) => {
    setDeleteConfirmId(id)
  }

  // 取消删除
  const handleCancelDelete = () => {
    setDeleteConfirmId(null)
  }

  // 确认删除
  const handleConfirmDelete = async (id) => {
    await deleteCategory(id)
    setDeleteConfirmId(null)
    loadCategories()
  }

  // 删除确认弹窗
  const renderDeleteConfirm = (cat) => {
    if (deleteConfirmId !== cat.id) return null
    return (
      <div
        className="absolute inset-0 z-10 flex items-center justify-center rounded-xl"
        style={{ backgroundColor: 'var(--overlay-light)' }}
      >
        <div
          className="mx-5 p-5 rounded-xl text-center"
          style={{ backgroundColor: 'var(--bg-card)' }}
        >
          <p className="text-sm leading-[1.7] mb-4" style={{ color: 'var(--ink)' }}>
            确定删除分类「{cat.name}」吗？
          </p>
          <p className="text-xs leading-[1.7] mb-5" style={{ color: 'var(--muted)' }}>
            该分类下的日记将变为未分类
          </p>
          <div className="flex gap-3 justify-center">
            <button
              className="px-5 py-2 text-sm rounded-lg transition-colors"
              style={{ color: 'var(--muted)' }}
              onClick={handleCancelDelete}
            >
              取消
            </button>
            <button
              className="px-5 py-2.5 text-sm rounded-lg transition-colors"
              style={{ backgroundColor: 'var(--color-danger)', color: 'white' }}
              onClick={() => handleConfirmDelete(cat.id)}
            >
              删除
            </button>
          </div>
        </div>
      </div>
    )
  }

  // 编辑行
  const renderEditRow = (id, isNew) => {
    return (
      <div
        className="p-5 rounded-xl transition-colors"
        style={{ backgroundColor: 'var(--bg-card)', position: 'relative', zIndex: 10 }}
      >
        <div className="flex items-center gap-3 mb-4">
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            placeholder="输入分类名称"
            maxLength={20}
            className="flex-1 px-4 py-2 text-sm rounded-lg outline-none transition-all"
            style={{
              backgroundColor: 'var(--bg2)',
              color: 'var(--ink)',
              lineHeight: '1.7',
            }}
            autoFocus
          />
          <button
            className="p-2 rounded-lg transition-colors"
            style={{ color: 'var(--accent)' }}
            onClick={isNew ? handleConfirmAdd : handleSaveEdit}
            title="保存"
          >
            <Icon name="check" size={18} />
          </button>
          <button
            className="p-2 rounded-lg transition-colors"
            style={{ color: 'var(--muted)' }}
            onClick={handleCancelEdit}
            title="取消"
          >
            <Icon name="close" size={18} />
          </button>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {PRESET_COLORS.map((color) => (
            <button
              key={color}
              className="w-7 h-7 rounded-full transition-transform"
              style={{
                backgroundColor: color,
                transform: editColor === color ? 'scale(1.25)' : 'scale(1)',
                boxShadow: editColor === color
                  ? `0 0 0 2.5px var(--bg), 0 0 0 4px ${color}`
                  : 'none',
              }}
              onClick={() => setEditColor(color)}
            />
          ))}
        </div>
        {/* 图标选择 */}
        <div className="mt-3">
          <p className="text-[11px] mb-2" style={{ color: 'var(--muted)' }}>选择图标</p>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {BUILTIN_ICONS.map((iconName) => (
              <button
                key={iconName}
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors"
                style={{
                  backgroundColor: editIcon === iconName ? editColor + '20' : 'var(--bg2)',
                  color: editIcon === iconName ? editColor : 'var(--muted)',
                  border: editIcon === iconName ? `1.5px solid ${editColor}` : '1.5px solid transparent',
                }}
                onClick={() => setEditIcon(iconName)}
              >
                <Icon name={iconName} size={16} strokeWidth={1.5} />
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        {categories.map((cat) => {
          // 当前正在编辑此分类
          if (editingId === cat.id && !isAddingNew) {
            return <div key={cat.id}>{renderEditRow(cat.id, false)}</div>
          }

          // 普通展示行
          return (
            <div
              key={cat.id}
              className="relative p-5 rounded-xl transition-colors"
              style={{ backgroundColor: 'var(--bg-card)' }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: cat.color + '18', color: cat.color }}
                  >
                    <Icon name={cat.iconName || 'file'} size={14} strokeWidth={1.5} />
                  </span>
                  <span
                    className="text-sm truncate"
                    style={{ color: 'var(--ink)', lineHeight: '1.7' }}
                  >
                    {cat.name}
                  </span>
                  {cat.isDefault && (
                    <span
                      className="text-[11px] px-2 py-0.5 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor: 'var(--bg2)',
                        color: 'var(--muted)',
                        lineHeight: '1.6',
                      }}
                    >
                      默认
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    className="p-2 rounded-lg transition-colors"
                    style={{ color: 'var(--muted)' }}
                    onClick={() => handleStartEdit(cat)}
                    title="编辑"
                  >
                    <Icon name="edit" size={16} />
                  </button>
                  {!cat.isDefault && (
                    <button
                      className="p-2 rounded-lg transition-colors"
                      style={{ color: 'var(--muted)' }}
                      onClick={() => handleRequestDelete(cat.id)}
                      title="删除"
                    >
                      <Icon name="trash" size={16} />
                    </button>
                  )}
                </div>
              </div>

              {renderDeleteConfirm(cat)}
            </div>
          )
        })}

        {/* 新增分类编辑行 */}
        {isAddingNew && renderEditRow(null, true)}

        {/* 新增按钮 */}
        {!isAddingNew && (
          <button
            className="w-full flex items-center justify-center gap-2 p-5 rounded-xl text-sm transition-colors"
            style={{
              color: 'var(--accent)',
              backgroundColor: 'var(--bg-card)',
              lineHeight: '1.7',
            }}
            onClick={handleStartAdd}
          >
            <Icon name="plus" size={16} />
            <span>新增分类</span>
          </button>
        )}
      </div>
    </div>
  )
}

export default CategoryManager

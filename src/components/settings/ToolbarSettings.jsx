import { useState, useEffect } from 'react'
import Icon from '../ui/Icon'
import { getSetting, saveSetting } from '../../db/database'
import Collapsible from '../ui/Collapsible'
import { RECORD_TYPES } from '../../constants/types'
import { DEFAULT_DIARY_TOOLBAR, DEFAULT_NOTE_TOOLBAR, DEFAULT_WORDCLOUD_THRESHOLDS, DEFAULT_WRITE_PAGE_TYPES, DEFAULT_CALENDAR_MODE, DEFAULT_DOMINANT_EMOTION_PERIOD, DEFAULT_SHARE_CARD_CONFIG } from '../../constants/defaults'

const NOTE_TOOLBAR_VERSION = 2

const TOOLBAR_OPTIONS = [
  { id: 'undo', label: '撤销', group: '格式', render: () => <Icon name="undo" size={14} /> },
  { id: 'redo', label: '重做', group: '格式', render: () => <Icon name="redo" size={14} /> },
  { id: 'bold', label: '粗体', group: '格式', render: () => <span className="font-bold text-sm">B</span> },
  { id: 'italic', label: '斜体', group: '格式', render: () => <span className="italic text-sm">I</span> },
  { id: 'underline', label: '下划线', group: '格式', render: () => <span className="underline text-sm">U</span> },
  { id: 'strike', label: '删除线', group: '格式', render: () => <span className="line-through text-sm">S</span> },
  { id: 'highlight', label: '高亮', group: '格式', render: () => <Icon name="highlight" size={14} /> },
  { id: 'code', label: '行内代码', group: '格式', render: () => <Icon name="code" size={14} /> },
  { id: 'h1', label: '标题1', group: '标题', render: () => <span className="text-[11px] font-bold">H1</span> },
  { id: 'h2', label: '标题2', group: '标题', render: () => <span className="text-[11px] font-bold">H2</span> },
  { id: 'bulletList', label: '项目符号', group: '列表', render: () => <span className="text-base">•</span> },
  { id: 'orderedList', label: '编号列表', group: '列表', render: () => <span className="text-[11px] font-bold">1.</span> },
  { id: 'blockquote', label: '引用', group: '列表', render: () => <Icon name="quote" size={14} /> },
  { id: 'indent', label: '增加缩进', group: '缩进', render: () => <Icon name="indent-increase" size={14} /> },
  { id: 'outdent', label: '减少缩进', group: '缩进', render: () => <Icon name="indent-decrease" size={14} /> },
  { id: 'horizontalRule', label: '分割线', group: '缩进', render: () => <Icon name="horizontal-rule" size={14} /> },
  { id: 'image', label: '插入图片', group: '媒体', render: () => <Icon name="image" size={14} /> },
  { id: 'drawing', label: '画板', group: '媒体', render: () => <Icon name="pen" size={14} /> },
  { id: 'speech', label: '语音输入', group: '媒体', render: () => <Icon name="mic" size={14} /> },
  { id: 'time', label: '时间', group: '时间戳', render: () => <Icon name="clock" size={14} /> },
  { id: 'datetime', label: '日期+时间', group: '时间戳', render: () => <Icon name="calendar-clock" size={14} /> },
  { id: 'date', label: '日期', group: '时间戳', render: () => <Icon name="calendar" size={14} /> },
]

// 过滤已保存配置中的合法 ID；无保存配置时使用默认
function mergeConfig(saved, defaults) {
  if (!saved) return [...defaults]
  const validIds = TOOLBAR_OPTIONS.map(o => o.id)
  return saved.filter(id => validIds.includes(id))
}

function ToolbarSettings() {
  const [diaryToolbar, setDiaryToolbar] = useState(DEFAULT_DIARY_TOOLBAR)
  const [noteToolbar, setNoteToolbar] = useState(DEFAULT_NOTE_TOOLBAR)
  const [wordCloudThresholds, setWordCloudThresholds] = useState(DEFAULT_WORDCLOUD_THRESHOLDS)
  const [writePageTypes, setWritePageTypes] = useState(DEFAULT_WRITE_PAGE_TYPES)
  const [calendarMode, setCalendarMode] = useState(DEFAULT_CALENDAR_MODE)
  const [dominantEmotionPeriod, setDominantEmotionPeriod] = useState(DEFAULT_DOMINANT_EMOTION_PERIOD)
  const [shareCardConfig, setShareCardConfig] = useState(DEFAULT_SHARE_CARD_CONFIG)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    const version = await getSetting('noteToolbarVersion')
    if (version !== NOTE_TOOLBAR_VERSION) {
      await saveSetting('noteToolbar', DEFAULT_NOTE_TOOLBAR)
      await saveSetting('noteToolbarVersion', NOTE_TOOLBAR_VERSION)
      setNoteToolbar([...DEFAULT_NOTE_TOOLBAR])
      const diary = await getSetting('diaryToolbar')
      const mergedDiary = mergeConfig(diary, DEFAULT_DIARY_TOOLBAR)
      setDiaryToolbar(mergedDiary)
      if (diary) saveSetting('diaryToolbar', mergedDiary)
    } else {
      const diary = await getSetting('diaryToolbar')
      const note = await getSetting('noteToolbar')
      const mergedDiary = mergeConfig(diary, DEFAULT_DIARY_TOOLBAR)
      const mergedNote = mergeConfig(note, DEFAULT_NOTE_TOOLBAR)
      setDiaryToolbar(mergedDiary)
      setNoteToolbar(mergedNote)
    }
    const savedThresholds = await getSetting('wordCloudThresholds')
    if (savedThresholds) {
      setWordCloudThresholds({ ...DEFAULT_WORDCLOUD_THRESHOLDS, ...savedThresholds })
    }
    const savedWriteTypes = await getSetting('writePageTypes')
    if (savedWriteTypes && Array.isArray(savedWriteTypes) && savedWriteTypes.length > 0) {
      const validIds = RECORD_TYPES.map(t => t.id)
      const filtered = savedWriteTypes.filter(id => validIds.includes(id))
      if (filtered.length > 0) {
        setWritePageTypes(filtered)
      }
    }
    const savedCalendarMode = await getSetting('calendarMode')
    if (savedCalendarMode === 'simple' || savedCalendarMode === 'detailed') {
      setCalendarMode(savedCalendarMode)
    }
    const savedDominantPeriod = await getSetting('dominantEmotionPeriod')
    if (['week', 'month', 'year', 'all'].includes(savedDominantPeriod)) {
      setDominantEmotionPeriod(savedDominantPeriod)
    }
    const savedShareConfig = await getSetting('shareCardConfig')
    if (savedShareConfig) {
      setShareCardConfig({ ...DEFAULT_SHARE_CARD_CONFIG, ...savedShareConfig })
    }
  }

  const updateWordCloudThreshold = async (period, value) => {
    const numValue = Math.max(1, parseInt(value) || DEFAULT_WORDCLOUD_THRESHOLDS[period])
    const updated = { ...wordCloudThresholds, [period]: numValue }
    setWordCloudThresholds(updated)
    await saveSetting('wordCloudThresholds', updated)
    window.dispatchEvent(new CustomEvent('wordcloud-threshold-changed', { detail: updated }))
  }

  const resetWordCloudThresholds = async () => {
    setWordCloudThresholds(DEFAULT_WORDCLOUD_THRESHOLDS)
    await saveSetting('wordCloudThresholds', DEFAULT_WORDCLOUD_THRESHOLDS)
    window.dispatchEvent(new CustomEvent('wordcloud-threshold-changed', { detail: DEFAULT_WORDCLOUD_THRESHOLDS }))
  }

  const toggleWritePageType = async (typeId) => {
    let updated
    if (writePageTypes.includes(typeId)) {
      if (writePageTypes.length <= 1) return
      updated = writePageTypes.filter(id => id !== typeId)
    } else {
      const allIds = RECORD_TYPES.map(t => t.id)
      updated = allIds.filter(id => writePageTypes.includes(id) || id === typeId)
    }
    setWritePageTypes(updated)
    await saveSetting('writePageTypes', updated)
    window.dispatchEvent(new CustomEvent('writepage-types-changed', { detail: updated }))
  }

  const [dragIndex, setDragIndex] = useState(null)
  const [dragOverIndex, setDragOverIndex] = useState(null)

  const handleDragStart = (e, index) => {
    setDragIndex(index)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e, index) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverIndex !== index) {
      setDragOverIndex(index)
    }
  }

  const handleDrop = (e, dropIndex) => {
    e.preventDefault()
    if (dragIndex === null || dragIndex === dropIndex) {
      setDragIndex(null)
      setDragOverIndex(null)
      return
    }
    const updated = [...writePageTypes]
    const [dragged] = updated.splice(dragIndex, 1)
    updated.splice(dropIndex, 0, dragged)
    setWritePageTypes(updated)
    saveSetting('writePageTypes', updated)
    window.dispatchEvent(new CustomEvent('writepage-types-changed', { detail: updated }))
    setDragIndex(null)
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    setDragIndex(null)
    setDragOverIndex(null)
  }

  const resetWritePageTypes = async () => {
    setWritePageTypes(DEFAULT_WRITE_PAGE_TYPES)
    await saveSetting('writePageTypes', DEFAULT_WRITE_PAGE_TYPES)
    window.dispatchEvent(new CustomEvent('writepage-types-changed', { detail: DEFAULT_WRITE_PAGE_TYPES }))
  }

  const switchCalendarMode = async (mode) => {
    setCalendarMode(mode)
    await saveSetting('calendarMode', mode)
    window.dispatchEvent(new CustomEvent('calendar-mode-changed', { detail: mode }))
  }

  const switchDominantEmotionPeriod = async (period) => {
    setDominantEmotionPeriod(period)
    await saveSetting('dominantEmotionPeriod', period)
    window.dispatchEvent(new CustomEvent('dominant-emotion-period-changed', { detail: period }))
  }

  const toggleShareCardOption = async (key) => {
    const updated = { ...shareCardConfig, [key]: !shareCardConfig[key] }
    setShareCardConfig(updated)
    await saveSetting('shareCardConfig', updated)
  }

  const resetShareCardConfig = async () => {
    setShareCardConfig(DEFAULT_SHARE_CARD_CONFIG)
    await saveSetting('shareCardConfig', DEFAULT_SHARE_CARD_CONFIG)
  }

  const toggleItem = (type, id) => {
    const setter = type === 'diary' ? setDiaryToolbar : setNoteToolbar
    const current = type === 'diary' ? diaryToolbar : noteToolbar
    const updated = current.includes(id)
      ? current.filter(i => i !== id)
      : [...current, id]
    setter(updated)
    const key = type === 'diary' ? 'diaryToolbar' : 'noteToolbar'
    saveSetting(key, updated)
    window.dispatchEvent(new CustomEvent('toolbar-config-changed', { detail: { key, value: updated } }))
  }

  const resetToolbar = (type) => {
    const defaults = type === 'diary' ? DEFAULT_DIARY_TOOLBAR : DEFAULT_NOTE_TOOLBAR
    const setter = type === 'diary' ? setDiaryToolbar : setNoteToolbar
    setter(defaults)
    const key = type === 'diary' ? 'diaryToolbar' : 'noteToolbar'
    saveSetting(key, defaults)
    window.dispatchEvent(new CustomEvent('toolbar-config-changed', { detail: { key, value: defaults } }))
  }

  const renderToolbarConfig = (type, current) => {
    const groups = {}
    TOOLBAR_OPTIONS.forEach(opt => {
      if (!groups[opt.group]) groups[opt.group] = []
      groups[opt.group].push(opt)
    })

    return (
      <div className="space-y-3">
        {Object.entries(groups).map(([group, items]) => (
          <div key={group}>
            <div className="text-xs mb-2" style={{ color: 'var(--muted)' }}>{group}</div>
            <div className="flex flex-wrap gap-1.5">
              {items.map(item => {
                const enabled = current.includes(item.id)
                return (
                  <button
                    key={item.id}
                    onClick={() => toggleItem(type, item.id)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border transition-all duration-200"
                    style={{
                      borderColor: enabled ? 'var(--accent)' : 'var(--rule)',
                      backgroundColor: enabled ? 'var(--accent-light)' : 'transparent',
                      color: enabled ? 'var(--accent)' : 'var(--muted)',
                    }}
                  >
                    {item.render()}
                    <span>{item.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
        <button
          onClick={() => resetToolbar(type)}
          className="text-xs mt-2 px-3 py-1.5 rounded-lg border transition-colors duration-200"
          style={{ borderColor: 'var(--rule)', color: 'var(--muted)' }}
        >
          恢复默认
        </button>
      </div>
    )
  }

  return (
    <div>
      <h3 className="text-sm font-medium px-5 pt-5 pb-3" style={{ color: 'var(--ink)' }}>自定义</h3>
      <Collapsible title="工具栏设置" iconName="sliders" defaultOpen={false} buttonStyle={{ height: '48px' }}>
        <div className="space-y-4">
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            选择编辑器工具栏中显示的按钮，点击切换开关状态
          </p>
          <div>
            <div className="text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>随笔编辑器</div>
            {renderToolbarConfig('note', noteToolbar)}
          </div>
          <div>
            <div className="text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>日记编辑器</div>
            {renderToolbarConfig('diary', diaryToolbar)}
          </div>
        </div>
      </Collapsible>

      <Collapsible title="词云设置" iconName="tag" defaultOpen={false} buttonStyle={{ height: '48px' }}>
        <div className="space-y-4">
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            设置词云各时间段的最小出现频率，低于此值的词将不显示
          </p>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: 'var(--ink)' }}>3天</span>
              <input
                type="number"
                min="1"
                max="100"
                value={wordCloudThresholds['3days']}
                onChange={(e) => updateWordCloudThreshold('3days', e.target.value)}
                className="w-20 px-3 py-1.5 rounded-lg text-sm outline-none"
                style={{
                  backgroundColor: 'var(--bg)',
                  color: 'var(--ink)',
                  border: '1px solid var(--rule)',
                }}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: 'var(--ink)' }}>7天</span>
              <input
                type="number"
                min="1"
                max="100"
                value={wordCloudThresholds['7days']}
                onChange={(e) => updateWordCloudThreshold('7days', e.target.value)}
                className="w-20 px-3 py-1.5 rounded-lg text-sm outline-none"
                style={{
                  backgroundColor: 'var(--bg)',
                  color: 'var(--ink)',
                  border: '1px solid var(--rule)',
                }}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: 'var(--ink)' }}>30天</span>
              <input
                type="number"
                min="1"
                max="100"
                value={wordCloudThresholds['30days']}
                onChange={(e) => updateWordCloudThreshold('30days', e.target.value)}
                className="w-20 px-3 py-1.5 rounded-lg text-sm outline-none"
                style={{
                  backgroundColor: 'var(--bg)',
                  color: 'var(--ink)',
                  border: '1px solid var(--rule)',
                }}
              />
            </div>
          </div>
          <button
            onClick={resetWordCloudThresholds}
            className="text-xs mt-2 px-3 py-1.5 rounded-lg border transition-colors duration-200"
            style={{ borderColor: 'var(--rule)', color: 'var(--muted)' }}
          >
            恢复默认
          </button>
        </div>
      </Collapsible>

      <Collapsible title="编写页设置" iconName="edit" defaultOpen={false} buttonStyle={{ height: '48px' }}>
        <div className="space-y-4">
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            拖动已启用的类型调整顺序，点击开关显示/隐藏
          </p>
          <div className="space-y-2">
            <p className="text-xs" style={{ color: 'var(--muted)' }}>已启用</p>
            {writePageTypes.map((typeId, index) => {
              const type = RECORD_TYPES.find(t => t.id === typeId)
              if (!type) return null
              const isDragging = dragIndex === index
              const isOver = dragOverIndex === index && dragIndex !== index
              return (
                <div
                  key={type.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className="flex items-center gap-2 p-2.5 rounded-lg cursor-grab active:cursor-grabbing transition-all duration-150"
                  style={{
                    backgroundColor: isDragging ? 'var(--bg2)' : 'var(--bg)',
                    border: `1px solid ${type.color}40`,
                    opacity: isDragging ? 0.5 : 1,
                    transform: isDragging ? 'scale(1.02)' : 'scale(1)',
                    borderTop: isOver && dragIndex !== null && dragIndex > index ? `2px solid ${type.color}` : undefined,
                    borderBottom: isOver && dragIndex !== null && dragIndex < index ? `2px solid ${type.color}` : undefined,
                  }}
                >
                  <span className="flex-shrink-0" style={{ cursor: 'grab' }}>
                    <Icon name="grip-vertical" size={14} color="var(--muted)" strokeWidth={1.5} />
                  </span>
                  <span
                    className="flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0"
                    style={{ backgroundColor: type.color + '18' }}
                  >
                    <Icon name={type.iconName} size={14} color={type.color} strokeWidth={1.5} />
                  </span>
                  <span className="text-sm flex-1" style={{ color: 'var(--ink)' }}>{type.label}</span>
                  <button
                    onClick={() => toggleWritePageType(type.id)}
                    disabled={writePageTypes.length <= 1}
                    className="flex-shrink-0"
                    title="隐藏"
                  >
                    <span
                      className="block w-9 h-5 rounded-full transition-colors duration-200 relative"
                      style={{ backgroundColor: type.color }}
                    >
                      <span
                        className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all duration-200"
                        style={{ left: '18px' }}
                      />
                    </span>
                  </button>
                </div>
              )
            })}
          </div>
          <div className="space-y-2">
            {RECORD_TYPES.filter(t => !writePageTypes.includes(t.id)).length > 0 && (
              <p className="text-xs" style={{ color: 'var(--muted)' }}>未启用</p>
            )}
            {RECORD_TYPES.filter(t => !writePageTypes.includes(t.id)).map(type => (
              <div
                key={type.id}
                className="flex items-center gap-2 p-2.5 rounded-lg"
                style={{
                  backgroundColor: 'var(--bg2)',
                  border: `1px solid var(--rule)`,
                  opacity: 0.6,
                }}
              >
                <span className="flex-shrink-0 w-3.5" />
                <span
                  className="flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0"
                  style={{ backgroundColor: type.color + '18' }}
                >
                  <Icon name={type.iconName} size={14} color={type.color} strokeWidth={1.5} />
                </span>
                <span className="text-sm flex-1" style={{ color: 'var(--ink)' }}>{type.label}</span>
                <button
                  onClick={() => toggleWritePageType(type.id)}
                  className="flex-shrink-0"
                  title="显示"
                >
                  <span
                    className="block w-9 h-5 rounded-full transition-colors duration-200 relative"
                    style={{ backgroundColor: 'var(--rule)' }}
                  >
                    <span
                      className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all duration-200"
                      style={{ left: '2px' }}
                    />
                  </span>
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={resetWritePageTypes}
            className="text-xs mt-2 px-3 py-1.5 rounded-lg border transition-colors duration-200"
            style={{ borderColor: 'var(--rule)', color: 'var(--muted)' }}
          >
            恢复默认
          </button>
        </div>
      </Collapsible>

      <Collapsible title="日历显示" iconName="calendar" defaultOpen={false} buttonStyle={{ height: '48px' }}>
        <div className="space-y-3">
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            选择日历的显示模式
          </p>
          <div className="space-y-2">
            <button
              onClick={() => switchCalendarMode('simple')}
              className="w-full flex items-center gap-3 p-3 rounded-lg transition-all duration-200"
              style={{
                backgroundColor: calendarMode === 'simple' ? 'var(--accent)' + '0d' : 'var(--bg)',
                border: `1px solid ${calendarMode === 'simple' ? 'var(--accent)' : 'var(--rule)'}`,
              }}
            >
              <span
                className="flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0"
                style={{ backgroundColor: calendarMode === 'simple' ? 'var(--accent)' + '20' : 'var(--bg2)' }}
              >
                <Icon name="calendar" size={16} color={calendarMode === 'simple' ? 'var(--accent)' : 'var(--muted)'} strokeWidth={1.5} />
              </span>
              <div className="flex-1 text-left">
                <div className="text-sm font-medium" style={{ color: 'var(--ink)' }}>简洁模式</div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>仅显示日期数字</div>
              </div>
              {calendarMode === 'simple' && (
                <Icon name="check" size={16} color="var(--accent)" strokeWidth={2} />
              )}
            </button>
            <button
              onClick={() => switchCalendarMode('detailed')}
              className="w-full flex items-center gap-3 p-3 rounded-lg transition-all duration-200"
              style={{
                backgroundColor: calendarMode === 'detailed' ? 'var(--accent)' + '0d' : 'var(--bg)',
                border: `1px solid ${calendarMode === 'detailed' ? 'var(--accent)' : 'var(--rule)'}`,
              }}
            >
              <span
                className="flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0"
                style={{ backgroundColor: calendarMode === 'detailed' ? 'var(--accent)' + '20' : 'var(--bg2)' }}
              >
                <Icon name="calendar-clock" size={16} color={calendarMode === 'detailed' ? 'var(--accent)' : 'var(--muted)'} strokeWidth={1.5} />
              </span>
              <div className="flex-1 text-left">
                <div className="text-sm font-medium" style={{ color: 'var(--ink)' }}>详细模式</div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>显示农历、节日和节气</div>
              </div>
              {calendarMode === 'detailed' && (
                <Icon name="check" size={16} color="var(--accent)" strokeWidth={2} />
              )}
            </button>
          </div>
        </div>
      </Collapsible>

      <Collapsible title="主导情绪统计" iconName="mood" defaultOpen={false} buttonStyle={{ height: '48px' }}>
        <div className="space-y-3">
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            选择主导情绪卡片统计的时间范围
          </p>
          <div className="space-y-2">
            {[
              { value: 'week', label: '本周', desc: '统计本周内的情绪数据' },
              { value: 'month', label: '本月', desc: '统计本月内的情绪数据' },
              { value: 'year', label: '本年', desc: '统计本年内的情绪数据' },
              { value: 'all', label: '全部', desc: '统计所有记录的情绪数据' },
            ].map(option => (
              <button
                key={option.value}
                onClick={() => switchDominantEmotionPeriod(option.value)}
                className="w-full flex items-center gap-3 p-3 rounded-lg transition-all duration-200"
                style={{
                  backgroundColor: dominantEmotionPeriod === option.value ? 'var(--accent)' + '0d' : 'var(--bg)',
                  border: `1px solid ${dominantEmotionPeriod === option.value ? 'var(--accent)' : 'var(--rule)'}`,
                }}
              >
                <span
                  className="flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0"
                  style={{ backgroundColor: dominantEmotionPeriod === option.value ? 'var(--accent)' + '20' : 'var(--bg2)' }}
                >
                  <Icon name="mood" size={16} color={dominantEmotionPeriod === option.value ? 'var(--accent)' : 'var(--muted)'} strokeWidth={1.5} />
                </span>
                <div className="flex-1 text-left">
                  <div className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{option.label}</div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{option.desc}</div>
                </div>
                {dominantEmotionPeriod === option.value && (
                  <Icon name="check" size={16} color="var(--accent)" strokeWidth={2} />
                )}
              </button>
            ))}
          </div>
        </div>
      </Collapsible>

      <Collapsible title="分享卡片设置" iconName="share" defaultOpen={false} buttonStyle={{ height: '48px' }}>
        <div className="space-y-3">
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            自定义分享卡片上显示的元素
          </p>
          {[
            { key: 'showSlogan', label: '显示标语', desc: '记录生活，感知情绪' },
            { key: 'showWatermark', label: '显示软件水印', desc: '慧记 · AI 情绪日记' },
            { key: 'showDate', label: '显示日期', desc: '创建日期和星期' },
            { key: 'showCategory', label: '显示分类标签', desc: '随笔/心情/备忘/日记' },
          ].map(item => (
            <div
              key={item.key}
              className="flex items-center justify-between h-12 px-4 rounded-[8px]"
              style={{ backgroundColor: 'var(--bg)' }}
            >
              <div>
                <div className="text-sm" style={{ color: 'var(--ink)' }}>{item.label}</div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{item.desc}</div>
              </div>
              <button
                onClick={() => toggleShareCardOption(item.key)}
                className="flex-shrink-0"
              >
                <span
                  className="block w-11 h-6 rounded-full transition-colors duration-200 relative"
                  style={{ backgroundColor: shareCardConfig[item.key] ? 'var(--accent)' : 'var(--rule)' }}
                >
                  <span
                    className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all duration-200 shadow-sm"
                    style={{ left: shareCardConfig[item.key] ? '22px' : '2px' }}
                  />
                </span>
              </button>
            </div>
          ))}
          <button
            onClick={resetShareCardConfig}
            className="text-xs mt-2 px-3 py-1.5 rounded-lg border transition-colors duration-200"
            style={{ borderColor: 'var(--rule)', color: 'var(--muted)' }}
          >
            恢复默认
          </button>
        </div>
      </Collapsible>
    </div>
  )
}

export default ToolbarSettings

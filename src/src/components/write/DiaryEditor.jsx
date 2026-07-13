import { useState, useEffect, useCallback } from 'react'
import { EditorContent } from '@tiptap/react'
import Icon from '../ui/Icon'
import { useEditorRecord } from '../../hooks/useEditorRecord'
import DrawingBoard from './DrawingBoard'
import { PRESET_TAGS, ACTIVITY_TAGS, getTagColor } from '../../constants/tags'
import { isSpeechSupported } from '../../utils/speech'
import { getRecordType } from '../../constants/types'
import { calculateStreak, stripHtml } from '../../utils/recordHelpers'
import { getAllRecords, getSetting } from '../../db/database'
import { isMobileDevice } from '../../utils/device'
import { useKeyboardHeight } from '../../hooks/useKeyboardHeight'

const WEATHER_OPTIONS = [
  { name: '晴', iconName: 'weather-sun' },
  { name: '多云', iconName: 'weather-partly-cloudy' },
  { name: '阴', iconName: 'weather-overcast' },
  { name: '小雨', iconName: 'weather-rain' },
  { name: '大雨', iconName: 'weather-storm' },
  { name: '雪', iconName: 'weather-snow' },
  { name: '雾', iconName: 'weather-fog' },
  { name: '风', iconName: 'weather-wind' },
]

const LOCATION_OPTIONS = [
  '家', '学校', '公司', '咖啡馆', '公园', '图书馆', '商场', '健身房',
  '餐厅', '旅途中', '医院', '其他地点'
]

function DiaryEditor({ customDate, setCustomDate, editRecord, onSaved, type = 'diary' }) {
  const [editingImage, setEditingImage] = useState(null) // { pos, src, source, original, drawing }
  const handleImageClick = useCallback((info) => setEditingImage(info), [])

  const {
    editor, effectiveDate, formatDate,
    saveStatus, saving, save, getStatusText,
    title, setTitle,
    tags, setTags, tagsArray, toggleTag, removeTag, recentTags,
    weather, setWeather, location, setLocation, activities, setActivities,
    isRecording, toggleRecording, addImage, handleImageUpload,
    insertDrawing, updateImageAt, fileInputRef,
  } = useEditorRecord({
    recordType: 'diary',
    editRecord,
    customDate,
    onSaved,
    onImageClick: handleImageClick,
  })

  const [showDrawingBoard, setShowDrawingBoard] = useState(false)
  const [showTagPicker, setShowTagPicker] = useState(false)
  const [showActivityPicker, setShowActivityPicker] = useState(false)
  const [showCustomTagInput, setShowCustomTagInput] = useState(false)
  const [customTagText, setCustomTagText] = useState('')
  const [showWeatherPicker, setShowWeatherPicker] = useState(false)
  const [showLocationPicker, setShowLocationPicker] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [dayCount, setDayCount] = useState(1)
  const [isMobile, setIsMobile] = useState(() => isMobileDevice() || window.innerWidth < 768)
  const [toolbarConfig, setToolbarConfig] = useState(['bold', 'italic', 'underline', 'strike', 'h1', 'h2', 'bulletList', 'orderedList', 'indent', 'outdent', 'image', 'speech', 'drawing', 'time', 'datetime', 'date'])
  const { isKeyboardVisible, keyboardHeight } = useKeyboardHeight()

  const loadToolbarConfig = async () => {
    const config = await getSetting('diaryToolbar')
    if (config) {
      setToolbarConfig(config)
    }
  }

  useEffect(() => {
    loadToolbarConfig()
    const handler = (e) => {
      if (e.detail?.key === 'diaryToolbar') loadToolbarConfig()
    }
    window.addEventListener('toolbar-config-changed', handler)
    return () => window.removeEventListener('toolbar-config-changed', handler)
  }, [])

  useEffect(() => {
    const checkMobile = () => setIsMobile(isMobileDevice() || window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const ToolButton = ({ onClick, active, children, title }) => (
    <button
      onClick={onClick}
      title={title}
      className="w-7 h-7 flex items-center justify-center rounded-[5px] transition-colors duration-200 flex-shrink-0"
      style={{
        color: active ? 'var(--accent)' : 'var(--muted)',
        backgroundColor: active ? 'var(--accent-light)' : 'transparent',
      }}
    >
      {children}
    </button>
  )

  const insertTimestamp = (format) => {
    if (!editor) return
    const now = new Date()
    const pad = (n) => String(n).padStart(2, '0')
    const yyyy = now.getFullYear()
    const mm = pad(now.getMonth() + 1)
    const dd = pad(now.getDate())
    const hh = pad(now.getHours())
    const mi = pad(now.getMinutes())
    let text = ''
    if (format === 'time') text = `[${hh}:${mi}]`
    else if (format === 'datetime') text = `[${yyyy}-${mm}-${dd} ${hh}:${mi}]`
    else if (format === 'date') text = `[${yyyy}-${mm}-${dd}]`
    editor.chain().focus().insertContent(text).run()
  }

  const renderToolbarButtons = useCallback(() => {
    if (!editor || !toolbarConfig) return null
    const tc = toolbarConfig
    const btns = []
    const has = (id) => tc.includes(id)
    const push = (id, el) => { if (has(id)) btns.push(el) }

    push('bold', <ToolButton key="bold" onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="粗体"><span className="font-bold text-[13px]">B</span></ToolButton>)
    push('italic', <ToolButton key="italic" onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="斜体"><span className="italic text-[13px]">I</span></ToolButton>)
    push('underline', <ToolButton key="underline" onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="下划线"><span className="underline text-[13px]">U</span></ToolButton>)
    push('strike', <ToolButton key="strike" onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="删除线"><span className="line-through text-[13px]">S</span></ToolButton>)
    push('highlight', <ToolButton key="highlight" onClick={() => editor.chain().focus().toggleHighlight().run()} active={editor.isActive('highlight')} title="高亮"><Icon name="highlight" size={16} /></ToolButton>)
    push('code', <ToolButton key="code" onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} title="行内代码"><Icon name="code" size={16} /></ToolButton>)
    push('h1', <ToolButton key="h1" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="标题1"><span className="text-[11px] font-bold">H1</span></ToolButton>)
    push('h2', <ToolButton key="h2" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="标题2"><span className="text-[11px] font-bold">H2</span></ToolButton>)
    push('bulletList', <ToolButton key="bulletList" onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="项目符号"><span className="text-sm">•</span></ToolButton>)
    push('orderedList', <ToolButton key="orderedList" onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="编号列表"><span className="text-[11px] font-bold">1.</span></ToolButton>)
    push('blockquote', <ToolButton key="blockquote" onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="引用"><Icon name="quote" size={16} /></ToolButton>)
    push('indent', <ToolButton key="indent" onClick={() => editor.chain().focus().indentParagraph().run()} title="增加缩进"><Icon name="indent-increase" size={16} /></ToolButton>)
    push('outdent', <ToolButton key="outdent" onClick={() => editor.chain().focus().outdentParagraph().run()} title="减少缩进"><Icon name="indent-decrease" size={16} /></ToolButton>)
    push('horizontalRule', <ToolButton key="horizontalRule" onClick={() => editor.chain().focus().setHorizontalRule().run()} title="分割线"><Icon name="horizontal-rule" size={16} /></ToolButton>)
    push('image', <ToolButton key="image" onClick={addImage} title="插入图片"><Icon name="image" size={16} /></ToolButton>)
    push('undo', <ToolButton key="undo" onClick={() => editor.chain().focus().undo().run()} title="撤销"><Icon name="undo" size={16} /></ToolButton>)
    push('redo', <ToolButton key="redo" onClick={() => editor.chain().focus().redo().run()} title="重做"><Icon name="redo" size={16} /></ToolButton>)

    const rightBtns = []
    if (has('speech') && isSpeechSupported() && !isMobileDevice()) {
      rightBtns.push(<ToolButton key="speech" onClick={toggleRecording} title={isRecording ? '停止录音' : '语音输入'}>
        <span className={isRecording ? 'inline-flex animate-pulse' : 'inline-flex'}>
          <Icon name="mic" size={16} color={isRecording ? '#ef4444' : undefined} strokeWidth={1.5} />
        </span>
      </ToolButton>)
    }
    if (has('drawing')) rightBtns.push(<ToolButton key="drawing" onClick={() => setShowDrawingBoard(true)} title="画板"><Icon name="pen" size={16} strokeWidth={1.5} /></ToolButton>)
    if (has('time')) rightBtns.push(<ToolButton key="time" onClick={() => insertTimestamp('time')} title="插入时间"><Icon name="clock" size={16} /></ToolButton>)
    if (has('datetime')) rightBtns.push(<ToolButton key="datetime" onClick={() => insertTimestamp('datetime')} title="插入日期+时间"><Icon name="calendar-clock" size={16} /></ToolButton>)
    if (has('date')) rightBtns.push(<ToolButton key="date" onClick={() => insertTimestamp('date')} title="插入日期"><Icon name="calendar" size={16} /></ToolButton>)

    return { left: btns, right: rightBtns }
  }, [editor, toolbarConfig, isRecording, isSpeechSupported, toggleRecording, addImage, insertTimestamp, setShowDrawingBoard])

  useEffect(() => {
    const calcDays = async () => {
      try {
        const allRecords = await getAllRecords()
        const streak = calculateStreak(allRecords)
        setDayCount(streak > 0 ? streak : 1)
      } catch {
        setDayCount(1)
      }
    }
    calcDays()
  }, [])

  return (
    <div className="w-full animate-fade-in">
      {/* 日期标题栏 - 仅桌面端显示，移动端日期选择器在顶部栏 */}
      <div className="mb-4 md:mb-6 hidden md:block">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowDatePicker(!showDatePicker)}
            className="flex items-center gap-1.5 text-[18px] font-semibold transition-opacity hover:opacity-70"
            style={{ color: 'var(--ink-strong)' }}
          >
            {formatDate()}
            <Icon name={showDatePicker ? 'chevron-up' : 'chevron-down'} size={16} color="var(--muted)" strokeWidth={1.5} />
          </button>
          {type === 'diary' && (
            <span className="text-[13px] px-3 py-1.5 rounded-[6px] font-medium" style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}>
              第 {dayCount} 天
            </span>
          )}
        </div>
        {/* 内联日期选择器 */}
        {showDatePicker && (
          <div
            className="mt-3 p-4 rounded-xl animate-slide-down"
            style={{ backgroundColor: 'var(--bg2)', border: '1px solid var(--rule)' }}
          >
            <input
              type="date"
              defaultValue={effectiveDate.toISOString().split('T')[0]}
              onChange={(e) => {
                if (e.target.value && setCustomDate) {
                  const newDate = new Date(e.target.value)
                  newDate.setHours(10, 0, 0, 0)
                  setCustomDate(newDate)
                }
              }}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{
                backgroundColor: 'var(--bg)',
                color: 'var(--ink)',
                border: '1px solid var(--rule)',
              }}
            />
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => {
                  if (setCustomDate) {
                    const today = new Date()
                    today.setHours(10, 0, 0, 0)
                    setCustomDate(today)
                  }
                  setShowDatePicker(false)
                }}
                className="flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                style={{
                  backgroundColor: 'var(--bg)',
                  color: 'var(--ink)',
                  border: '1px solid var(--rule)',
                }}
              >
                今天
              </button>
              <button
                onClick={() => setShowDatePicker(false)}
                className="flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                style={{
                  backgroundColor: 'var(--accent)',
                  color: 'white',
                }}
              >
                确认
              </button>
            </div>
          </div>
        )}
          {/* 桌面端：天气地点显示在标题下方 */}
          <div className="hidden md:flex items-center gap-2 mt-1">
            {type === 'diary' && (
              <>
                <button
                  onClick={() => {
                    setShowWeatherPicker(!showWeatherPicker)
                    setShowLocationPicker(false)
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 h-7 rounded-[6px] text-[13px] transition-colors duration-200"
                  style={{
                    color: weather ? 'var(--ink)' : 'var(--muted)',
                    backgroundColor: weather ? 'var(--accent-light)' : 'var(--bg2)',
                  }}
                >
                  {weather ? (
                    <>
                      <Icon name={WEATHER_OPTIONS.find(w => w.name === weather)?.iconName} size={18} color="var(--accent)" strokeWidth={1.5} />
                      <span>{weather}</span>
                    </>
                  ) : (
                    <>
                      <Icon name="weather-sun" size={18} color="var(--muted)" />
                      <span>添加天气</span>
                    </>
                  )}
                </button>

                <span style={{ color: 'var(--rule)' }}>·</span>
                <button
                  onClick={() => {
                    setShowLocationPicker(!showLocationPicker)
                    setShowWeatherPicker(false)
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 h-7 rounded-[6px] text-[13px] transition-colors duration-200"
                  style={{
                    color: location ? 'var(--ink)' : 'var(--muted)',
                    backgroundColor: location ? 'var(--accent-light)' : 'var(--bg2)',
                  }}
                >
                  <Icon name="location" size={16} color={location ? 'var(--accent)' : 'var(--muted)'} />
                  <span>{location || '添加地点'}</span>
                </button>
              </>
            )}
          </div>
      </div>

      {/* 桌面端天气选择展开 */}
      {type === 'diary' && showWeatherPicker && (
        <div className="hidden md:flex flex-wrap gap-1.5 mb-4 w-56 animate-fade-in">
          {WEATHER_OPTIONS.map((w, i) => (
            <button
              key={i}
              onClick={() => {
                setWeather(weather === w.name ? '' : w.name)
                setShowWeatherPicker(false)
              }}
              className="inline-flex items-center gap-1 px-3 py-1.5 h-7 rounded-[6px] text-[13px] transition-colors duration-200"
              style={{
                backgroundColor: weather === w.name ? 'var(--accent)' : 'var(--bg2)',
                color: weather === w.name ? 'white' : 'var(--ink)',
              }}
            >
              <Icon name={w.iconName} size={18} color={weather === w.name ? 'white' : 'var(--ink)'} strokeWidth={1.5} />
              <span>{w.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* 桌面端地点选择展开 */}
      {type === 'diary' && showLocationPicker && (
        <div className="hidden md:flex flex-wrap gap-1.5 mb-4 w-56 animate-fade-in">
          {LOCATION_OPTIONS.map((loc, i) => (
            <button
              key={i}
              onClick={() => {
                setLocation(location === loc ? '' : loc)
                setShowLocationPicker(false)
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs transition-colors duration-200"
              style={{
                backgroundColor: location === loc ? 'var(--accent)' : 'var(--bg)',
                color: location === loc ? 'white' : 'var(--ink)',
              }}
            >
              <Icon name="location" size={12} color={location === loc ? 'white' : 'var(--ink)'} />
              <span>{loc}</span>
            </button>
          ))}
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') setShowLocationPicker(false) }}
            placeholder="自定义"
            className="px-2.5 py-1 rounded-lg text-xs outline-none bg-transparent flex-1 min-w-[80px]"
            style={{ color: 'var(--ink)', borderBottom: '1px solid var(--rule)' }}
          />
        </div>
      )}

      {/* 桌面端：左右分栏布局 */}
      {!isMobile && (
        <div className="flex gap-6">
        {/* 左栏：今日速览 */}
        <div className="w-[35%] flex-shrink-0">
          <TodayOverview customDate={effectiveDate} />
        </div>

        {/* 右栏：编辑器 */}
        <div className="flex-1 min-w-0">
          <div className="huiji-card relative overflow-hidden">
            {/* 标题输入 */}
            <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--rule)' }}>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="添加标题（可选）"
                className="w-full px-3 py-2 rounded-lg text-lg outline-none transition-colors duration-200"
                style={{
                  backgroundColor: 'var(--bg)',
                  color: 'var(--ink)',
                  border: '1px solid var(--rule)',
                  fontSize: '18px',
                  fontWeight: '500',
                }}
              />
            </div>

            {/* 工具栏 */}
            <div
              className="flex items-center gap-0.5 px-2 h-10 border-b overflow-x-auto editor-toolbar-sticky"
              style={{ borderColor: 'var(--rule)' }}
            >
              {renderToolbarButtons()?.left}
              <div className="flex-1" />
              {renderToolbarButtons()?.right}
            </div>

            {/* TipTap 编辑器内容区 */}
            <div className="relative z-10 p-6 min-h-[300px]">
              <EditorContent editor={editor} />
            </div>

            {/* 标签 + 习惯活动输入 */}
            <div className="relative z-10 px-6 pb-6" style={{ borderTop: '1px solid var(--rule)' }}>
              <div className="flex items-center gap-4 pt-4 mb-3">
                {/* 标签 */}
                <button
                  onClick={() => {
                    setShowTagPicker(!showTagPicker)
                    setShowActivityPicker(false)
                  }}
                  className="flex items-center gap-2 transition-colors duration-200"
                  style={{ color: showTagPicker ? 'var(--accent)' : 'var(--muted)' }}
                >
                  <Icon name="tag" size={14} color={showTagPicker ? 'var(--accent)' : 'var(--muted)'} />
                  <Icon name={showTagPicker ? 'chevron-up' : 'chevron-down'} size={12} color={showTagPicker ? 'var(--accent)' : 'var(--muted)'} />
                </button>

                {/* 习惯活动 - 仅日记类型 */}
                {type === 'diary' && (
                  <button
                    onClick={() => {
                      setShowActivityPicker(!showActivityPicker)
                      setShowTagPicker(false)
                    }}
                    className="flex items-center gap-2 transition-colors duration-200"
                    style={{ color: showActivityPicker ? 'var(--accent)' : 'var(--muted)' }}
                  >
                    <Icon name="fire" size={14} color={showActivityPicker ? 'var(--accent)' : 'var(--muted)'} />
                    <Icon name={showActivityPicker ? 'chevron-up' : 'chevron-down'} size={12} color={showActivityPicker ? 'var(--accent)' : 'var(--muted)'} />
                  </button>
                )}
              </div>

              {tagsArray.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {tagsArray.map((tag, i) => {
                    const color = getTagColor(tag)
                    const iconName = (PRESET_TAGS.find(t => t.name === tag))?.iconName || 'tag'
                    return (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium group transition-colors duration-200"
                        style={{ backgroundColor: color + '20', color: color, border: `1px solid ${color}40` }}
                      >
                        <Icon name={iconName} size={12} color={color} strokeWidth={1.5} />
                        <span>#{tag}</span>
                        <button onClick={() => removeTag(tag)} className="ml-1 opacity-60 hover:opacity-100 transition-opacity">
                          <Icon name="close" size={12} color={color} />
                        </button>
                      </span>
                    )
                  })}
                </div>
              )}

              {showTagPicker && (
                <div className="mb-3 animate-fade-in">
                  {recentTags.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs mb-2" style={{ color: 'var(--muted)' }}>最近使用</p>
                      <div className="flex flex-wrap gap-1.5">
                        {recentTags.map((tag, i) => {
                          const color = getTagColor(tag)
                          const selected = tagsArray.includes(tag)
                          return (
                            <button
                              key={i}
                              onClick={() => toggleTag(tag)}
                              className="px-2.5 py-1 rounded-full text-xs transition-colors duration-200"
                              style={{
                                backgroundColor: selected ? color : color + '15',
                                color: selected ? 'white' : color,
                                border: selected ? `1px solid ${color}` : `1px solid ${color}30`,
                              }}
                            >
                              #{tag}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  <div>
                    <p className="text-xs mb-2" style={{ color: 'var(--muted)' }}>推荐标签</p>
                    <div className="flex flex-wrap gap-1.5">
                      {PRESET_TAGS.slice(0, 12).map((tag, i) => {
                        const selected = tagsArray.includes(tag.name)
                        return (
                          <button
                            key={i}
                            onClick={() => toggleTag(tag.name)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs transition-colors duration-200"
                            style={{
                              backgroundColor: selected ? tag.color : tag.color + '15',
                              color: selected ? 'white' : tag.color,
                              border: selected ? `1px solid ${tag.color}` : `1px solid ${tag.color}30`,
                            }}
                          >
                            <Icon name={tag.iconName} size={12} color={selected ? 'white' : tag.color} strokeWidth={1.5} />
                            <span>#{tag.name}</span>
                          </button>
                        )
                      })}
                      {/* 自定义标签按钮 */}
                      {!showCustomTagInput ? (
                        <button
                          onClick={() => {
                            setShowCustomTagInput(true)
                            setCustomTagText('')
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs transition-colors duration-200"
                          style={{
                            backgroundColor: 'var(--bg2)',
                            color: 'var(--muted)',
                            border: '1px solid var(--rule)',
                          }}
                        >
                          <Icon name="plus" size={12} color="var(--muted)" strokeWidth={2} />
                          <span>自定义</span>
                        </button>
                      ) : (
                        <input
                          type="text"
                          value={customTagText}
                          onChange={(e) => setCustomTagText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && customTagText.trim()) {
                              toggleTag(customTagText.trim())
                              setCustomTagText('')
                              setShowCustomTagInput(false)
                            }
                          }}
                          onBlur={() => {
                            if (customTagText.trim()) {
                              toggleTag(customTagText.trim())
                            }
                            setCustomTagText('')
                            setShowCustomTagInput(false)
                          }}
                          autoFocus
                          placeholder="输入标签..."
                          className="px-2.5 py-1 rounded-full text-xs outline-none"
                          style={{
                            backgroundColor: 'var(--bg)',
                            color: 'var(--ink)',
                            border: '1px solid var(--accent)',
                          }}
                        />
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* 习惯活动选择器 */}
              {type === 'diary' && showActivityPicker && (
                <div className="mt-3 animate-fade-in">
                  <div className="flex flex-wrap gap-1.5">
                    {ACTIVITY_TAGS.map(activity => {
                      const isSelected = activities.includes(activity.name)
                      return (
                        <button
                          key={activity.name}
                          onClick={() => {
                            if (isSelected) {
                              setActivities(activities.filter(a => a !== activity.name))
                            } else {
                              setActivities([...activities, activity.name])
                            }
                          }}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors duration-200 flex items-center gap-1"
                          style={{
                            backgroundColor: isSelected ? activity.color : 'transparent',
                            color: isSelected ? 'white' : activity.color,
                            border: `1px solid ${isSelected ? activity.color : activity.color + '40'}`,
                          }}
                        >
                          <Icon name={activity.iconName} size={14} color={isSelected ? 'white' : activity.color} strokeWidth={1.5} />
                          <span>{activity.name}</span>
                        </button>
                      )
                    })}
                  </div>
                  {activities.length > 0 && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs" style={{ color: 'var(--muted)' }}>
                        已选 {activities.length} 项
                      </span>
                      <button
                        onClick={() => setActivities([])}
                        className="text-xs px-2 py-0.5 rounded transition-all duration-200"
                        style={{ 
                          backgroundColor: 'rgba(239, 68, 68, 0.1)', 
                          color: '#ef4444' 
                        }}
                      >
                        清除
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 底部保存栏 */}
            <div className="flex items-center justify-between px-6 py-4 border-t" style={{ borderColor: 'var(--rule)' }}>
              <span className="huiji-caption-secondary">
                {getStatusText()}
              </span>
              <button
                onClick={save}
                disabled={saving}
                className="w-12 h-9 rounded-[6px] transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                style={{ backgroundColor: 'var(--accent)', color: 'white' }}
                title={saving ? '保存中...' : saveStatus === 'saved' ? '已保存' : '保存'}
              >
                <Icon name="save" size={16} color="white" />
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

      {/* 手机端：单列布局 */}
      {isMobile && (
        <div>
        {/* 今日速览 */}
        <div className="mb-4">
          <TodayOverview customDate={effectiveDate} />
        </div>

        {/* 编辑器卡片 */}
        <div className="huiji-card relative overflow-hidden" style={isKeyboardVisible ? { paddingBottom: '50px' } : {}}>
          {/* 天气地点栏 */}
          {type === 'diary' && (
            <div className="px-4 pt-3 pb-2 border-b" style={{ borderColor: 'var(--rule)' }}>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => {
                    setShowWeatherPicker(!showWeatherPicker)
                    setShowLocationPicker(false)
                  }}
                  className="inline-flex items-center gap-1 h-8 text-[13px] transition-colors duration-200"
                  style={{
                    color: weather ? 'var(--accent)' : 'var(--muted)',
                  }}
                >
                  {weather ? (
                    <>
                      <Icon name={WEATHER_OPTIONS.find(w => w.name === weather)?.iconName} size={16} color="var(--accent)" strokeWidth={1.5} />
                      <span>{weather}</span>
                    </>
                  ) : (
                    <>
                      <Icon name="weather-sun" size={16} color="var(--muted)" />
                      <span>天气</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => {
                    setShowLocationPicker(!showLocationPicker)
                    setShowWeatherPicker(false)
                  }}
                  className="inline-flex items-center gap-1 h-8 text-[13px] transition-colors duration-200"
                  style={{
                    color: location ? 'var(--accent)' : 'var(--muted)',
                  }}
                >
                  <Icon name="location" size={14} color={location ? 'var(--accent)' : 'var(--muted)'} />
                  <span>{location || '地点'}</span>
                </button>
              </div>

              {/* 天气选择展开 */}
              {showWeatherPicker && (
                <div className="flex flex-wrap gap-1.5 mt-3 animate-fade-in">
                  {WEATHER_OPTIONS.map((w, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setWeather(weather === w.name ? '' : w.name)
                        setShowWeatherPicker(false)
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 h-8 rounded-[6px] text-[13px] transition-colors duration-200"
                      style={{
                        backgroundColor: weather === w.name ? 'var(--accent)' : 'var(--bg2)',
                        color: weather === w.name ? 'white' : 'var(--ink)',
                      }}
                    >
                      <Icon name={w.iconName} size={16} color={weather === w.name ? 'white' : 'var(--ink)'} strokeWidth={1.5} />
                      <span>{w.name}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* 地点选择展开 */}
              {showLocationPicker && (
                <div className="flex flex-wrap gap-1.5 mt-3 animate-fade-in">
                  {LOCATION_OPTIONS.slice(0, 8).map((loc, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setLocation(location === loc ? '' : loc)
                        setShowLocationPicker(false)
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs transition-colors duration-200"
                      style={{
                        backgroundColor: location === loc ? 'var(--accent)' : 'var(--bg)',
                        color: location === loc ? 'white' : 'var(--ink)',
                      }}
                    >
                      <Icon name="location" size={12} color={location === loc ? 'white' : 'var(--ink)'} />
                      <span>{loc}</span>
                    </button>
                  ))}
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') setShowLocationPicker(false) }}
                    placeholder="自定义"
                    className="px-2.5 py-1 rounded-lg text-xs outline-none bg-transparent flex-1 min-w-[80px]"
                    style={{ color: 'var(--ink)', borderBottom: '1px solid var(--rule)' }}
                  />
                </div>
              )}
            </div>
          )}

          {/* 标题输入 */}
          <div className="px-4 pt-5 pb-4 border-b" style={{ borderColor: 'var(--rule)' }}>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="添加标题（可选）"
              className="w-full px-3 py-2 rounded-lg text-lg outline-none transition-colors duration-200"
              style={{
                backgroundColor: 'var(--bg)',
                color: 'var(--ink)',
                border: '1px solid var(--rule)',
                fontSize: '18px',
                fontWeight: '500',
              }}
            />
          </div>

          {/* 工具栏 - 键盘未弹出时显示在顶部 */}
          {!isKeyboardVisible && (
            <div
              className="flex items-center gap-0.5 px-2 h-10 border-b overflow-x-auto"
              style={{ borderColor: 'var(--rule)' }}
            >
              {renderToolbarButtons()?.left}
              <div className="flex-1" />
              {renderToolbarButtons()?.right}
            </div>
          )}

          {/* 编辑器内容区 */}
          <div className="relative z-10 px-4 py-4 min-h-[200px]">
            <EditorContent editor={editor} />
          </div>

          {/* 标签 + 习惯活动输入 */}
          <div className="relative z-10 px-4 pb-4" style={{ borderTop: '1px solid var(--rule)' }}>
            <div className="flex items-center gap-4 pt-3 mb-2">
              {/* 标签 */}
              <button
                onClick={() => {
                  setShowTagPicker(!showTagPicker)
                  setShowActivityPicker(false)
                }}
                className="flex items-center gap-2 transition-colors duration-200"
                style={{ color: showTagPicker ? 'var(--accent)' : 'var(--muted)' }}
              >
                <Icon name="tag" size={14} color={showTagPicker ? 'var(--accent)' : 'var(--muted)'} />
                <Icon name={showTagPicker ? 'chevron-up' : 'chevron-down'} size={12} color={showTagPicker ? 'var(--accent)' : 'var(--muted)'} />
              </button>

              {/* 习惯活动 - 仅日记类型 */}
              {type === 'diary' && (
                <button
                  onClick={() => {
                    setShowActivityPicker(!showActivityPicker)
                    setShowTagPicker(false)
                  }}
                  className="flex items-center gap-2 transition-colors duration-200"
                  style={{ color: showActivityPicker ? 'var(--accent)' : 'var(--muted)' }}
                >
                  <Icon name="fire" size={14} color={showActivityPicker ? 'var(--accent)' : 'var(--muted)'} />
                  <Icon name={showActivityPicker ? 'chevron-up' : 'chevron-down'} size={12} color={showActivityPicker ? 'var(--accent)' : 'var(--muted)'} />
                </button>
              )}
            </div>

            {tagsArray.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {tagsArray.map((tag, i) => {
                  const color = getTagColor(tag)
                  const iconName = (PRESET_TAGS.find(t => t.name === tag))?.iconName || 'tag'
                  return (
                    <span
                      key={i}
                      className="inline-flex items-center gap-0.5 px-2 py-1 rounded-full text-[11px] font-medium group transition-colors duration-200"
                      style={{ backgroundColor: color + '20', color: color, border: `1px solid ${color}40` }}
                    >
                      <Icon name={iconName} size={10} color={color} strokeWidth={1.5} />
                      <span>#{tag}</span>
                      <button onClick={() => removeTag(tag)} className="ml-0.5 opacity-60 hover:opacity-100 transition-opacity">
                        <Icon name="close" size={10} color={color} />
                      </button>
                    </span>
                  )
                })}
              </div>
            )}

            {showTagPicker && (
              <div className="mb-2 animate-fade-in">
                {recentTags.length > 0 && (
                  <div className="mb-2">
                    <p className="text-[11px] mb-1.5" style={{ color: 'var(--muted)' }}>最近</p>
                    <div className="flex flex-wrap gap-1">
                      {recentTags.slice(0, 8).map((tag, i) => {
                        const color = getTagColor(tag)
                        const selected = tagsArray.includes(tag)
                        return (
                          <button
                            key={i}
                            onClick={() => toggleTag(tag)}
                            className="px-2 py-0.5 rounded-full text-[11px] transition-colors duration-200"
                            style={{
                              backgroundColor: selected ? color : color + '15',
                              color: selected ? 'white' : color,
                              border: selected ? `1px solid ${color}` : `1px solid ${color}30`,
                            }}
                          >
                            #{tag}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-[11px] mb-1.5" style={{ color: 'var(--muted)' }}>推荐</p>
                  <div className="flex flex-wrap gap-1">
                    {PRESET_TAGS.slice(0, 8).map((tag, i) => {
                      const selected = tagsArray.includes(tag.name)
                      return (
                        <button
                          key={i}
                          onClick={() => toggleTag(tag.name)}
                          className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] transition-colors duration-200"
                          style={{
                            backgroundColor: selected ? tag.color : tag.color + '15',
                            color: selected ? 'white' : tag.color,
                            border: selected ? `1px solid ${tag.color}` : `1px solid ${tag.color}30`,
                          }}
                        >
                          <Icon name={tag.iconName} size={10} color={selected ? 'white' : tag.color} strokeWidth={1.5} />
                          <span>#{tag.name}</span>
                        </button>
                      )
                    })}
                    {!showCustomTagInput ? (
                      <button
                        onClick={() => {
                          setShowCustomTagInput(true)
                          setCustomTagText('')
                        }}
                        className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] transition-colors duration-200"
                        style={{
                          backgroundColor: 'var(--bg2)',
                          color: 'var(--muted)',
                          border: '1px solid var(--rule)',
                        }}
                      >
                        <Icon name="plus" size={10} color="var(--muted)" strokeWidth={2} />
                        <span>自定义</span>
                      </button>
                    ) : (
                      <input
                        type="text"
                        value={customTagText}
                        onChange={(e) => setCustomTagText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && customTagText.trim()) {
                            toggleTag(customTagText.trim())
                            setCustomTagText('')
                            setShowCustomTagInput(false)
                          }
                        }}
                        onBlur={() => {
                          if (customTagText.trim()) {
                            toggleTag(customTagText.trim())
                          }
                          setCustomTagText('')
                          setShowCustomTagInput(false)
                        }}
                        autoFocus
                        placeholder="输入标签..."
                        className="px-2 py-0.5 rounded-full text-[11px] outline-none"
                        style={{
                          backgroundColor: 'var(--bg)',
                          color: 'var(--ink)',
                          border: '1px solid var(--accent)',
                        }}
                      />
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 习惯活动选择器 */}
            {type === 'diary' && showActivityPicker && (
              <div className="mt-2 animate-fade-in">
                <div className="flex flex-wrap gap-1.5">
                  {ACTIVITY_TAGS.map(activity => {
                    const isSelected = activities.includes(activity.name)
                    return (
                      <button
                        key={activity.name}
                        onClick={() => {
                          if (isSelected) {
                            setActivities(activities.filter(a => a !== activity.name))
                          } else {
                            setActivities([...activities, activity.name])
                          }
                        }}
                        className="px-2 py-1 rounded-lg text-[11px] font-medium transition-colors duration-200 flex items-center gap-1"
                        style={{
                          backgroundColor: isSelected ? activity.color : 'transparent',
                          color: isSelected ? 'white' : activity.color,
                          border: `1px solid ${isSelected ? activity.color : activity.color + '40'}`,
                        }}
                      >
                        <Icon name={activity.iconName} size={12} color={isSelected ? 'white' : activity.color} strokeWidth={1.5} />
                        <span>{activity.name}</span>
                      </button>
                    )
                  })}
                </div>
                {activities.length > 0 && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-[11px]" style={{ color: 'var(--muted)' }}>
                      已选 {activities.length} 项
                    </span>
                    <button
                      onClick={() => setActivities([])}
                      className="text-[11px] px-2 py-0.5 rounded transition-all duration-200"
                      style={{ 
                        backgroundColor: 'rgba(239, 68, 68, 0.1)', 
                        color: '#ef4444' 
                      }}
                    >
                      清除
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 底部保存栏 */}
          <div className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: 'var(--rule)' }}>
            <span className="huiji-caption-secondary">
              {getStatusText()}
            </span>
            <button
              onClick={save}
              disabled={saving}
              className="w-12 h-9 rounded-[6px] transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              style={{ backgroundColor: 'var(--accent)', color: 'white' }}
              title={saving ? '保存中...' : saveStatus === 'saved' ? '已保存' : '保存'}
            >
              <Icon name="save" size={16} color="white" />
            </button>
          </div>
        </div>

        {/* 移动端键盘弹出时的底部工具栏 */}
        {isKeyboardVisible && (
          <div
            className="fixed left-0 right-0 bottom-0 z-40 flex items-center gap-0.5 px-2 h-10 border-t overflow-x-auto"
            style={{
              backgroundColor: 'var(--bg)',
              borderColor: 'var(--rule)',
            }}
          >
          {renderToolbarButtons()?.left}
          <div className="flex-1" />
          {renderToolbarButtons()?.right}
        </div>
        )}
      </div>
    )}

      {/* 隐藏的图片上传输入 */}
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />

      {/* 画板 */}
      {showDrawingBoard && (
        <DrawingBoard
          onSave={(payload) => {
            if (editor) {
              insertDrawing(payload)
            }
            setShowDrawingBoard(false)
          }}
          onCancel={() => setShowDrawingBoard(false)}
        />
      )}

      {/* 图片编辑模式 */}
      {editingImage && (
        <DrawingBoard
          initialImage={editingImage.source === 'upload' ? editingImage.original : null}
          initialDrawing={editingImage.drawing || (editingImage.source === 'drawing' ? editingImage.src : null)}
          onSave={(payload) => {
            updateImageAt(editingImage, payload)
            setEditingImage(null)
          }}
          onCancel={() => setEditingImage(null)}
        />
      )}
    </div>
  )
}

function TodayOverview({ customDate }) {
  const [expanded, setExpanded] = useState(false)
  const [todayRecords, setTodayRecords] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTodayRecords()
  }, [customDate])

  const loadTodayRecords = async () => {
    setLoading(true)
    try {
      const { getRecordsByDate } = await import('../../db/database')
      const records = await getRecordsByDate(customDate)
      setTodayRecords(records)
    } catch (error) {
      console.error('加载今日记录失败:', error)
    }
    setLoading(false)
  }

  if (loading) return null

  const hasRecords = todayRecords.length > 0

  return (
    <div className="huiji-card overflow-hidden">
      {/* 头部 */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-5 py-3 flex items-center justify-between hover:bg-[var(--bg2)] transition-colors rounded-[8px]"
      >
        <div className="flex items-center gap-2">
          <Icon name="book" size={18} color="var(--accent)" />
          <span className="text-[16px] font-semibold" style={{ color: 'var(--ink-strong)' }}>
            今日速览
          </span>
          {hasRecords && (
            <span
              className="px-2 py-0.5 rounded-[6px] text-[13px]"
              style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}
            >
              {todayRecords.length} 条
            </span>
          )}
        </div>
        <Icon
          name="chevron-down"
          size={18}
          color="var(--muted)"
          className={`transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {/* 内容 */}
      {expanded && (
        <div className="px-5 pb-4">
          {hasRecords ? (
            <div className="space-y-2 overflow-y-auto" style={{ maxHeight: '320px' }}>
              {todayRecords.map(record => {
                const config = getRecordType(record.type)
                const time = new Date(record.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })

                let preview = ''
                if (record.type === 'mood') {
                  preview = (record.emotions || []).join('、') || '未记录情绪'
                } else if (record.content) {
                  preview = stripHtml(record.content).slice(0, 50)
                } else if (record.type === 'memo') {
                  preview = '待办事项'
                }

                return (
                  <div
                    key={record.id}
                    className="p-3 rounded-[8px] flex items-center gap-3 flex-shrink-0"
                    style={{ backgroundColor: 'var(--bg2)' }}
                  >
                    <Icon name={config.iconName} size={18} color={config.color} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="huiji-caption-secondary">
                          {time}
                        </span>
                        <span className="huiji-caption-secondary">
                          {config.label}
                        </span>
                      </div>
                      <p className="text-[14px] truncate" style={{ color: 'var(--ink)' }}>
                        {preview || '暂无内容'}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="huiji-caption-secondary">
                今天还没有记录
              </p>
              <p className="huiji-caption-secondary mt-1">
                开始记录今天
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default DiaryEditor

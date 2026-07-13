import { useState, useEffect, useCallback } from 'react'
import { EditorContent } from '@tiptap/react'
import Icon from '../ui/Icon'
import { useEditorRecord } from '../../hooks/useEditorRecord'
import DrawingBoard from './DrawingBoard'
import { PRESET_TAGS, getTagColor } from '../../constants/tags'
import { isSpeechSupported } from '../../utils/speech'
import { getSetting, saveSetting } from '../../db/database'
import { DEFAULT_NOTE_TOOLBAR } from '../../constants/defaults'
import { isMobileDevice } from '../../utils/device'
import { useKeyboardHeight } from '../../hooks/useKeyboardHeight'

const NOTE_TOOLBAR_VERSION = 2

function NoteEditor({ customDate, setCustomDate, editRecord, onSaved }) {
  const [editingImage, setEditingImage] = useState(null) // { pos, src, source, original, drawing }
  const handleImageClick = useCallback((info) => setEditingImage(info), [])

  const {
    editor, formatDate, effectiveDate,
    saveStatus, saving, save, getStatusText,
    title, setTitle,
    tags, setTags, tagsArray, toggleTag, removeTag, recentTags,
    isRecording, toggleRecording, addImage, handleImageUpload,
    insertDrawing, updateImageAt, fileInputRef,
  } = useEditorRecord({
    recordType: 'note',
    editRecord,
    customDate,
    onSaved,
    onImageClick: handleImageClick,
  })

  const [showDrawingBoard, setShowDrawingBoard] = useState(false)
  const [showTagPicker, setShowTagPicker] = useState(false)
  const [showCustomTagInput, setShowCustomTagInput] = useState(false)
  const [customTagText, setCustomTagText] = useState('')
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [isMobile, setIsMobile] = useState(() => isMobileDevice() || window.innerWidth < 768)
  const [toolbarConfig, setToolbarConfig] = useState(DEFAULT_NOTE_TOOLBAR)
  const { isKeyboardVisible, keyboardHeight } = useKeyboardHeight()

  useEffect(() => {
    const check = () => setIsMobile(isMobileDevice() || window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const loadToolbarConfig = async () => {
    const version = await getSetting('noteToolbarVersion')
    if (version !== NOTE_TOOLBAR_VERSION) {
      setToolbarConfig(DEFAULT_NOTE_TOOLBAR)
      await saveSetting('noteToolbar', DEFAULT_NOTE_TOOLBAR)
      await saveSetting('noteToolbarVersion', NOTE_TOOLBAR_VERSION)
      return
    }
    const config = await getSetting('noteToolbar')
    if (config) {
      setToolbarConfig(config)
    }
  }

  useEffect(() => {
    loadToolbarConfig()
    const handler = (e) => {
      if (e.detail?.key === 'noteToolbar') loadToolbarConfig()
    }
    window.addEventListener('toolbar-config-changed', handler)
    return () => window.removeEventListener('toolbar-config-changed', handler)
  }, [])

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
  }, [editor, toolbarConfig, isRecording, toggleRecording, addImage, insertTimestamp, setShowDrawingBoard])

  return (
    <div className="w-full animate-fade-in">
      <div className="mb-6 hidden md:block">
        <button
          onClick={() => setShowDatePicker(!showDatePicker)}
          className="flex items-center gap-1.5 text-sm font-medium transition-opacity hover:opacity-70"
          style={{ color: 'var(--ink)' }}
        >
          {formatDate()}
          <Icon name={showDatePicker ? 'chevron-up' : 'chevron-down'} size={12} color="var(--muted)" strokeWidth={1.5} />
        </button>
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
      </div>

      <div className="mt-6 mb-4">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="添加标题（可选）"
          className="w-full px-4 py-3 rounded-xl text-lg outline-none transition-colors duration-200"
          style={{
            backgroundColor: 'var(--bg)',
            color: 'var(--ink)',
            border: '1px solid var(--rule)',
            fontSize: '18px',
            fontWeight: '500',
          }}
        />
      </div>

      <div className="huiji-card relative overflow-hidden" style={isMobile && isKeyboardVisible ? { paddingBottom: '50px' } : {}}>
        {(!isMobile || !isKeyboardVisible) && (
          <div
            className="flex items-center gap-0.5 px-2 h-10 border-b overflow-x-auto"
            style={{ borderColor: 'var(--rule)' }}
          >
            {renderToolbarButtons()?.left}
            <div className="flex-1" />
            {renderToolbarButtons()?.right}
          </div>
        )}

        <div className="relative z-10 p-4 md:p-7">
          <EditorContent editor={editor} />
        </div>

        {/* 标签输入 */}
        <div
          className="relative z-10 px-6 pb-6"
          style={{ borderTop: '1px solid var(--rule)' }}
        >
          <div className="flex items-center gap-3 pt-4 mb-3">
            <button
              onClick={() => setShowTagPicker(!showTagPicker)}
              className="flex items-center gap-2 transition-colors duration-200"
              style={{ color: showTagPicker ? 'var(--accent)' : 'var(--muted)' }}
            >
              <Icon name="tag" size={14} color={showTagPicker ? 'var(--accent)' : 'var(--muted)'} />
              <Icon name={showTagPicker ? 'chevron-up' : 'chevron-down'} size={12} color={showTagPicker ? 'var(--accent)' : 'var(--muted)'} />
            </button>
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

      {/* 移动端键盘弹出时的底部工具栏 */}
      {isMobile && isKeyboardVisible && (
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

      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />

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

export default NoteEditor

import { useState, useRef, useEffect, useCallback } from 'react'
import { useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { EditableImage } from '../extensions/EditableImage'
import Underline from '@tiptap/extension-underline'
import Highlight from '@tiptap/extension-highlight'
import { Plugin } from 'prosemirror-state'
import { ParagraphIndent } from '../extensions/ParagraphIndent'
import { saveRecord, getAllRecords } from '../db/database'
import { triggerEmotionAnalysis } from '../utils/aiHelper'
import { isSpeechSupported, createSpeechRecognizer, requestMicPermission } from '../utils/speech'
import { compressImage } from '../utils/imageHelper'

// 不同记录类型的初始内容
const DEFAULT_CONTENT = {
  diary: '<p>记录今天</p>',
  note: '<p>写点什么</p>',
}

const SAVE_DEBOUNCE_MS = 3000

/**
 * 日记 / 随笔编辑器的公共逻辑 hook
 *
 * 合并了原 DiaryEditor 与 NoteEditor 中重复的部分：
 * - Tiptap 编辑器配置与内容初始化
 * - editRecord 字段回填到 editor / tags / weather / location / activities
 * - 标签管理（增删改、历史标签加载）
 * - 3 秒防抖自动保存到 IndexedDB
 * - 图片上传、语音录入
 *
 * 说明：editRecord 的数据库读取已在 WritePage 完成（getRecordById），
 * 这里只负责把传入的 editRecord 应用到编辑器状态，因此不暴露 loadingEdit。
 *
 * @param {object}  opts
 * @param {'diary'|'note'} opts.recordType 记录类型
 * @param {object}  [opts.editRecord]   已加载的待编辑记录对象
 * @param {Date}    [opts.customDate]   补记日期
 * @param {function}[opts.onSaved]      保存成功回调
 */
export function useEditorRecord({ recordType, editRecord, customDate, onSaved, onImageClick }) {
  const [saveStatus, setSaveStatus] = useState('idle')
  const [currentRecordId, setCurrentRecordId] = useState(null)
  const [title, setTitle] = useState('')
  const [tags, setTags] = useState('')
  const [recentTags, setRecentTags] = useState([])
  const [weather, setWeather] = useState('')
  const [location, setLocation] = useState('')
  const [activities, setActivities] = useState([])
  const [isRecording, setIsRecording] = useState(false)

  const saveTimerRef = useRef(null)
  const fileInputRef = useRef(null)
  const recognizerRef = useRef(null)
  const finalTranscriptRef = useRef('')
  // 用 ref 持有最新的 save，避免 onUpdate 闭包陈旧导致自动保存用旧 id
  const saveRef = useRef(() => {})
  // 用 ref 持有最新的 onImageClick，避免 editor editorProps 闭包陈旧
  const onImageClickRef = useRef(onImageClick)
  useEffect(() => { onImageClickRef.current = onImageClick }, [onImageClick])

  const effectiveDate = customDate || new Date()

  const editor = useEditor({
    extensions: [ParagraphIndent, StarterKit, EditableImage, Underline, Highlight],
    content: DEFAULT_CONTENT[recordType] || '<p></p>',
    editorProps: {
      handleClickOn: (view, pos, node, nodePos, event, direct) => {
        // 仅响应直接点击图片节点（不响应点击图片周围段落）
        if (direct && node.type.name === 'image') {
          const src = node.attrs.src
          const source = node.attrs['data-source'] || 'upload'
          const original = node.attrs['data-original'] || src
          const drawing = node.attrs['data-drawing'] || null
          if (onImageClickRef.current && src) {
            onImageClickRef.current({ pos: nodePos, src, source, original, drawing })
            return true
          }
        }
        return false
      },
    },
    plugins: [
      // 将段落/列表项开头的普通空格转为 &nbsp;，防止 ProseMirror 解析时丢失
      new Plugin({
        appendTransaction(transactions, oldState, newState) {
          if (!transactions.some(tr => tr.docChanged)) return null
          const { doc, schema } = newState
          const changes = []
          doc.descendants((node, pos) => {
            if ((node.type === schema.nodes.paragraph || node.type === schema.nodes.list_item) && node.content.size > 0) {
              const first = node.content.child(0)
              if (first.isText && first.text.startsWith(' ') && !first.text.startsWith('\u00a0')) {
                const nbspText = '\u00a0' + first.text.slice(1)
                const newNode = schema.text(nbspText, first.marks)
                changes.push({ from: pos + 1, to: pos + 1 + first.nodeSize, insert: newNode })
              }
            }
          })
          if (changes.length === 0) return null
          let tr = newState.tr
          for (const { from, to, insert } of changes) {
            tr = tr.replaceWith(from, to, insert)
          }
          return tr
        },
      }),
    ],
    onUpdate: () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => {
        saveRef.current()
      }, SAVE_DEBOUNCE_MS)
    },
  })

  // 回填 editRecord 到编辑器与各 state
  useEffect(() => {
    if (!editRecord || !editor) return
    const rawHtml = editRecord.contentHTML || editRecord.content || '<p></p>'
    // 将 <p> / <li> 开头的普通空格转为 &nbsp;，防止 ProseMirror 解析时丢失
    const htmlContent = rawHtml.replace(/(<(?:p|li)[^>]*>)( +)/g, (_, tag, spaces) => {
      return tag + '&nbsp;'.repeat(spaces.length)
    })
    editor.commands.setContent(htmlContent)
    // 回填触发的 onUpdate 不应启动自动保存，否则可能用未完全解析的内容覆盖原始数据
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }
    setTags((editRecord.tags || []).join(', '))
    setCurrentRecordId(editRecord.id)
    setTitle(editRecord.title || '')
    if (editRecord.weather) setWeather(editRecord.weather)
    if (editRecord.location) setLocation(editRecord.location)
    if (editRecord.activities) setActivities(editRecord.activities)
  }, [editRecord, editor])

  // 加载历史标签（按使用频次取前 10）
  useEffect(() => {
    const loadRecentTags = async () => {
      try {
        const records = await getAllRecords()
        const tagMap = {}
        records.forEach(r => {
          if (r.tags && r.tags.length > 0) {
            r.tags.forEach(tag => {
              tagMap[tag] = (tagMap[tag] || 0) + 1
            })
          }
        })
        const sorted = Object.entries(tagMap)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([tag]) => tag)
        setRecentTags(sorted)
      } catch (e) {
        console.error('加载历史标签失败:', e)
      }
    }
    loadRecentTags()
  }, [])

  const tagsArray = tags ? tags.split(',').map(t => t.trim()).filter(t => t) : []

  const toggleTag = useCallback((tagName) => {
    setTags(prev => {
      const current = prev ? prev.split(',').map(t => t.trim()).filter(t => t) : []
      const next = current.includes(tagName)
        ? current.filter(t => t !== tagName)
        : [...current, tagName]
      return next.join(', ')
    })
  }, [])

  const addTag = useCallback((tagName) => {
    if (!tagName) return
    setTags(prev => {
      const current = prev ? prev.split(',').map(t => t.trim()).filter(t => t) : []
      if (current.includes(tagName)) return prev
      return [...current, tagName].join(', ')
    })
  }, [])

  const removeTag = useCallback((tagName) => {
    setTags(prev => {
      const current = prev ? prev.split(',').map(t => t.trim()).filter(t => t) : []
      return current.filter(t => t !== tagName).join(', ')
    })
  }, [])

  const formatDate = () => {
    const now = effectiveDate
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    return `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 ${weekdays[now.getDay()]}`
  }

  const getTimestamp = () => {
    return customDate ? customDate.getTime() : Date.now()
  }

  const buildRecord = useCallback(() => {
    if (!editor) return null
    const html = editor.getHTML()
    const text = editor.getText()
    if (!text.trim()) return null

    const tagsList = tags ? tags.split(',').map(t => t.trim()).filter(t => t) : []
    const record = {
      id: currentRecordId || `${recordType}_${getTimestamp()}`,
      type: recordType,
      content: html,
      title: title.trim() || text.slice(0, 50),
      tags: tagsList,
    }

    if (recordType === 'note') {
      record.contentHTML = html
    }

    if (recordType === 'diary') {
      record.contentHTML = html
      if (weather) record.weather = weather
      if (location) record.location = location
      if (activities.length > 0) record.activities = activities
    }

    if (customDate) {
      record.createdAt = customDate.toISOString()
    }

    return record
  }, [editor, currentRecordId, recordType, tags, weather, location, activities, customDate])

  const save = useCallback(async () => {
    const record = buildRecord()
    if (!record) return

    setSaveStatus('saving')
    try {
      const saved = await saveRecord(record)
      setCurrentRecordId(saved.id)
      setSaveStatus('saved')
      triggerEmotionAnalysis(saved)
      if (onSaved) onSaved(saved)
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (error) {
      console.error('保存失败:', error)
      setSaveStatus('error')
    }
  }, [buildRecord, onSaved])

  // 始终让 onUpdate 拿到最新的 save
  useEffect(() => {
    saveRef.current = save
  }, [save])

  // 图片插入
  const addImage = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleImageUpload = useCallback((e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (event) => {
      const result = event.target?.result
      if (typeof result === 'string' && editor) {
        // 压缩图片以减少内存占用（手机拍摄的照片可达 5-12MB）
        const compressed = await compressImage(result)
        // 标记为上传图片：原图作为不可擦背景，绘画层初始为空
        editor.chain().focus().setImage({
          src: compressed,
          'data-source': 'upload',
          'data-original': compressed,
          'data-drawing': null,
        }).run()
      }
    }
    reader.readAsDataURL(file)
    // 重置 input value，否则连续选同一文件不会触发 onChange
    e.target.value = ''
  }, [editor])

  // 插入绘画作品（从画板新建）
  // 兼容 string（旧接口）和 { merged, drawing }（新接口）
  const insertDrawing = useCallback((payload) => {
    if (!editor || !payload) return
    const src = typeof payload === 'string' ? payload : payload.merged
    const drawing = typeof payload === 'string' ? payload : payload.drawing
    editor.chain().focus().setImage({
      src,
      'data-source': 'drawing',
      'data-original': null,
      'data-drawing': drawing,
    }).run()
  }, [editor])

  // 编辑已有图片：在指定位置更新图片节点
  // info: { pos, source, original, drawing } from onImageClick
  // payload: { merged, drawing, original } from DrawingBoard edit mode
  const updateImageAt = useCallback((info, payload) => {
    if (!editor || !info || !payload) return
    const source = info.source || 'upload'
    const original = source === 'upload' ? (payload.original || info.original) : null
    const drawing = payload.drawing
    editor.chain().focus()
      .setNodeSelection(info.pos)
      .setImage({
        src: payload.merged,
        'data-source': source,
        'data-original': original,
        'data-drawing': drawing,
      })
      .run()
  }, [editor])

  // 语音录入
  const toggleRecording = useCallback(async () => {
    if (isRecording) {
      if (recognizerRef.current) {
        try { recognizerRef.current.stop() } catch (e) { /* ignore */ }
        recognizerRef.current = null
      }
      setIsRecording(false)
      return
    }

    if (!isSpeechSupported()) {
      alert('您的设备不支持语音识别')
      return
    }

    // 先请求麦克风权限（Capacitor WebView 不会自动弹出权限弹窗）
    const granted = await requestMicPermission()
    if (!granted) {
      alert('需要麦克风权限才能使用语音识别，请在系统设置中允许麦克风访问')
      return
    }

    finalTranscriptRef.current = ''
    const recognizer = createSpeechRecognizer(
      (final) => {
        if (final) {
          finalTranscriptRef.current += final
          if (editor) {
            editor.chain().focus().insertContent(final).run()
          }
        }
      },
      (error) => {
        console.error('语音识别错误:', error)
        setIsRecording(false)
        recognizerRef.current = null
        if (error === 'not-allowed') {
          alert('麦克风权限被拒绝，请在系统设置中允许麦克风访问')
        } else if (error !== 'no-speech') {
          alert('语音识别出错: ' + error)
        }
      },
      () => {
        recognizerRef.current = null
        setIsRecording(false)
      }
    )

    if (recognizer) {
      recognizerRef.current = recognizer
      try {
        recognizer.start()
        setIsRecording(true)
      } catch (e) {
        console.error('启动语音识别失败:', e)
        recognizerRef.current = null
        setIsRecording(false)
      }
    }
  }, [isRecording, editor])

  const getStatusText = () => {
    switch (saveStatus) {
      case 'saving': return '保存中...'
      case 'saved': return '已保存'
      case 'error': return '保存失败'
      default: return '已自动保存'
    }
  }

  return {
    editor,
    effectiveDate,
    formatDate,
    // 保存
    saveStatus,
    saving: saveStatus === 'saving',
    save,
    getStatusText,
    currentRecordId,
    // 标题
    title,
    setTitle,
    // 标签
    tags,
    setTags,
    tagsArray,
    toggleTag,
    addTag,
    removeTag,
    recentTags,
    // 天气 / 地点 / 活动（日记专用，随笔不读写）
    weather,
    setWeather,
    location,
    setLocation,
    activities,
    setActivities,
    // 媒体
    isRecording,
    toggleRecording,
    addImage,
    handleImageUpload,
    insertDrawing,
    updateImageAt,
    fileInputRef,
    // 透传
    editRecord,
  }
}

export default useEditorRecord

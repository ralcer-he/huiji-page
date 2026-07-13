import { useState, useEffect, useRef, useCallback } from 'react'
import { useAI } from '../hooks/useAI'
import { saveRecord } from '../db/database'
import { EMOTIONS } from '../constants/emotions'
import { parseIntent } from '../utils/intentParser'
import { findAnswer } from '../utils/helpFAQ'
import {
  createChatConversation,
  getChatConversations,
  getChatMessages,
  addChatMessage,
  deleteChatConversation,
} from '../db/database'
import Icon from './ui/Icon'

function XiaohuiChat({ onClose, chatPosition, setChatPosition }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [aiStatus, setAiStatus] = useState(null)
  const [conversationId, setConversationId] = useState(null)
  const [showHistory, setShowHistory] = useState(false)
  const [conversations, setConversations] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [pendingAction, setPendingAction] = useState(null)

  const chatRef = useRef(null)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const { chatWithXiaohui, getAIStatus, analyzeIntent } = useAI()

  const WELCOME_MESSAGE = {
    id: 'welcome_fixed',
    isUser: false,
    content: '你好！我是慧记助手，可以帮你创建记录或解答问题。\n\n试试说：\n• 帮我写个背单词的备忘\n• 记一下今天的心情\n• 在哪里查看历史记录',
    createdAt: new Date().toISOString(),
    isWelcome: true,
  }

  useEffect(() => {
    let cancelled = false
    const init = async () => {
      try {
        const status = await getAIStatus()
        if (!cancelled) setAiStatus(status)
      } catch (e) {
        console.error('获取 AI 状态失败:', e)
      }
      if (!cancelled) await loadConversations()
    }
    init()
    return () => { cancelled = true }
  }, [])

  const loadConversations = async () => {
    setHistoryLoading(true)
    try {
      const convs = await getChatConversations('fab_assistant', 20)
      setConversations(convs)
      if (convs.length > 0) {
        const latest = convs[0]
        setConversationId(latest.id)
        const msgs = await getChatMessages(latest.id)
        if (msgs.length > 0) {
          const chatMsgs = msgs.map(m => ({
            id: m.id,
            isUser: m.role === 'user',
            content: m.content,
            createdAt: m.createdAt,
          }))
          setMessages(chatMsgs)
          setHistoryLoading(false)
          return
        }
      }
    } catch (e) {
      console.error('加载对话失败:', e)
    }
    setMessages([])
    setHistoryLoading(false)
  }

  const createNewConversation = async () => {
    try {
      const conv = await createChatConversation('fab_assistant', '新对话')
      setConversationId(conv.id)
      setMessages([])
      setShowHistory(false)
      // 直接更新对话列表，避免 loadConversations 重置状态
      const convs = await getChatConversations('fab_assistant', 20)
      setConversations(convs)
    } catch (e) {
      console.error('创建对话失败:', e)
    }
  }

  const loadConversation = async (convId) => {
    try {
      setConversationId(convId)
      const msgs = await getChatMessages(convId)
      setMessages(
        msgs.map(m => ({
          id: m.id,
          isUser: m.role === 'user',
          content: m.content,
          createdAt: m.createdAt,
        }))
      )
      setShowHistory(false)
    } catch (e) {
      console.error('加载对话失败:', e)
    }
  }

  const handleDeleteConversation = async (convId, e) => {
    e.stopPropagation()
    try {
      await deleteChatConversation(convId)
      // 先刷新对话列表
      const convs = await getChatConversations('fab_assistant', 20)
      setConversations(convs)
      
      if (convId === conversationId) {
        // 删除的是当前对话，切换到最新的对话或创建新的
        if (convs.length > 0) {
          const latest = convs[0]
          setConversationId(latest.id)
          const msgs = await getChatMessages(latest.id)
          setMessages(msgs.map(m => ({
            id: m.id,
            isUser: m.role === 'user',
            content: m.content,
            createdAt: m.createdAt,
          })))
        } else {
          // 没有对话了，创建一个新的
          const conv = await createChatConversation('fab_assistant', '新对话')
          setConversationId(conv.id)
          setMessages([])
          const updatedConvs = await getChatConversations('fab_assistant', 20)
          setConversations(updatedConvs)
        }
      }
    } catch (err) {
      console.error('删除对话失败:', err)
    }
  }

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, pendingAction, scrollToBottom])

  const saveMessageToDB = async (role, content) => {
    if (!conversationId) {
      try {
        const conv = await createChatConversation('fab_assistant')
        setConversationId(conv.id)
        await addChatMessage(conv.id, { role, content })
        // 刷新对话列表
        const convs = await getChatConversations('fab_assistant', 20)
        setConversations(convs)
      } catch (e) {
        console.error('保存消息失败:', e)
      }
    } else {
      try {
        await addChatMessage(conversationId, { role, content })
      } catch (e) {
        console.error('保存消息失败:', e)
      }
    }
  }

  const createRecord = useCallback(
    async (type, content, title = '', emotion = '', isDetailed = false) => {
      const timestamp = Date.now()
      let record = {
        id: `${type}_${timestamp}`,
        type,
        content,
        title: title || '',
        tags: [],
      }
      if (type === 'memo') record.completed = false
      if (type === 'mood') {
        const matchedEmotion =
          EMOTIONS.find(e => e.name === emotion) || EMOTIONS.find(e => e.name === '平静')
        record.emotions = [matchedEmotion?.name || '平静']
        record.intensity = 3
        record.content = isDetailed && content ? content : ''
      }
      try {
        await saveRecord(record)
        return true
      } catch (e) {
        console.error('创建记录失败:', e)
        return false
      }
    },
    []
  )

  const getConfirmText = (intentResult) => {
    const { recordType, content, title, emotion, isDetailed } = intentResult
    const typeNames = {
      memo: '备忘',
      note: '随笔',
      diary: '日记',
      mood: '心情',
    }
    const typeName = typeNames[recordType] || '记录'

    if (recordType === 'mood') {
      return `好的，我将为你记录心情：${emotion || '平静'}${isDetailed && content ? `\n备注：${content}` : ''}\n确认添加吗？`
    }

    let text = `好的，我将为你添加${typeName}`
    if (title) text += `\n标题：${title}`
    if (content) text += `\n内容：${content}`
    text += '\n确认添加吗？'
    return text
  }

  const handleSend = useCallback(async () => {
    if (!input.trim() || loading || pendingAction) return

    const userText = input.trim()
    const userMsg = {
      id: Date.now(),
      isUser: true,
      content: userText,
      createdAt: new Date().toISOString(),
    }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)
    await saveMessageToDB('user', userText)

    try {
      let intentResult = parseIntent(userText)

      const hasExplicitType = /记到|记在|写到|写在|加到|加在|添加到|记录到|写(一篇|个|条|篇)|记(一篇|个|条|一下)|(随笔|备忘|日记|心情)[:：]/.test(userText)

      if (!hasExplicitType && aiStatus?.enabled) {
        try {
          const aiResult = await analyzeIntent(userText)
          if (aiResult && aiResult.confidence >= 0.6) {
            intentResult = aiResult
          }
        } catch (e) {
          console.warn('AI 意图分析失败，使用关键词匹配:', e)
        }
      }

      const { intent, recordType, content, title, emotion, isDetailed } = intentResult

      if (intent === 'help') {
        const answer = findAnswer(userText)
        const responseContent = answer
          ? answer + '\n\n还有其他问题吗？'
          : '抱歉，我不太明白你的问题。你可以试试问：\n• 在哪里查看历史记录\n• 如何添加标题\n• 怎么删除记录'
        const aiMsg = {
          id: Date.now() + 1,
          isUser: false,
          content: responseContent,
          createdAt: new Date().toISOString(),
        }
        setMessages(prev => [...prev, aiMsg])
        await saveMessageToDB('assistant', responseContent)
      } else if (intent.startsWith('create_')) {
        const confirmMsg = {
          id: 'confirm_' + Date.now(),
          isUser: false,
          content: getConfirmText(intentResult),
          createdAt: new Date().toISOString(),
          isConfirm: true,
        }
        setMessages(prev => [...prev, confirmMsg])
        setPendingAction({
          type: recordType,
          content,
          title,
          emotion,
          isDetailed,
          originalText: userText,
        })
      } else {
        let responseContent
        if (aiStatus?.enabled) {
          try {
            const result = await chatWithXiaohui(userText, 'chat', messages)
            responseContent = result.content
          } catch (e) {
            responseContent = '抱歉，我暂时无法连接，你可以试试说：\n• 帮我写个背单词的备忘\n• 记一下今天的心情'
          }
        } else {
          responseContent = '我不太明白，你可以试试说：\n• 帮我写个背单词的备忘\n• 记一下今天的心情\n• 在哪里查看历史记录'
        }
        const aiMsg = {
          id: Date.now() + 1,
          isUser: false,
          content: responseContent,
          createdAt: new Date().toISOString(),
        }
        setMessages(prev => [...prev, aiMsg])
        await saveMessageToDB('assistant', responseContent)
      }
    } catch (err) {
      const errorMsg = {
        id: Date.now() + 1,
        isUser: false,
        content: '抱歉，遇到问题，请稍后再试',
        createdAt: new Date().toISOString(),
      }
      setMessages(prev => [...prev, errorMsg])
      await saveMessageToDB('assistant', '抱歉，遇到问题，请稍后再试')
    }

    setLoading(false)
  }, [input, loading, aiStatus, analyzeIntent, chatWithXiaohui, messages, conversationId, pendingAction])

  const handleConfirm = async () => {
    if (!pendingAction) return

    const { type, content, title, emotion, isDetailed } = pendingAction
    const success = await createRecord(type, content, title, emotion, isDetailed)

    const typeNames = {
      memo: '备忘',
      note: '随笔',
      diary: '日记',
      mood: '心情',
    }

    let responseContent
    if (success) {
      if (type === 'mood') {
        responseContent = `已记录心情：${emotion || '平静'}`
      } else {
        responseContent = `已添加${typeNames[type] || '记录'}：${content || '无内容'}`
      }
    } else {
      responseContent = '抱歉，创建失败，请重试'
    }

    const aiMsg = {
      id: Date.now(),
      isUser: false,
      content: responseContent,
      createdAt: new Date().toISOString(),
    }
    setMessages(prev => prev.map(m => m.isConfirm ? { ...m, confirmHandled: true } : m))
    setMessages(prev => [...prev, aiMsg])
    await saveMessageToDB('assistant', responseContent)
    setPendingAction(null)
    onClose()
  }

  const handleCancel = () => {
    const cancelMsg = {
      id: Date.now(),
      isUser: false,
      content: '好的，已取消。还有什么我可以帮你的吗？',
      createdAt: new Date().toISOString(),
    }
    setMessages(prev => prev.map(m => m.isConfirm ? { ...m, confirmHandled: true } : m))
    setMessages(prev => [...prev, cancelMsg])
    saveMessageToDB('assistant', '好的，已取消。还有什么我可以帮你的吗？')
    setPendingAction(null)
  }

  const handleMouseDown = useCallback(e => {
    if (e.target.closest('button') || e.target.closest('input') || e.target.closest('textarea') || e.target.closest('.no-drag'))
      return
    setIsDragging(true)
    const rect = chatRef.current.getBoundingClientRect()
    setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top })
  }, [])

  const handleMouseMove = useCallback(e => {
    if (!isDragging) return
    const maxX = (window.visualViewport?.width || window.innerWidth) - (chatRef.current?.offsetWidth || 400)
    const maxY = (window.visualViewport?.height || window.innerHeight) - (chatRef.current?.offsetHeight || 500) - 20
    setChatPosition({
      x: Math.max(0, Math.min(e.clientX - dragOffset.x, maxX)),
      y: Math.max(0, Math.min(e.clientY - dragOffset.y, maxY)),
    })
  }, [isDragging, dragOffset, setChatPosition])

  const handleMouseUp = useCallback(() => setIsDragging(false), [])

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  // 监听 Android 返回键关闭聊天窗口
  useEffect(() => {
    const handleBack = () => onClose()
    const el = chatRef.current
    if (el) {
      el.addEventListener('backbutton', handleBack)
      return () => el.removeEventListener('backbutton', handleBack)
    }
  }, [onClose])

  const handleKeyDown = useCallback(e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [handleSend])

  const formatTime = dateStr => {
    const d = new Date(dateStr)
    const now = new Date()
    return d.toDateString() === now.toDateString()
      ? d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
      : d.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
  }

  const formatDate = dateStr => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div
      ref={chatRef}
      data-overlay="true"
      className="animate-slide-up"
      style={{
        position: 'fixed',
        zIndex: 50,
        width: '400px',
        maxWidth: '90vw',
        height: '560px',
        maxHeight: 'calc(100vh - 100px)',
        backgroundColor: 'var(--bg)',
        border: '1px solid var(--rule)',
        borderRadius: 'var(--radius-modal)',
        boxShadow: 'var(--shadow-lg)',
        display: 'flex',
        flexDirection: 'column',
        cursor: isDragging ? 'grabbing' : 'default',
        left: `${chatPosition.x}px`,
        top: `${chatPosition.y}px`,
      }}
    >
      {/* 头部 */}
      <div
        className="flex items-center justify-between px-4 h-12 border-b cursor-grab active:cursor-grabbing select-none flex-shrink-0"
        style={{ borderColor: 'var(--rule)' }}
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-full flex-shrink-0 overflow-hidden"
          >
            <img src={`${import.meta.env.BASE_URL}icons/xiaohui-fab.svg`} alt="助手" style={{ width: '100%', height: '100%' }} />
          </div>
          <div className="flex flex-col">
            <h3 className="font-semibold text-[14px]" style={{ color: 'var(--ink)' }}>助手</h3>
            <div className="flex items-center gap-1.5">
              {aiStatus?.enabled ? (
                <>
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: aiStatus.level === 1 ? '#10b981' : 'var(--accent)' }}
                  />
                  <span className="text-[10px]" style={{ color: 'var(--muted)' }}>
                    {aiStatus.level === 1 ? '在线' : '免费'} · L{aiStatus.level}
                    {aiStatus.level === 2 && aiStatus.dailyRemaining !== undefined
                      ? ` · 剩${aiStatus.dailyRemaining}次`
                      : ''}
                  </span>
                </>
              ) : (
                <span className="text-[10px]" style={{ color: 'var(--muted)' }}>离线模式</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[var(--bg2)]"
            title="历史记录"
          >
            <Icon name="clock" size={16} color="var(--ink)" strokeWidth={1.5} />
          </button>
          <button
            onClick={createNewConversation}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[var(--bg2)]"
            title="新建对话"
          >
            <Icon name="plus" size={16} color="var(--ink)" strokeWidth={1.5} />
          </button>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-red-50"
          >
            <Icon name="close" size={16} color="var(--ink)" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* 历史记录下拉面板 */}
      {showHistory && (
        <div
          className="absolute top-12 left-0 right-0 z-10 border-b"
          style={{
            backgroundColor: 'var(--bg)',
            borderColor: 'var(--rule)',
            maxHeight: '200px',
            overflowY: 'auto',
          }}
        >
          <div className="p-2">
            {historyLoading ? (
              <div className="text-center py-4 text-sm" style={{ color: 'var(--muted)' }}>
                加载中...
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-4 text-sm" style={{ color: 'var(--muted)' }}>
                暂无历史记录
              </div>
            ) : (
              conversations.map(conv => (
                <div
                  key={conv.id}
                  onClick={() => loadConversation(conv.id)}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer ${
                    conv.id === conversationId ? 'bg-[var(--accent-light)]' : 'hover:bg-[var(--bg2)]'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate" style={{ color: 'var(--ink)' }}>
                      {conv.title || '新对话'}
                    </div>
                    <div className="text-[11px]" style={{ color: 'var(--muted)' }}>
                      {conv.messageCount || 0} 条 · {formatDate(conv.updatedAt)}
                    </div>
                  </div>
                  <button
                    onClick={e => handleDeleteConversation(conv.id, e)}
                    className="w-6 h-6 rounded flex items-center justify-center hover:bg-red-100 flex-shrink-0 ml-2"
                  >
                    <Icon name="trash" size={12} color="var(--ink)" strokeWidth={1.5} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 聊天区域 */}
      <div
        className="flex-1 overflow-y-auto px-4"
        style={{ backgroundColor: 'var(--bg)', paddingTop: '8px', paddingBottom: '4px' }}
      >
        {/* 欢迎语（无历史消息时作为第一条消息常驻） */}
        {messages.length === 0 && (
          <div className="mb-1">
            <div className="flex items-start gap-2.5 mt-4">
              <div
                className="w-9 h-9 rounded-full flex-shrink-0 overflow-hidden"
              >
                <img src={`${import.meta.env.BASE_URL}icons/xiaohui-fab.svg`} alt="助手" style={{ width: '100%', height: '100%' }} />
              </div>
              <div className="flex flex-col" style={{ maxWidth: '75%' }}>
                <div
                  className="whitespace-pre-wrap break-words"
                  style={{
                    padding: '9px 16px',
                    fontSize: '14px',
                    lineHeight: '1.6',
                    minWidth: '40px',
                    backgroundColor: 'var(--bg2)',
                    color: 'var(--ink)',
                    borderRadius: '18px 4px 18px 18px',
                    border: '1px solid var(--rule)',
                  }}
                >
                  {WELCOME_MESSAGE.content.split('\n').map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
                </div>
              </div>
            </div>

            {!loading && (
              <div className="flex flex-wrap gap-2 mt-3" style={{ paddingLeft: '44px' }}>
                {['帮我写个背单词的备忘', '记一下今天的心情', '在哪里查看历史记录'].map(q => (
                  <button
                    key={q}
                    onClick={() => {
                      setInput(q)
                      inputRef.current?.focus()
                    }}
                    className="text-[12px] px-3 py-1.5 rounded-full border font-medium hover:bg-[var(--bg2)] transition-colors"
                    style={{
                      backgroundColor: 'var(--bg2)',
                      color: 'var(--accent)',
                      borderColor: 'var(--accent)',
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 消息列表 */}
        {messages.map((msg, index) => {
          const prevMsg = index > 0 ? messages[index - 1] : null
          const isContinuation = prevMsg && prevMsg.isUser === msg.isUser
          const isFirstInGroup = !isContinuation

          return (
            <div key={msg.id} className={isFirstInGroup ? 'mt-5' : 'mt-2'}>
              <div
                className={`flex items-start gap-2.5 ${
                  msg.isUser ? 'flex-row-reverse' : 'flex-row'
                } ${isFirstInGroup ? 'mt-4' : 'mt-1'}`}
              >
                {!msg.isUser && (
                  <div
                    className="w-9 h-9 rounded-full flex-shrink-0 overflow-hidden"
                  >
                    <img src={`${import.meta.env.BASE_URL}icons/xiaohui-fab.svg`} alt="助手" style={{ width: '100%', height: '100%' }} />
                  </div>
                )}
                {msg.isUser && (
                  <div
                    className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center"
                    style={{ backgroundColor: '#E0E0E0' }}
                  >
                    <Icon name="user" size={18} color="#999" strokeWidth={1.2} />
                  </div>
                )}

                <div className="flex flex-col" style={{ maxWidth: '75%' }}>
                  <div
                    className="whitespace-pre-wrap break-words"
                    style={{
                      padding: '9px 16px',
                      fontSize: '14px',
                      lineHeight: '1.6',
                      minWidth: '40px',
                      backgroundColor: msg.isUser ? 'var(--accent)' : 'var(--bg2)',
                      color: msg.isUser ? 'white' : 'var(--ink)',
                      borderRadius: msg.isUser
                        ? '4px 18px 18px 18px'
                        : '18px 4px 18px 18px',
                      border: msg.isUser ? 'none' : '1px solid var(--rule)',
                      boxShadow: msg.isUser ? '0 2px 8px rgba(93, 173, 226, 0.25)' : 'none',
                    }}
                  >
                    {msg.content.split('\n').map((line, i) => (
                      <p key={i}>{line}</p>
                    ))}
                  </div>
                  {msg.createdAt && !isContinuation && (
                    <div
                      className="text-[10px] mt-1"
                      style={{ color: 'var(--muted)', textAlign: msg.isUser ? 'right' : 'left' }}
                    >
                      {formatTime(msg.createdAt)}
                    </div>
                  )}
                </div>
              </div>

              {msg.isConfirm && !msg.confirmHandled && (
                <div className="flex gap-2 mt-2" style={{ paddingLeft: '44px' }}>
                  <button
                    onClick={handleConfirm}
                    className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:opacity-90 shadow-sm"
                    style={{ background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)' }}
                    title="确认"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </button>
                  <button
                    onClick={handleCancel}
                    className="w-9 h-9 rounded-full flex items-center justify-center border transition-all hover:bg-[var(--bg2)]"
                    style={{ borderColor: 'var(--rule)' }}
                    title="取消"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          )
        })}

        {loading && (
          <div className="flex items-end mb-2">
            <div
              className="w-9 h-9 rounded-full flex-shrink-0 overflow-hidden"
            >
              <img src={`${import.meta.env.BASE_URL}icons/xiaohui-fab.svg`} alt="助手" style={{ width: '100%', height: '100%' }} />
            </div>
            <div className="flex flex-col gap-1 ml-2.5">
              <div
                className="px-3 py-2.5 rounded-[16px] rounded-tl-sm"
                style={{ backgroundColor: 'var(--bg2)', border: '1px solid var(--rule)' }}
              >
                <div className="flex gap-1 items-center">
                  {[0, 150, 300].map(delay => (
                    <span
                      key={delay}
                      className="w-1.5 h-1.5 rounded-full"
                      style={{
                        backgroundColor: 'var(--accent)',
                        animation: 'bounce 1.2s ease-in-out infinite',
                        animationDelay: `${delay}ms`,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} className="h-2" />
      </div>

      {/* 输入区域 */}
      <div
        className="px-4 pt-2 pb-1 no-drag flex-shrink-0"
        style={{ borderTop: '1px solid var(--rule)', backgroundColor: 'var(--bg)' }}
      >
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="问点什么..."
              className="w-full px-3.5 py-2 rounded-2xl text-[14px] outline-none border transition-colors"
              style={{
                backgroundColor: 'var(--bg2)',
                color: 'var(--ink)',
                borderColor: 'transparent',
                lineHeight: '1.4',
              }}
              disabled={!!pendingAction}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading || pendingAction}
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200 disabled:opacity-40 hover:scale-105 active:scale-95"
            style={{
              background: 'var(--send-btn-gradient)',
              color: 'white',
              boxShadow: '0 2px 8px rgba(93, 173, 226, 0.25)',
            }}
          >
            <Icon name="send" size={18} color="white" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </div>
  )
}

function FloatingButton({ onClick, aiAvailable, position, onDragEnd }) {
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [currentPos, setCurrentPos] = useState(position)
  const [isDocked, setIsDocked] = useState(() => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
    if (!isMobile) return false
    return localStorage.getItem('xiaohui_fab_docked') === 'true'
  })
  const buttonRef = useRef(null)
  const hasMoved = useRef(false)
  const currentPosRef = useRef(position)
  const isDockedRef = useRef(isDocked)
  const lastInteractionRef = useRef(null) // 'touch' or 'mouse'

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
  const btnSize = 90

  useEffect(() => {
    setCurrentPos(position)
    currentPosRef.current = position
  }, [position])

  useEffect(() => { isDockedRef.current = isDocked }, [isDocked])

  const handleDragStart = useCallback(e => {
    // 防止触摸和鼠标事件双重触发：手机上 touchstart 后会再触发 mousedown，跳过后者
    const isTouch = e.type === 'touchstart'
    if (isTouch) {
      lastInteractionRef.current = 'touch'
    } else if (lastInteractionRef.current === 'touch') {
      // 刚处理过 touch 事件，跳过紧接着的 mouse 事件
      lastInteractionRef.current = null
      return
    } else {
      lastInteractionRef.current = 'mouse'
    }

    e.preventDefault()
    if (isDockedRef.current) {
      setIsDocked(false)
      isDockedRef.current = false
      localStorage.setItem('xiaohui_fab_docked', 'false')
      // 重置按钮到屏幕右侧靠中间位置
      const resetPos = { x: (window.visualViewport?.width || window.innerWidth) - 76, y: (window.visualViewport?.height || window.innerHeight) / 2 }
      currentPosRef.current = resetPos
      setCurrentPos(resetPos)
      onDragEnd(resetPos)
      // 直接触发打开，不经过 handleToggle 避免读到旧位置
      onClick(true)
      return
    }
    setIsDragging(true)
    hasMoved.current = false
    const rect = buttonRef.current.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    setDragStart({ x: clientX - rect.left, y: clientY - rect.top })
  }, [onClick, onDragEnd])

  useEffect(() => {
    if (!isDragging) return

    const onMove = e => {
      e.preventDefault()
      const clientX = e.touches ? e.touches[0].clientX : e.clientX
      const clientY = e.touches ? e.touches[0].clientY : e.clientY
      const newX = Math.max(0, Math.min(clientX - dragStart.x, (window.visualViewport?.width || window.innerWidth) - btnSize))
      const newY = Math.max(0, Math.min(clientY - dragStart.y, (window.visualViewport?.height || window.innerHeight) - btnSize))
      if (Math.abs(newX - currentPosRef.current.x) > 3 || Math.abs(newY - currentPosRef.current.y) > 3)
        hasMoved.current = true
      const newPos = { x: newX, y: newY }
      currentPosRef.current = newPos
      setCurrentPos(newPos)
    }

    const onEnd = (e) => {
      // 防止 touchend 后 mouseup 重复触发
      const isTouch = e.type === 'touchend'
      if (!isTouch && lastInteractionRef.current === 'touch') {
        lastInteractionRef.current = null
        return
      }
      if (isTouch) lastInteractionRef.current = null

      setIsDragging(false)

      if (!hasMoved.current) {
        onClick()
        return
      }

      const pos = currentPosRef.current

      if (isMobile) {
        const atLeft = pos.x < 15
        const atRight = pos.x > window.innerWidth - btnSize - 15
        if (atLeft || atRight) {
          const dockPos = { x: atLeft ? 0 : window.innerWidth - 4, y: pos.y }
          currentPosRef.current = dockPos
          setCurrentPos(dockPos)
          setIsDocked(true)
          isDockedRef.current = true
          localStorage.setItem('xiaohui_fab_docked', 'true')
          onDragEnd(dockPos)
          return
        }
      }

      onDragEnd(pos)
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onEnd)
    document.addEventListener('touchmove', onMove, { passive: false })
    document.addEventListener('touchend', onEnd)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onEnd)
      document.removeEventListener('touchmove', onMove)
      document.removeEventListener('touchend', onEnd)
    }
  }, [isDragging, dragStart, isMobile, onClick, onDragEnd])

  if (isDocked && isMobile) {
    const dockedLeft = currentPos.x <= 0
    return (
      <div
        ref={buttonRef}
        onTouchStart={handleDragStart}
        onMouseDown={handleDragStart}
        className="fixed z-40 flex items-center justify-center select-none"
        style={{
          left: dockedLeft ? '0' : 'auto',
          right: dockedLeft ? 'auto' : '0',
          top: `${currentPos.y}px`,
          width: '14px',
          height: '64px',
          borderRadius: dockedLeft ? '0 8px 8px 0' : '8px 0 0 8px',
          background: 'var(--fab-header-gradient)',
          boxShadow: '0 2px 8px rgba(93, 173, 226, 0.3)',
          cursor: 'pointer',
        }}
      >
        <svg
          width="6" height="24" viewBox="0 0 6 24" fill="none"
          style={{ opacity: 0.6, transform: dockedLeft ? 'none' : 'scaleX(-1)' }}
        >
          <circle cx="3" cy="4" r="1.5" fill="white" />
          <circle cx="3" cy="12" r="1.5" fill="white" />
          <circle cx="3" cy="20" r="1.5" fill="white" />
        </svg>
      </div>
    )
  }

  return (
    <div
      ref={buttonRef}
      onMouseDown={handleDragStart}
      onTouchStart={handleDragStart}
      className="fixed z-40 flex items-center justify-center select-none"
      style={{
        left: `${currentPos.x}px`,
        top: `${currentPos.y}px`,
        width: '90px',
        height: '90px',
        cursor: isDragging ? 'grabbing' : 'pointer',
        opacity: aiAvailable ? 1 : 0.6,
        transition: isDragging ? 'none' : 'all 0.3s ease',
      }}
    >
      <img
        src={`${import.meta.env.BASE_URL}icons/xiaohui-fab.svg`}
        alt="小慧"
        draggable={false}
        style={{ width: '90px', height: '90px', pointerEvents: 'none' }}
      />
    </div>
  )
}

export default function XiaohuiFab() {
  const [open, setOpen] = useState(false)
  const [aiAvailable, setAiAvailable] = useState(true)
  const [fabPosition, setFabPosition] = useState(() => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
    const saved = localStorage.getItem(
      isMobile ? 'xiaohui_fab_position_mobile' : 'xiaohui_fab_position'
    )
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {}
    }
    const bottomOffset = isMobile ? 100 : 160
    const btnW = isMobile ? 56 : 90
    const margin = isMobile ? 16 : 20
    return { x: (window.visualViewport?.width || window.innerWidth) - btnW - margin, y: (window.visualViewport?.height || window.innerHeight) - bottomOffset }
  })
  const [chatPosition, setChatPosition] = useState(() => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
    const saved = localStorage.getItem(
      isMobile ? 'xiaohui_chat_position_mobile' : 'xiaohui_chat_position'
    )
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {}
    }
    if (isMobile) return { x: 16, y: 80 }
    return { x: Math.max(0, window.innerWidth / 2 - 200), y: 80 }
  })
  const { getAIStatus } = useAI()

  useEffect(() => {
    const checkStatus = async () => {
      const status = await getAIStatus()
      setAiAvailable(status.enabled)
    }
    checkStatus()
  }, [getAIStatus])

  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth < 768
      const saved = localStorage.getItem(
        isMobile ? 'xiaohui_fab_position_mobile' : 'xiaohui_fab_position'
      )
      if (saved) {
        try {
          const pos = JSON.parse(saved)
          setFabPosition(pos)
        } catch {}
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleFabDragEnd = useCallback(pos => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
    setFabPosition(pos)
    localStorage.setItem(
      isMobile ? 'xiaohui_fab_position_mobile' : 'xiaohui_fab_position',
      JSON.stringify(pos)
    )
  }, [])

  const handleChatPositionChange = useCallback(pos => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
    setChatPosition(pos)
    localStorage.setItem(
      isMobile ? 'xiaohui_chat_position_mobile' : 'xiaohui_chat_position',
      JSON.stringify(pos)
    )
  }, [])

  const handleToggle = (forceOpen) => {
    if (open && !forceOpen) {
      setOpen(false)
      return
    }
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
    if (isMobile) {
      setChatPosition({ x: 16, y: 80 })
    } else {
      setChatPosition({
        x: Math.max(0, Math.min(fabPosition.x - 180, window.innerWidth - 400)),
        y: Math.max(0, fabPosition.y - 400),
      })
    }
    setOpen(true)
  }

  return (
    <div className="fab-container">
      <FloatingButton
        onClick={handleToggle}
        aiAvailable={aiAvailable}
        position={fabPosition}
        onDragEnd={handleFabDragEnd}
      />
      {open && (
        <XiaohuiChat
          onClose={() => setOpen(false)}
          chatPosition={chatPosition}
          setChatPosition={handleChatPositionChange}
        />
      )}
    </div>
  )
}

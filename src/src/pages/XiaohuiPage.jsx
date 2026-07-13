import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useAI } from '../hooks/useAI'
import {
  createChatConversation,
  getOrCreateChatConversation,
  getChatConversations,
  getChatMessages,
  addChatMessage,
  updateChatConversation,
  deleteChatConversation,
  getSetting,
  getUserProfile,
} from '../db/database'
import Icon from '../components/ui/Icon'
import XiaohuiLetterSpace from '../components/XiaohuiLetterSpace'
import { matchEasterEggUser, getEasterEggGreeting } from '../utils/easterEgg'

const WELCOME_MSG = '我来啦～今天有什么想和我分享的吗 (◍•ᴗ•◍)？'
const QUICK_REPLIES = ['分析最近心情', '给我日记灵感', '陪我聊聊天']

const getEasterEggWelcomeMsg = (eggMatch) => {
  if (!eggMatch) return null
  const { user } = eggMatch
  const name = user.name
  const greetings = user.greetings
  const greeting = greetings[Math.floor(Math.random() * greetings.length)]
  if (user.isDeveloper) {
    return `好久不见，何洋。\n\n${greeting}`
  }
  return `${greeting}\n\n（嘘，这是只属于你的彩蛋哦 🌟）`
}

function XiaohuiPage() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [aiStatus, setAiStatus] = useState(null)
  const [letterDelayMode, setLetterDelayMode] = useState('immersive')
  const [conversations, setConversations] = useState([])
  const [currentConversationId, setCurrentConversationId] = useState(null)
  const [showHistory, setShowHistory] = useState(false)
  const [textareaH, setTextareaH] = useState(null)
  const [isRecording, setIsRecording] = useState(false)
  const [showLetterSpace, setShowLetterSpace] = useState(false)
  const [letterClosing, setLetterClosing] = useState(false)
  const [userAvatar, setUserAvatar] = useState(null)
  const [previewAvatar, setPreviewAvatar] = useState(false)
  const [isEasterEggUser, setIsEasterEggUser] = useState(false)
  const [easterEggUserInfo, setEasterEggUserInfo] = useState(null)
  const [showFullTime, setShowFullTime] = useState(false)

  const handleCloseLetterSpace = useCallback(() => {
    setLetterClosing(true)
    setTimeout(() => {
      setShowLetterSpace(false)
      setLetterClosing(false)
    }, 280)
  }, [])

  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const isResizing = useRef(false)
  const resizeStartY = useRef(0)
  const resizeStartH = useRef(0)
  const recognitionRef = useRef(null)
  const recordingBaseRef = useRef('')
  const recordingFinalRef = useRef('')
  const initConvRef = useRef(false)
  const { chatWithXiaohui, getAIStatus } = useAI()

  const toggleRecording = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert('您的浏览器不支持语音输入，请使用 Chrome 或 Edge 浏览器')
      return
    }

    if (isRecording) {
      recognitionRef.current?.stop()
      return
    }

    recordingBaseRef.current = input
    recordingFinalRef.current = ''

    const recognition = new SpeechRecognition()
    recognition.lang = 'zh-CN'
    recognition.continuous = true
    recognition.interimResults = true
    recognition.maxAlternatives = 1

    recognition.onresult = (event) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          recordingFinalRef.current += event.results[i][0].transcript
        } else {
          interim += event.results[i][0].transcript
        }
      }
      const display = recordingBaseRef.current + recordingFinalRef.current + (interim ? interim + '\u2026' : '')
      setInput(display)
    }

    recognition.onerror = (event) => {
      console.error('语音识别错误:', event.error)
      if (event.error === 'not-allowed') {
        alert('请授权麦克风权限后重试')
      } else if (event.error === 'no-speech') {
        // 没有检测到语音，静默处理
      } else {
        alert('语音识别失败，请重试')
      }
      setInput(recordingBaseRef.current + recordingFinalRef.current)
      setIsRecording(false)
    }

    recognition.onend = () => {
      setIsRecording(false)
      setInput(recordingBaseRef.current + recordingFinalRef.current)
    }

    recognitionRef.current = recognition
    recognition.start()
    setIsRecording(true)
  }, [isRecording, input])

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop()
    }
  }, [])

  const loadConversations = useCallback(async () => {
    try {
      const list = await getChatConversations('chat', 50)
      setConversations(list)
    } catch (e) {
      console.error('加载对话列表失败:', e)
    }
  }, [])

  useEffect(() => {
    loadConversations()
    getUserProfile().then(profile => {
      if (profile.avatar) {
        setUserAvatar(profile.avatar)
      }
      try {
        const eggMatch = matchEasterEggUser(profile)
        if (eggMatch) {
          setIsEasterEggUser(true)
          setEasterEggUserInfo(eggMatch.user)
        } else {
          setIsEasterEggUser(false)
          setEasterEggUserInfo(null)
        }
      } catch (e) {
        setIsEasterEggUser(false)
        setEasterEggUserInfo(null)
      }
    })
    localStorage.removeItem('easterEggTriggered')
  }, [loadConversations])

  useEffect(() => {
    const handleAvatarUpdate = (e) => {
      setUserAvatar(e.detail?.avatar || null)
    }
    window.addEventListener('avatar-updated', handleAvatarUpdate)
    return () => window.removeEventListener('avatar-updated', handleAvatarUpdate)
  }, [])

  useEffect(() => {
    const loadStatus = async () => {
      try {
        const status = await getAIStatus()
        setAiStatus(status)
      } catch (e) {
        console.error('获取 AI 状态失败:', e)
      }
    }
    loadStatus()

    const loadDelayMode = async () => {
      const delayMode = await getSetting('letterDelayMode')
      if (delayMode) setLetterDelayMode(delayMode)
    }
    loadDelayMode()
  }, [getAIStatus])

  // textarea 自动增高
  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    if (isResizing.current) return

    if (input === '') {
      setTextareaH(null)
      const defaultH = window.innerWidth >= 768 ? 160 : 60
      el.style.height = defaultH + 'px'
      return
    }

    requestAnimationFrame(() => {
      if (textareaH !== null) {
        el.style.height = 'auto'
        const naturalH = el.scrollHeight
        if (naturalH <= textareaH) {
          el.style.height = textareaH + 'px'
          return
        }
        if (naturalH <= 200) {
          el.style.height = naturalH + 'px'
        } else {
          el.style.height = '200px'
        }
        setTextareaH(null)
        return
      }
      el.style.height = 'auto'
      const defaultH = window.innerWidth >= 768 ? 160 : 60
      const newH = Math.max(defaultH, Math.min(el.scrollHeight, 200))
      el.style.height = newH + 'px'
    })
  }, [input])

  // 同步 textarea 自定义高度
  useEffect(() => {
    const el = inputRef.current
    if (!el || textareaH === null) return
    el.style.height = Math.min(textareaH, 200) + 'px'
  }, [textareaH])

  const handleResizeStart = useCallback((e) => {
    e.preventDefault()
    isResizing.current = true
    resizeStartY.current = e.touches ? e.touches[0].clientY : e.clientY
    resizeStartH.current = inputRef.current?.offsetHeight || 60
    const isDesktop = window.innerWidth >= 768
    const minH = isDesktop ? 160 : 60
    const maxH = 200
    const onMove = (ev) => {
      const clientY = ev.touches ? ev.touches[0].clientY : ev.clientY
      const deltaY = clientY - resizeStartY.current
      const newH = Math.max(minH, Math.min(maxH, resizeStartH.current - deltaY))
      setTextareaH(newH)
    }
    const onEnd = () => {
      isResizing.current = false
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onEnd)
      document.removeEventListener('touchmove', onMove)
      document.removeEventListener('touchend', onEnd)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onEnd)
    document.addEventListener('touchmove', onMove, { passive: false })
    document.addEventListener('touchend', onEnd)
  }, [])

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, loading, scrollToBottom])

  const startNewConversation = useCallback(async () => {
    try {
      const conv = await createChatConversation('chat')
      setCurrentConversationId(conv.id)
      
      let welcomeContent = WELCOME_MSG
      try {
        const profile = await getUserProfile()
        const eggMatch = matchEasterEggUser(profile)
        if (eggMatch) {
          const eggWelcome = getEasterEggWelcomeMsg(eggMatch)
          if (eggWelcome) {
            welcomeContent = eggWelcome
          }
        }
      } catch (eggErr) {}
      
      setMessages([
        {
          id: Date.now(),
          isUser: false,
          content: welcomeContent,
          createdAt: new Date().toISOString(),
          isEasterEgg: welcomeContent !== WELCOME_MSG,
        },
      ])
      await addChatMessage(conv.id, { isUser: false, content: welcomeContent, role: 'assistant' })
      loadConversations()
      setShowHistory(false)
    } catch (e) {
      console.error('创建新对话失败:', e)
    }
  }, [loadConversations])

  useEffect(() => {
    const initConv = async () => {
      if (initConvRef.current) return
      initConvRef.current = true
      try {
        const conv = await getOrCreateChatConversation('chat')
        setCurrentConversationId(conv.id)
        const msgs = await getChatMessages(conv.id)
        if (msgs.length > 0) {
          setMessages(
            msgs.map((m) => ({
              id: m.id,
              isUser: m.role === 'user',
              content: m.content,
              createdAt: m.createdAt,
            }))
          )
        } else {
          let welcomeContent = WELCOME_MSG
          try {
            const profile = await getUserProfile()
            const eggMatch = matchEasterEggUser(profile)
            if (eggMatch) {
              const eggWelcome = getEasterEggWelcomeMsg(eggMatch)
              if (eggWelcome) {
                welcomeContent = eggWelcome
              }
            }
          } catch (eggErr) {}
          setMessages([{
            id: Date.now(),
            isUser: false,
            content: welcomeContent,
            createdAt: new Date().toISOString(),
            isEasterEgg: welcomeContent !== WELCOME_MSG,
          }])
          await addChatMessage(conv.id, { isUser: false, content: welcomeContent, role: 'assistant' })
        }
        loadConversations()
      } catch (e) {
        console.error('初始化对话失败:', e)
        initConvRef.current = false
      }
    }
    initConv()
  }, [loadConversations])

  const loadConversation = async (convId) => {
    try {
      setCurrentConversationId(convId)
      const msgs = await getChatMessages(convId)
      setMessages(
        msgs.map((m) => ({
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

  const handleDeleteConversation = async (e, convId) => {
    e.stopPropagation()
    if (!confirm('确定要删除这段对话吗？')) return
    try {
      await deleteChatConversation(convId)
      if (currentConversationId === convId) {
        setCurrentConversationId(null)
        setMessages([])
      }
      loadConversations()
    } catch (e) {
      console.error('删除对话失败:', e)
    }
  }

  const generateConversationTitle = (firstMsg) => {
    const text = firstMsg.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '')
    return text.slice(0, 15) || '新对话'
  }

  const handleSend = async (overrideText) => {
    const text = (overrideText ?? input).trim()
    if (!text || loading) return

    const userMsg = { id: Date.now(), isUser: true, content: text }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)

    let convId = currentConversationId
    if (!convId) {
      const conv = await createChatConversation('chat', generateConversationTitle(text))
      convId = conv.id
      setCurrentConversationId(convId)
    }

    await addChatMessage(convId, { isUser: true, content: text, role: 'user' })

    const currentMsgs = [...messages, userMsg]
    if (currentMsgs.filter((m) => m.isUser).length === 1) {
      await updateChatConversation(convId, { title: generateConversationTitle(text) })
    }

    const history = currentMsgs
      .slice(-12)
      .map((m) => ({ isUser: m.isUser, content: m.content }))
      .slice(0, -1)

    let baseDelay = 0
    if (letterDelayMode === 'immersive') {
      baseDelay = 800
    } else {
      baseDelay = 200
    }
    const startTime = Date.now()

    try {
      const result = await chatWithXiaohui(text, 'chat', history)
      const elapsed = Date.now() - startTime
      if (elapsed < baseDelay) {
        await new Promise((resolve) => setTimeout(resolve, baseDelay - elapsed))
      }

      let replyContent = result.content

      const aiMsg = {
        id: Date.now() + 1,
        isUser: false,
        content: replyContent,
        createdAt: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, aiMsg])
      await addChatMessage(convId, { isUser: false, content: replyContent, role: 'assistant' })
      loadConversations()

      try {
        const status = await getAIStatus()
        setAiStatus(status)
      } catch (e) {}
    } catch (err) {
      const errorMsg = {
        id: Date.now() + 1,
        isUser: false,
        content: '抱歉，遇到问题，请稍后再试',
      }
      setMessages((prev) => [...prev, errorMsg])
      await addChatMessage(convId, {
        isUser: false,
        content: '抱歉，遇到问题，请稍后再试',
        role: 'assistant',
      })
    }

    setLoading(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const formatTime = (dateStr) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }

  const formatDateLabel = (dateStr) => {
    const d = new Date(dateStr)
    const now = new Date()
    const isToday = d.toDateString() === now.toDateString()
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    const isYesterday = d.toDateString() === yesterday.toDateString()
    if (showFullTime) {
      const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
      return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${weekdays[d.getDay()]}`
    }
    if (isToday) return '今天'
    if (isYesterday) return '昨天'
    return `${d.getMonth() + 1}月${d.getDate()}日`
  }

  const getDateGroup = (index) => {
    if (index === 0) return messages[0]?.createdAt
    const curr = new Date(messages[index]?.createdAt).toDateString()
    const prev = new Date(messages[index - 1]?.createdAt).toDateString()
    return curr !== prev ? messages[index]?.createdAt : null
  }

  const bubbleBg = msg => {
    if (msg.isUser) return 'var(--accent)'
    return 'var(--bg)'
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 animate-fade-in" style={{ backgroundColor: 'var(--bg)' }}>
      {/* —— 顶部栏 —— */}
      <header
        className="flex items-center justify-between border-b px-4 py-3 flex-shrink-0"
        style={{ borderColor: 'var(--rule)', backgroundColor: 'var(--bg)' }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            onClick={() => setPreviewAvatar(true)}
            className="w-9 h-9 rounded-full flex-shrink-0 cursor-pointer overflow-hidden"
          >
            <img
              src={`${import.meta.env.BASE_URL}icons/xiaohui-avatar.png`}
              alt="小慧"
              draggable={false}
              style={{ width: '100%', height: '100%' }}
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-[15px] font-semibold leading-tight truncate" style={{ color: 'var(--ink)' }}>
                小慧
              </h1>
              {isEasterEggUser && (
                <span
                  className="text-[11px] px-2 py-0.5 rounded-full flex-shrink-0"
                  style={{
                    backgroundColor: '#FEF3C7',
                    color: '#D97706',
                    fontWeight: '500',
                  }}
                >
                  {easterEggUserInfo?.isDeveloper ? '创造者' : '彩蛋用户'}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: aiStatus?.enabled ? '#10b981' : 'var(--muted)' }}
              />
              <span className="text-[11px]" style={{ color: 'var(--muted)' }}>
                {aiStatus?.enabled ? '在线' : '离线'}
                {aiStatus?.enabled && aiStatus.level === 2 ? ` · 剩余${aiStatus.dailyRemaining}次` : ''}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={startNewConversation}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-colors hover:bg-[var(--bg2)] flex-shrink-0"
            title="新对话"
          >
            <Icon name="plus" size={20} color="var(--ink)" strokeWidth={1.5} />
          </button>
          <button
            onClick={() => setShowHistory(true)}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-colors hover:bg-[var(--bg2)] flex-shrink-0"
            title="历史对话"
          >
            <Icon name="clock" size={20} color="var(--ink)" strokeWidth={1.5} />
          </button>
          <button
            onClick={() => setShowLetterSpace(true)}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-colors hover:bg-[var(--bg2)] flex-shrink-0"
            title="与小慧的书信"
          >
            <Icon name="mail" size={20} color="var(--ink)" strokeWidth={1.5} />
          </button>
        </div>
      </header>

      {/* —— 消息区域 —— */}
      <div className="flex-1 overflow-y-auto px-4 pt-6 pb-5">
          {messages.map((msg, index) => {
            const dateGroup = getDateGroup(index)
            const prevMsg = index > 0 ? messages[index - 1] : null
            const isContinuation = prevMsg && prevMsg.isUser === msg.isUser && !dateGroup
            const isFirstInGroup = !isContinuation
            const showQuickReplies =
              index === 0 && !msg.isUser && messages.length === 1 && !loading

            return (
              <div key={msg.id} className="mb-3">
                {dateGroup && (
                  <div className="flex justify-center my-4">
                    <span
                      className="text-[11px] cursor-pointer transition-opacity hover:opacity-70"
                      style={{ color: 'var(--muted)' }}
                      onClick={() => setShowFullTime(!showFullTime)}
                    >
                      {formatDateLabel(dateGroup)}
                    </span>
                  </div>
                )}

                <div
                  className={`flex items-start gap-3 ${
                    msg.isUser ? 'flex-row-reverse' : 'flex-row'
                  } ${isFirstInGroup ? 'mt-5' : 'mt-1.5'}`}
                >
                  <div
                    onClick={() => !msg.isUser && setPreviewAvatar(true)}
                    className="w-11 h-11 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden"
                    style={{
                      background: msg.isUser
                        ? userAvatar
                          ? 'transparent'
                          : '#E0E0E0'
                        : 'transparent',
                      cursor: msg.isUser ? 'default' : 'pointer',
                    }}
                  >
                    {msg.isUser && userAvatar ? (
                      <img
                        src={userAvatar}
                        alt="用户头像"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : msg.isUser ? (
                      <Icon
                        name="user"
                        size={22}
                        color="#999"
                        strokeWidth={1.2}
                      />
                    ) : (
                      <div
                        className="w-11 h-11 rounded-full overflow-hidden flex-shrink-0"
                      >
                        <img
                          src={`${import.meta.env.BASE_URL}icons/xiaohui-avatar.png`}
                          alt="小慧"
                          draggable={false}
                          style={{ width: '100%', height: '100%' }}
                        />
                      </div>
                    )}
                  </div>

                  <div
                    className="flex flex-col"
                    style={{ maxWidth: msg.isUser ? '75%' : '75%' }}
                  >
                    <div
                    className="whitespace-pre-wrap break-words chat-message"
                    style={{
                      padding: '10px 18px',
                      fontSize: '15px',
                      lineHeight: '1.7',
                      minWidth: '50px',
                      backgroundColor: msg.isEasterEgg ? '#FEFCE8' : bubbleBg(msg),
                      color: msg.isEasterEgg ? '#92400E' : (msg.isUser ? 'white' : 'var(--ink)'),
                      borderRadius: msg.isUser
                        ? '4px 20px 20px 20px'
                        : '20px 4px 20px 20px',
                      border: msg.isEasterEgg ? '1px solid #FDE68A' : (msg.isUser ? 'none' : '1px solid var(--rule)'),
                      boxShadow: msg.isEasterEgg ? '0 2px 12px rgba(251, 191, 36, 0.25)' : (msg.isUser ? '0 2px 10px rgba(93, 173, 226, 0.30)' : 'none'),
                    }}
                  >
                    {msg.content}
                  </div>
                    {(msg.createdAt && !isContinuation) && (
                      <div
                        className="text-[11px] mt-1.5"
                        style={{
                          color: 'var(--muted)',
                          textAlign: msg.isUser ? 'right' : 'left',
                        }}
                      >
                        {formatTime(msg.createdAt)}
                      </div>
                    )}
                  </div>
                </div>

                {showQuickReplies && (
                  <div className="flex flex-wrap gap-1.5 mt-5 mb-1.5" style={{ paddingLeft: '56px' }}>
                    {QUICK_REPLIES.map((q) => (
                      <button
                        key={q}
                        onClick={() => handleSend(q)}
                        className="text-[13px] rounded-full transition-all duration-200 border hover:scale-[1.02] active:scale-95"
                        style={{
                          backgroundColor: 'var(--bg)',
                          color: 'var(--accent)',
                          borderColor: 'var(--accent)',
                          paddingLeft: '12px',
                          paddingRight: '12px',
                          paddingTop: '6px',
                          paddingBottom: '6px',
                        }}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}

          {loading && (
            <div className="flex items-end mb-3">
              <div
                className="w-10 h-10 rounded-full flex-shrink-0 overflow-hidden"
              >
                <img
                  src={`${import.meta.env.BASE_URL}icons/xiaohui-avatar.png`}
                  alt="小慧"
                  draggable={false}
                  style={{ width: '100%', height: '100%' }}
                />
              </div>
              <div className="flex flex-col gap-1 ml-2">
                <div
                  className="px-4 py-3 rounded-[18px] rounded-tl-sm"
                  style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--rule)' }}
                >
                  <div className="flex gap-1.5 items-center">
                    {[0, 150, 300].map((delay) => (
                      <span
                        key={delay}
                        className="w-2 h-2 rounded-full"
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

          <div ref={messagesEndRef} className="h-4" />
      </div>

      {/* —— 输入区域（微信风格） —— */}
      <div
        className="flex-shrink-0 px-6 md:px-4 pt-2 pb-6 md:pb-5 border-t"
        style={{ borderColor: 'var(--rule)', backgroundColor: 'var(--bg)' }}
      >
        {/* 拖拽手柄 */}
        <div
          className="flex justify-center pb-1.5 cursor-ns-resize"
          onMouseDown={handleResizeStart}
          onTouchStart={handleResizeStart}
        >
          <div
            className="rounded-full"
            style={{ width: '32px', height: '4px', backgroundColor: 'var(--rule)' }}
          />
        </div>
        <div className="flex items-end gap-2">
          {/* 麦克风按钮 */}
          <button
            onClick={toggleRecording}
            className="w-10 h-10 md:w-0 md:h-0 md:opacity-0 md:pointer-events-none rounded-full flex items-center justify-center flex-shrink-0 transition-all hover:bg-[var(--bg2)] active:scale-95 relative"
            title={isRecording ? '点击停止' : '语音输入'}
          >
            {isRecording && (
              <span className="absolute inset-0 rounded-full animate-ping opacity-30" style={{ backgroundColor: '#EF4444' }} />
            )}
            {isRecording && (
              <span className="absolute inset-0 rounded-full" style={{ backgroundColor: '#FEE2E2' }} />
            )}
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={isRecording ? '#EF4444' : 'var(--muted)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="relative z-10">
              <rect x="9" y="1" width="6" height="11" rx="3" />
              <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          </button>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder=""
            rows={2}
            className="flex-1 px-4 py-3 rounded-2xl text-[15px] outline-none transition-colors resize-none min-h-[60px] md:min-h-[160px]"
            style={{
              backgroundColor: 'var(--bg2)',
              color: 'var(--ink)',
              maxHeight: '200px',
              lineHeight: '1.5',
              resize: 'none',
            }}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
            className="px-4 py-2 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all duration-200 disabled:opacity-40 active:scale-95 text-[14px] font-medium"
            style={{
              background: input.trim() ? 'var(--send-btn-gradient)' : 'var(--bg2)',
              color: input.trim() ? 'white' : 'var(--muted)',
              minHeight: '44px',
            }}
          >
            发送
          </button>
        </div>
      </div>

      {/* —— 历史对话抽屉（右侧） —— */}
      {showHistory && (
        <>
          <div
            className="fixed inset-0 z-40 animate-fade-in"
            style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
            onClick={() => setShowHistory(false)}
          />
          <aside
            className="fixed right-0 top-0 bottom-0 z-50 w-72 max-w-[80vw] flex flex-col animate-slide-in-right"
            style={{ backgroundColor: 'var(--bg)' }}
          >
            <div
              className="flex items-center justify-between px-4 py-4 border-b flex-shrink-0"
              style={{ borderColor: 'var(--rule)' }}
            >
              <h2 className="text-[15px] font-semibold" style={{ color: 'var(--ink)' }}>
                历史对话
              </h2>
              <button
                onClick={() => setShowHistory(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-[var(--bg2)]"
                title="关闭"
              >
                <Icon name="x" size={18} color="var(--ink)" strokeWidth={1.5} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              <p className="text-[11px] px-2 py-2" style={{ color: 'var(--muted)' }}>
                闲聊 · 共 {conversations.length} 条
              </p>
              {conversations.length === 0 ? (
                <div className="text-center py-12">
                  <Icon name="chat" size={28} color="var(--rule)" />
                  <p className="text-sm mt-2" style={{ color: 'var(--muted)' }}>
                    还没有历史对话
                  </p>
                </div>
              ) : (
                conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => loadConversation(conv.id)}
                    className="w-full px-3 py-3 rounded-xl text-left flex items-start justify-between transition-colors group"
                    style={{
                      backgroundColor:
                        currentConversationId === conv.id ? 'var(--accent-light)' : 'transparent',
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-[13px] font-medium truncate"
                        style={{
                          color: currentConversationId === conv.id ? 'var(--accent)' : 'var(--ink)',
                        }}
                      >
                        {conv.title || '新对话'}
                      </p>
                      <p className="text-[11px] mt-0.5" style={{ color: 'var(--muted)' }}>
                        {formatTime(conv.updatedAt)} · {conv.messageCount || 0} 条
                      </p>
                    </div>
                    <button
                      onClick={(e) => handleDeleteConversation(e, conv.id)}
                      className="opacity-0 group-hover:opacity-100 ml-2 mt-0.5 transition-opacity flex-shrink-0"
                      title="删除"
                    >
                      <Icon name="trash" size={14} color="var(--ink)" strokeWidth={1.5} />
                    </button>
                  </button>
                ))
              )}
            </div>
          </aside>
        </>
      )}
      {showLetterSpace && createPortal(
        <div
          className="fixed inset-0 z-50 overflow-y-auto"
          style={{
            backgroundColor: '#FFF8E7',
            animation: letterClosing
              ? 'fade-out 0.28s ease-in forwards'
              : 'fade-in 0.3s ease-out',
          }}
        >
          <div className="max-w-4xl" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
            <XiaohuiLetterSpace onClose={handleCloseLetterSpace} />
          </div>
        </div>,
        document.body
      )}
      {previewAvatar && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => setPreviewAvatar(false)}
        >
          <div
            className="relative flex items-center justify-center"
            style={{
              width: 'min(80vw, 360px)',
              height: 'min(80vw, 360px)',
              backgroundColor: '#ffffff',
              borderRadius: '24px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
              padding: '16px',
              animation: 'fade-in 0.2s ease-out',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={`${import.meta.env.BASE_URL}icons/xiaohui-avatar.png`}
              alt="小慧头像"
              style={{ width: '100%', height: '100%', display: 'block' }}
            />
            <button
              onClick={() => setPreviewAvatar(false)}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

export default XiaohuiPage

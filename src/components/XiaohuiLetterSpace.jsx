import { useState, useEffect, useRef, useCallback } from 'react'
import Icon from './ui/Icon'
import {
  getLetters,
  markLetterRead,
} from '../db/database'
import {
  sendUserLetter,
  checkAndGenerateLetters,
  formatLetterDate,
  getUnreadLetterCount,
} from '../utils/letterService'

const LETTER_BG = '#FFF8E7'
const LETTER_LINE = '#E8DCC8'
const LETTER_INK = '#5C4B37'
const ACCENT = '#D4A574'

export default function XiaohuiLetterSpace({ onClose }) {
  const [tab, setTab] = useState('inbox')
  const [letters, setLetters] = useState([])
  const [selectedLetter, setSelectedLetter] = useState(null)
  const [subject, setSubject] = useState('')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const editorRef = useRef(null)

  const loadLetters = useCallback(async () => {
    const all = await getLetters({}, 100)
    setLetters(all)
    setUnreadCount(await getUnreadLetterCount())
  }, [])

  useEffect(() => {
    loadLetters()
    checkAndGenerateLetters().then((generated) => {
      if (generated.length > 0) loadLetters()
    })
  }, [loadLetters])

  const handleSend = async () => {
    const text = content.trim()
    if (!text || loading) return
    setLoading(true)
    await sendUserLetter(text, subject.trim())
    setContent('')
    setSubject('')
    if (editorRef.current) editorRef.current.innerHTML = ''
    await loadLetters()
    setTab('inbox')
    setLoading(false)
  }

  const handleSelectLetter = async (letter) => {
    setSelectedLetter(letter)
    if (letter.status === 'unread') {
      await markLetterRead(letter.id)
      await loadLetters()
    }
  }

  const applyFormat = (command) => {
    document.execCommand(command, false, null)
    editorRef.current?.focus()
  }

  const handleEditorInput = () => {
    setContent(editorRef.current?.innerHTML || '')
  }

  if (selectedLetter) {
    return (
      <LetterReader
        letter={selectedLetter}
        onBack={() => setSelectedLetter(null)}
      />
    )
  }

  return (
    <div
      className="w-full min-h-screen flex flex-col"
      style={{ color: LETTER_INK }}
    >
      <style>{`
        .letter-editor:empty::before {
          content: attr(data-placeholder);
          color: #A8987E;
          pointer-events: none;
        }
      `}</style>
      {/* 顶部栏 */}
      <header className="flex items-center px-4 py-3 flex-shrink-0 border-b sticky top-0 z-10" style={{ borderColor: LETTER_LINE, backgroundColor: LETTER_BG }}>
        <button onClick={onClose} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-black/5">
          <Icon name="arrow-left" size={20} color={LETTER_INK} />
        </button>
        <h1 className="ml-3 text-[17px] font-semibold">与小慧的书信</h1>
      </header>

      {/* Tab 切换 */}
      <div className="flex items-center justify-center gap-2 px-4 py-3 flex-shrink-0">
        <button
          onClick={() => setTab('inbox')}
          className="flex items-center gap-2 px-5 py-2 rounded-full text-[14px] font-medium transition-all"
          style={{
            backgroundColor: tab === 'inbox' ? ACCENT : 'transparent',
            color: tab === 'inbox' ? '#fff' : LETTER_INK,
            border: `1px solid ${tab === 'inbox' ? ACCENT : LETTER_LINE}`,
          }}
        >
          <Icon name="mail" size={16} color={tab === 'inbox' ? '#fff' : LETTER_INK} />
          信箱
          {unreadCount > 0 && (
            <span className="ml-1 w-5 h-5 rounded-full bg-red-500 text-white text-[11px] flex items-center justify-center">{unreadCount}</span>
          )}
        </button>
        <button
          onClick={() => setTab('write')}
          className="flex items-center gap-2 px-5 py-2 rounded-full text-[14px] font-medium transition-all"
          style={{
            backgroundColor: tab === 'write' ? ACCENT : 'transparent',
            color: tab === 'write' ? '#fff' : LETTER_INK,
            border: `1px solid ${tab === 'write' ? ACCENT : LETTER_LINE}`,
          }}
        >
          <Icon name="quill" size={16} color={tab === 'write' ? '#fff' : LETTER_INK} />
          写信
        </button>
      </div>

      {/* 内容区 */}
      <div className="flex-1 pb-6">
        {tab === 'inbox' ? (
          <LetterBox letters={letters} onSelect={handleSelectLetter} />
        ) : (
          <LetterWriter
            subject={subject}
            setSubject={setSubject}
            editorRef={editorRef}
            applyFormat={applyFormat}
            onInput={handleEditorInput}
            onSend={handleSend}
            loading={loading}
          />
        )}
      </div>
    </div>
  )
}

function LetterBox({ letters, onSelect }) {
  const userLetters = letters.filter(l => l.type === 'user_to_xiaohui')
  const xiaohuiLetters = letters.filter(l => l.type === 'xiaohui_to_user')

  return (
    <div className="space-y-5 pt-2 px-4">
      {xiaohuiLetters.length === 0 && userLetters.length === 0 && (
        <div className="text-center py-20">
          <Icon name="mail" size={48} color={ACCENT} />
          <p className="mt-4 text-[15px]" style={{ color: LETTER_INK }}>信箱还是空的</p>
          <p className="text-[13px] mt-1" style={{ color: '#9E8B72' }}>写一封信给小慧，或者等她写给你</p>
        </div>
      )}

      {xiaohuiLetters.length > 0 && (
        <section>
          <h2 className="text-[13px] font-medium mb-3 px-1" style={{ color: '#9E8B72' }}>小慧的来信</h2>
          <div className="space-y-3">
            {xiaohuiLetters.map(letter => (
              <LetterCard key={letter.id} letter={letter} onSelect={onSelect} />
            ))}
          </div>
        </section>
      )}

      {userLetters.length > 0 && (
        <section>
          <h2 className="text-[13px] font-medium mb-3 px-1" style={{ color: '#9E8B72' }}>我寄出的信</h2>
          <div className="space-y-3">
            {userLetters.map(letter => (
              <LetterCard key={letter.id} letter={letter} onSelect={onSelect} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function LetterCard({ letter, onSelect }) {
  const isUnread = letter.status === 'unread'
  const date = new Date(letter.createdAt).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })
  const textContent = letter.content.replace(/<[^>]*>/g, '')
  const preview = textContent.slice(0, 60) + (textContent.length > 60 ? '...' : '')

  return (
    <button
      onClick={() => onSelect(letter)}
      className="w-full text-left rounded-2xl p-6 transition-all hover:shadow-md relative"
      style={{
        backgroundColor: '#FFFDF5',
        border: `1px solid ${LETTER_LINE}`,
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-[16px] font-semibold truncate" style={{ color: LETTER_INK }}>
            {letter.subject || '无题'}
          </p>
          <p className="text-[14px] mt-2 leading-relaxed" style={{ color: '#7D6B52' }}>{preview}</p>
          <p className="text-[12px] mt-3" style={{ color: '#A8987E' }}>{date} · {letter.trigger ? triggerLabel(letter.trigger) : '我寄出的'}</p>
        </div>
        {isUnread && <span className="w-3 h-3 rounded-full bg-red-500 flex-shrink-0 mt-2" />}
      </div>
    </button>
  )
}

function triggerLabel(trigger) {
  const map = {
    monthly: '月度来信',
    annual: '年度来信',
    birthday: '生日祝福',
    spring_festival: '春节祝福',
    mid_autumn: '中秋祝福',
    reply: '回信',
  }
  return map[trigger] || '小慧来信'
}

function LetterWriter({ subject, setSubject, editorRef, applyFormat, onInput, onSend, loading }) {
  const tools = [
    { icon: 'bold', cmd: 'bold', title: '加粗' },
    { icon: 'italic', cmd: 'italic', title: '斜体' },
    { icon: 'underline', cmd: 'underline', title: '下划线' },
    { icon: 'highlight', cmd: 'hiliteColor', title: '高亮' },
    { icon: 'indent-increase', cmd: 'indent', title: '缩进' },
    { icon: 'horizontal-rule', cmd: 'insertHorizontalRule', title: '分隔线' },
  ]

  return (
    <div className="pt-2 space-y-4 px-4">
      <input
        type="text"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        placeholder="信的主题（可选）"
        className="w-full px-4 py-3 rounded-xl text-[15px] outline-none bg-transparent border"
        style={{ borderColor: LETTER_LINE, color: LETTER_INK }}
      />

      {/* 工具栏 */}
      <div className="flex items-center gap-1 px-1">
        {tools.map(t => (
          <button
            key={t.cmd}
            onMouseDown={(e) => {
              e.preventDefault()
              applyFormat(t.cmd)
            }}
            title={t.title}
            className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-black/5 transition-colors"
          >
            <Icon name={t.icon} size={18} color={LETTER_INK} />
          </button>
        ))}
      </div>

      {/* 信纸编辑区 */}
      <div
        className="rounded-2xl border min-h-[400px] p-6 relative"
        style={{
          backgroundColor: '#FFFDF5',
          borderColor: LETTER_LINE,
          backgroundImage: `repeating-linear-gradient(transparent, transparent 31px, ${LETTER_LINE} 31px, ${LETTER_LINE} 32px)`,
          backgroundSize: '100% 32px',
        }}
      >
        <div
          ref={editorRef}
          contentEditable
          onInput={onInput}
          className="letter-editor w-full min-h-[360px] outline-none text-[16px] leading-[32px] whitespace-pre-wrap"
          style={{ color: LETTER_INK }}
          data-placeholder="写点什么给小慧..."
        />
      </div>

      <button
        onClick={onSend}
        disabled={loading}
        className="w-full py-3 rounded-xl text-[15px] font-medium text-white transition-all active:scale-[0.98] disabled:opacity-50"
        style={{ backgroundColor: ACCENT }}
      >
        {loading ? '投递中...' : '投入信箱'}
      </button>
    </div>
  )
}

function LetterReader({ letter, onBack }) {
  const isFromUser = letter.type === 'user_to_xiaohui'
  const date = formatLetterDate(new Date(letter.createdAt))

  return (
    <div className="w-full min-h-screen flex flex-col">
      <header className="flex items-center px-4 py-3 flex-shrink-0 border-b sticky top-0 z-10" style={{ borderColor: LETTER_LINE, backgroundColor: LETTER_BG }}>
        <button onClick={onBack} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-black/5">
          <Icon name="arrow-left" size={20} color={LETTER_INK} />
        </button>
        <h1 className="ml-3 text-[16px] font-semibold truncate" style={{ color: LETTER_INK }}>{letter.subject || '无题'}</h1>
      </header>

      <div className="flex-1 py-6 px-4">
        <div
          className="mx-auto rounded-2xl border min-h-[70vh] overflow-hidden"
          style={{
            backgroundColor: '#FFFDF5',
            borderColor: LETTER_LINE,
            width: '100%',
            maxWidth: '768px',
          }}
        >
          <div
            className="px-8 pt-8 pb-8"
            style={{
              backgroundImage: `repeating-linear-gradient(transparent, transparent 31px, ${LETTER_LINE} 31px, ${LETTER_LINE} 32px)`,
              backgroundSize: '100% 32px',
              backgroundPosition: '0 24px',
            }}
          >
            {!isFromUser && (
              <div className="leading-[32px]" style={{ fontSize: '15px', color: LETTER_INK }}>致 我的朋友：</div>
            )}
            {isFromUser ? (
              <div
                className="leading-[32px] whitespace-pre-wrap"
                style={{ fontSize: '16px', color: LETTER_INK }}
                dangerouslySetInnerHTML={{ __html: letter.content }}
              />
            ) : (
              <div
                className="leading-[32px] whitespace-pre-wrap"
                style={{ fontSize: '16px', color: LETTER_INK }}
              >
                {letter.content}
              </div>
            )}
            {!isFromUser && (
              <div className="text-right leading-[32px]" style={{ fontSize: '15px', color: LETTER_INK }}>
                <div>—— 小慧</div>
                <div style={{ fontSize: '13px', color: '#9E8B72' }}>{date}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

import { useState, useEffect, useRef } from 'react'
import { EMOTIONS } from '../../constants/emotions'
import { saveRecord } from '../../db/database'
import Icon from '../ui/Icon'

function MoodSelector({ onSaved, customDate, editRecord }) {
  const [mode, setMode] = useState('quick') // quick | detailed
  const [isExpanded, setIsExpanded] = useState(false)
  const [selectedEmotions, setSelectedEmotions] = useState([])
  const [intensity, setIntensity] = useState(3)
  const [note, setNote] = useState('')
  const [tags, setTags] = useState('')
  const [saveStatus, setSaveStatus] = useState('idle')
  const [currentRecordId, setCurrentRecordId] = useState(null)
  const [hoveredEmotion, setHoveredEmotion] = useState(null)
  const [bubbleSize, setBubbleSize] = useState(72)
  const [centerSize, setCenterSize] = useState(160)
  const bubbleContainerRef = useRef(null)

  useEffect(() => {
    if (editRecord) {
      setSelectedEmotions(editRecord.emotions || [])
      setIntensity(editRecord.intensity || 3)
      setNote(editRecord.content || '')
      setTags((editRecord.tags || []).join(', '))
      setCurrentRecordId(editRecord.id)
      setIsExpanded(true)
      setMode('detailed')
    }
  }, [editRecord])

  const toggleEmotion = (emotionName) => {
    setSelectedEmotions(prev => {
      if (prev.includes(emotionName)) {
        return prev.filter(e => e !== emotionName)
      }
      return [...prev, emotionName]
    })
  }

  const handleSave = async () => {
    if (selectedEmotions.length === 0) return

    setSaveStatus('saving')

    try {
      const timestamp = customDate ? customDate.getTime() : Date.now()
      const record = {
        id: currentRecordId || `mood_${timestamp}`,
        type: 'mood',
        emotions: selectedEmotions,
        intensity,
        content: note.trim(),
        tags: tags ? tags.split(',').map(t => t.trim()).filter(t => t) : [],
      }

      if (customDate && !currentRecordId) {
        record.createdAt = customDate.toISOString()
      }

      const saved = await saveRecord(record)
      setCurrentRecordId(saved.id)
      setSaveStatus('saved')

      if (onSaved) {
        onSaved(saved)
      }

      setTimeout(() => {
        setSaveStatus('idle')
        if (!currentRecordId) {
          setSelectedEmotions([])
          setIsExpanded(false)
          setNote('')
          setIntensity(3)
        }
      }, 1500)
    } catch (error) {
      console.error('保存失败:', error)
      setSaveStatus('error')
    }
  }

  useEffect(() => {
    const updateSizes = () => {
      const isMobile = window.innerWidth < 768
      if (isMobile) {
        const containerWidth = Math.min(window.innerWidth - 32, 500)
        setBubbleSize(Math.min(72, containerWidth * 0.144))
        setCenterSize(Math.min(160, containerWidth * 0.32))
      } else {
        setBubbleSize(72)
        setCenterSize(160)
      }
    }
    updateSizes()
    window.addEventListener('resize', updateSizes)
    return () => window.removeEventListener('resize', updateSizes)
  }, [])

  const getEmotionPosition = (index, containerSize = 500) => {
    const angle = (index / EMOTIONS.length) * Math.PI * 2 - Math.PI / 2
    const radius = containerSize * 0.38
    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    }
  }

  const getIntensityLabel = () => {
    const labels = ['', '轻微', '有点', '一般', '强烈', '非常']
    return labels[intensity] || '一般'
  }

  return (
    <div className="w-full flex flex-col items-center animate-fade-in">
      {/* 模式切换 - 胶囊分段控制器 */}
      {!editRecord && (
        <div className="w-full max-w-[900px] flex justify-end mb-6">
          <div className="huiji-segmented">
            <button
              onClick={() => setMode('quick')}
              className={mode === 'quick' ? 'active' : ''}
            >
              快速
            </button>
            <button
              onClick={() => setMode('detailed')}
              className={mode === 'detailed' ? 'active' : ''}
            >
              详细
            </button>
          </div>
        </div>
      )}

      {/* 快速打卡模式 - 网格多选 */}
      {mode === 'quick' && !editRecord && (
        <div className="w-full flex flex-col items-center justify-center" style={{ minHeight: '60vh' }}>
          <div className="w-full max-w-[900px]">
            <div className="grid grid-cols-4 gap-3 md:gap-6">
              {EMOTIONS.map(emotion => {
                const isSelected = selectedEmotions.includes(emotion.name)
                const isHovered = hoveredEmotion === emotion.name
                const bgColor = isSelected
                  ? emotion.color + '20'
                  : isHovered
                    ? emotion.color + '15'
                    : 'var(--accent-light)'
                const iconColor = isSelected
                  ? emotion.color
                  : isHovered
                    ? emotion.color
                    : 'var(--muted)'
                const iconStroke = isSelected ? 2.5 : 1.5

                return (
                  <button
                    key={emotion.name}
                    onClick={() => toggleEmotion(emotion.name)}
                    onMouseEnter={() => setHoveredEmotion(emotion.name)}
                    onMouseLeave={() => setHoveredEmotion(null)}
                    className="flex flex-col items-center justify-center rounded-[8px] transition-all duration-200"
                    style={{
                      height: 'clamp(90px, 22vw, 160px)',
                      backgroundColor: bgColor,
                      border: isSelected ? `2px solid ${emotion.color}` : '2px solid transparent',
                    }}
                  >
                    <Icon
                      name={emotion.iconName}
                      size="clamp(28px, 8vw, 48px)"
                      color={iconColor}
                      strokeWidth={iconStroke}
                    />
                    <span
                      className="font-medium"
                      style={{
                        color: isSelected ? emotion.color : 'var(--ink)',
                        fontSize: 'clamp(11px, 3.5vw, 14px)',
                        marginTop: 'clamp(4px, 1.5vw, 8px)',
                      }}
                    >
                      {emotion.name}
                    </span>
                  </button>
                )
              })}
            </div>
            {/* 提示文字 */}
            <p className="text-center" style={{ color: 'var(--muted)', fontSize: '14px', marginTop: '24px' }}>
              点击选择你现在的情绪（可多选）
            </p>
            {/* 保存按钮 */}
            {selectedEmotions.length > 0 && (
              <div className="flex justify-center" style={{ marginTop: '24px' }}>
                <button
                  onClick={handleSave}
                  disabled={saveStatus === 'saving'}
                  className="huiji-btn-primary"
                >
                  {saveStatus === 'saving' ? '保存中...' : saveStatus === 'saved' ? '已保存' : `确认选择（${selectedEmotions.length}）`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 详细记录模式 */}
      {(mode === 'detailed' || editRecord) && (
        <>
          {/* 气泡选择器 */}
          <div
            ref={bubbleContainerRef}
            className="relative w-full max-w-[500px] aspect-square mx-auto flex items-center justify-center mb-8"
          >
            {/* 中央气泡 */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="relative z-10 rounded-full flex items-center justify-center transition-colors duration-300 flex-shrink-0"
              style={{
                width: `${centerSize}px`,
                height: `${centerSize}px`,
                backgroundColor: selectedEmotions.length > 0
                  ? (EMOTIONS.find(e => e.name === selectedEmotions[0])?.color || 'var(--accent)') + '20'
                  : 'var(--bg2)',
              }}
            >
              {selectedEmotions.length === 0 ? (
                <Icon name="mood" size={centerSize * 0.25} color="var(--muted)" />
              ) : selectedEmotions.length === 1 ? (
                <Icon
                  name={EMOTIONS.find(e => e.name === selectedEmotions[0])?.iconName || 'mood'}
                  size={centerSize * 0.325}
                  color={EMOTIONS.find(e => e.name === selectedEmotions[0])?.color || 'var(--accent)'}
                  strokeWidth={1.5}
                />
              ) : (
                <span className="text-base font-medium" style={{ color: EMOTIONS.find(e => e.name === selectedEmotions[0])?.color || 'var(--accent)' }}>
                  已选 {selectedEmotions.length} 种情绪
                </span>
              )}

              {/* 选中数量角标 */}
              {selectedEmotions.length > 1 && (
                <span
                  className="absolute -top-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ backgroundColor: 'var(--accent2)' }}
                >
                  {selectedEmotions.length}
                </span>
              )}
            </button>

            {/* 环绕情绪气泡 */}
            {EMOTIONS.map((emotion, index) => {
              const containerSize = bubbleContainerRef.current?.offsetWidth || 500
              const pos = getEmotionPosition(index, containerSize)
              const isSelected = selectedEmotions.includes(emotion.name)
              const iconSize = bubbleSize * 0.305

              return (
                <button
                  key={emotion.name}
                  onClick={() => toggleEmotion(emotion.name)}
                  className={`absolute rounded-full flex flex-col items-center justify-center transition-all duration-500 ${
                    isExpanded ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
                  }`}
                  style={{
                    width: `${bubbleSize}px`,
                    height: `${bubbleSize}px`,
                    fontSize: `${Math.max(11, bubbleSize * 0.16)}px`,
                    transform: isExpanded
                      ? `translate(${pos.x}px, ${pos.y}px) scale(${isSelected ? 1.15 : 1})`
                      : 'translate(0, 0) scale(0)',
                    backgroundColor: isSelected ? emotion.color : 'var(--bg2)',
                    border: isSelected ? `2px solid ${emotion.color}` : '1px solid var(--rule)',
                  }}
                >
                  <Icon name={emotion.iconName} size={iconSize} color={isSelected ? 'white' : 'var(--ink)'} strokeWidth={1.5} />
                  <span className="font-medium mt-0.5" style={{ color: isSelected ? 'white' : 'var(--ink)' }}>
                    {emotion.name}
                  </span>
                </button>
              )
            })}
          </div>

          {/* 提示文字 */}
          <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
            {isExpanded
              ? selectedEmotions.length > 0
                ? `已选择 ${selectedEmotions.length} 种情绪`
                : '点击选择你现在的情绪（可多选）'
              : '点击中央气泡开始选择'
            }
          </p>

          {/* 确认选择按钮 */}
          {isExpanded && selectedEmotions.length > 0 && (
            <button
              onClick={handleSave}
              disabled={saveStatus === 'saving'}
              className="huiji-btn-primary mt-6"
            >
              {saveStatus === 'saving' ? '保存中...' : saveStatus === 'saved' ? '已保存' : '确认选择'}
            </button>
          )}

          {/* 已选情绪标签 */}
          {isExpanded && selectedEmotions.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2 mb-6">
              {selectedEmotions.map(name => {
                const emotion = EMOTIONS.find(e => e.name === name)
                return (
                  <span
                    key={name}
                    className="px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1"
                    style={{
                      backgroundColor: emotion?.color || 'var(--accent)',
                      color: '#333',
                    }}
                  >
                    <Icon name={emotion?.iconName} size={14} color="#333" strokeWidth={1.5} />
                    <span>{name}</span>
                  </span>
                )
              })}
            </div>
          )}

          {/* 展开后显示强度和备注 */}
          {isExpanded && selectedEmotions.length > 0 && (
            <div className="w-full max-w-md space-y-6 animate-fade-in">
              {/* 强度滑块 */}
              <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--bg2)' }}>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
                    情绪强度
                  </span>
                  <span
                    className="text-sm font-medium px-3 py-1 rounded-full"
                    style={{
                      backgroundColor: 'var(--bg)',
                      color: 'var(--accent)',
                    }}
                  >
                    {getIntensityLabel()}
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={intensity}
                  onChange={(e) => setIntensity(Number(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, var(--accent) 0%, var(--accent) ${(intensity - 1) * 25}%, var(--rule) ${(intensity - 1) * 25}%, var(--rule) 100%)`,
                  }}
                />
                <div className="flex justify-between mt-2 text-xs" style={{ color: 'var(--muted)' }}>
                  <span>轻微</span>
                  <span>强烈</span>
                </div>
              </div>

              {/* 备注输入 */}
              <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--bg2)' }}>
                <p className="text-sm font-medium mb-3" style={{ color: 'var(--ink)' }}>
                  备注（选填）
                </p>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="记录一下此刻的想法..."
                  className="w-full h-24 bg-transparent resize-none outline-none text-sm"
                  style={{
                    color: 'var(--ink)',
                    caretColor: 'var(--accent)',
                  }}
                />
              </div>

              {/* 标签输入 */}
              <div
                className="p-4 rounded-xl flex items-center gap-3"
                style={{ backgroundColor: 'var(--bg2)' }}
              >
                <span className="text-sm flex-shrink-0" style={{ color: 'var(--muted)' }}>标签</span>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="用逗号分隔，如：工作,心情"
                  className="flex-1 bg-transparent outline-none text-sm"
                  style={{ color: 'var(--ink)' }}
                />
              </div>

              {/* 保存按钮 */}
              <button
                onClick={handleSave}
                disabled={saveStatus === 'saving'}
                className="w-full py-4 rounded-xl text-white font-medium transition-colors duration-200 disabled:opacity-50"
                style={{
                  backgroundColor: 'var(--accent)',
                }}
              >
                {saveStatus === 'saving' ? '保存中...' : saveStatus === 'saved' ? '已保存' : '记录心情'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default MoodSelector

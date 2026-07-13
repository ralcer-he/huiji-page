import { useState, useEffect } from 'react'
import { getSetting, saveSetting } from '../../db/database'
import Toggle from '../ui/Toggle'
import Collapsible from '../ui/Collapsible'

const MEMORY_SCOPE_OPTIONS = [
  { value: 'today', label: '当天' },
  { value: 'month', label: '当月' },
  { value: 'year', label: '当年' },
  { value: 'all', label: '全部' },
]

function XiaohuiSettingsPanel() {
  const [longTermMemory, setLongTermMemory] = useState(true)
  const [memoryScope, setMemoryScope] = useState('all')
  const [autoRetrieveRecords, setAutoRetrieveRecords] = useState(true)
  const [useEmotionContext, setUseEmotionContext] = useState(true)
  const [useProfileContext, setUseProfileContext] = useState(true)
  const [chatHistoryCount, setChatHistoryCount] = useState(10)
  const [temperature, setTemperature] = useState(0.8)
  const [maxTokens, setMaxTokens] = useState(512)
  const [autoSaveChat, setAutoSaveChat] = useState(true)
  const [streamResponse, setStreamResponse] = useState(true)
  const [letterDelayMode, setLetterDelayMode] = useState('immersive')

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    const ltm = await getSetting('xiaohui_longTermMemory')
    const scope = await getSetting('xiaohui_memoryScope')
    const autoRetrieve = await getSetting('xiaohui_autoRetrieveRecords')
    const emotionContext = await getSetting('xiaohui_useEmotionContext')
    const profileContext = await getSetting('xiaohui_useProfileContext')
    const historyCount = await getSetting('xiaohui_chatHistoryCount')
    const temp = await getSetting('xiaohui_temperature')
    const maxT = await getSetting('xiaohui_maxTokens')
    const autoSave = await getSetting('xiaohui_autoSaveChat')
    const stream = await getSetting('xiaohui_streamResponse')
    const delayMode = await getSetting('letterDelayMode')
    
    if (ltm !== undefined) setLongTermMemory(ltm)
    if (scope) setMemoryScope(scope)
    if (autoRetrieve !== undefined) setAutoRetrieveRecords(autoRetrieve)
    if (emotionContext !== undefined) setUseEmotionContext(emotionContext)
    if (profileContext !== undefined) setUseProfileContext(profileContext)
    if (historyCount) setChatHistoryCount(historyCount)
    if (temp !== undefined) setTemperature(temp)
    if (maxT) setMaxTokens(maxT)
    if (autoSave !== undefined) setAutoSaveChat(autoSave)
    if (stream !== undefined) setStreamResponse(stream)
    if (delayMode) setLetterDelayMode(delayMode)
  }

  return (
    <div>
      <h3 className="text-sm font-medium px-5 pt-5 pb-3" style={{ color: 'var(--ink)' }}>小慧</h3>

      <Collapsible title="记忆与上下文" iconName="sparkle" hint="控制小慧的知识来源" buttonStyle={{ height: '48px' }}>
        <div className="space-y-3">
          <div className="flex items-center justify-between h-12 px-4 rounded-[8px]" style={{ backgroundColor: 'var(--bg)' }}>
            <div>
              <span className="text-sm" style={{ color: 'var(--ink)' }}>长期记忆</span>
              <span className="text-xs ml-2" style={{ color: 'var(--muted)' }}>可能消耗更多 token</span>
            </div>
            <Toggle
              checked={longTermMemory}
              onChange={async (val) => {
                setLongTermMemory(val)
                await saveSetting('xiaohui_longTermMemory', val)
              }}
            />
          </div>

          <div className="flex items-center justify-between h-12 px-4 rounded-[8px]" style={{ backgroundColor: 'var(--bg)' }}>
            <span className="text-sm" style={{ color: 'var(--ink)' }}>自动检索日记记录</span>
            <Toggle
              checked={autoRetrieveRecords}
              onChange={async (val) => {
                setAutoRetrieveRecords(val)
                await saveSetting('xiaohui_autoRetrieveRecords', val)
              }}
            />
          </div>

          {autoRetrieveRecords && (
            <div className="flex items-center justify-between h-12 px-4 rounded-[8px]" style={{ backgroundColor: 'var(--bg)' }}>
              <span className="text-sm" style={{ color: 'var(--ink)' }}>检索时间范围</span>
              <div className="flex gap-1.5">
                {MEMORY_SCOPE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={async () => {
                      setMemoryScope(opt.value)
                      await saveSetting('xiaohui_memoryScope', opt.value)
                    }}
                    className="flex items-center justify-center w-10 h-7 rounded-lg text-xs font-medium transition-all"
                    style={{
                      backgroundColor: memoryScope === opt.value ? 'var(--accent)' : 'transparent',
                      color: memoryScope === opt.value ? '#fff' : 'var(--ink)',
                      border: '1px solid var(--rule)',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between h-12 px-4 rounded-[8px]" style={{ backgroundColor: 'var(--bg)' }}>
            <span className="text-sm" style={{ color: 'var(--ink)' }}>情绪上下文</span>
            <Toggle
              checked={useEmotionContext}
              onChange={async (val) => {
                setUseEmotionContext(val)
                await saveSetting('xiaohui_useEmotionContext', val)
              }}
            />
          </div>

          <div className="flex items-center justify-between h-12 px-4 rounded-[8px]" style={{ backgroundColor: 'var(--bg)' }}>
            <span className="text-sm" style={{ color: 'var(--ink)' }}>个人信息上下文</span>
            <Toggle
              checked={useProfileContext}
              onChange={async (val) => {
                setUseProfileContext(val)
                await saveSetting('xiaohui_useProfileContext', val)
              }}
            />
          </div>
        </div>
      </Collapsible>

      <Collapsible title="对话设置" iconName="send" hint="控制对话行为" buttonStyle={{ height: '48px' }}>
        <div className="space-y-3">
          <div className="flex items-center justify-between h-12 px-4 rounded-[8px]" style={{ backgroundColor: 'var(--bg)' }}>
            <span className="text-sm" style={{ color: 'var(--ink)' }}>上下文历史条数</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                value={chatHistoryCount}
                onChange={async (e) => {
                  const val = parseInt(e.target.value, 10) || 1
                  setChatHistoryCount(val)
                  await saveSetting('xiaohui_chatHistoryCount', val)
                }}
                className="w-16 px-2 py-1 rounded-lg text-sm text-right outline-none border"
                style={{ backgroundColor: 'var(--bg2)', color: 'var(--ink)', borderColor: 'var(--rule)' }}
              />
              <span className="text-xs" style={{ color: 'var(--muted)' }}>条</span>
            </div>
          </div>

          <div className="flex items-center justify-between h-12 px-4 rounded-[8px]" style={{ backgroundColor: 'var(--bg)' }}>
            <span className="text-sm" style={{ color: 'var(--ink)' }}>回复温度</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                max="2"
                step="0.1"
                value={temperature}
                onChange={async (e) => {
                  const val = parseFloat(e.target.value) || 0
                  setTemperature(val)
                  await saveSetting('xiaohui_temperature', val)
                }}
                className="w-16 px-2 py-1 rounded-lg text-sm text-right outline-none border"
                style={{ backgroundColor: 'var(--bg2)', color: 'var(--ink)', borderColor: 'var(--rule)' }}
              />
              <span className="text-xs" style={{ color: 'var(--muted)' }}>0-2</span>
            </div>
          </div>

          <div className="flex items-center justify-between h-12 px-4 rounded-[8px]" style={{ backgroundColor: 'var(--bg)' }}>
            <span className="text-sm" style={{ color: 'var(--ink)' }}>最大回复长度</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="64"
                value={maxTokens}
                onChange={async (e) => {
                  const val = parseInt(e.target.value, 10) || 64
                  setMaxTokens(val)
                  await saveSetting('xiaohui_maxTokens', val)
                }}
                className="w-20 px-2 py-1 rounded-lg text-sm text-right outline-none border"
                style={{ backgroundColor: 'var(--bg2)', color: 'var(--ink)', borderColor: 'var(--rule)' }}
              />
              <span className="text-xs" style={{ color: 'var(--muted)' }}>token</span>
            </div>
          </div>

          <div className="flex items-center justify-between h-12 px-4 rounded-[8px]" style={{ backgroundColor: 'var(--bg)' }}>
            <span className="text-sm" style={{ color: 'var(--ink)' }}>自动保存对话</span>
            <Toggle
              checked={autoSaveChat}
              onChange={async (val) => {
                setAutoSaveChat(val)
                await saveSetting('xiaohui_autoSaveChat', val)
              }}
            />
          </div>

          <div className="flex items-center justify-between h-12 px-4 rounded-[8px]" style={{ backgroundColor: 'var(--bg)' }}>
            <span className="text-sm" style={{ color: 'var(--ink)' }}>流式响应</span>
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: 'var(--muted)' }}>逐字显示</span>
              <Toggle
                checked={streamResponse}
                onChange={async (val) => {
                  setStreamResponse(val)
                  await saveSetting('xiaohui_streamResponse', val)
                }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between h-12 px-4 rounded-[8px]" style={{ backgroundColor: 'var(--bg)' }}>
            <span className="text-sm" style={{ color: 'var(--ink)' }}>写信模式回复</span>
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: 'var(--muted)' }}>{letterDelayMode === 'immersive' ? '沉浸模式' : '即时回复'}</span>
              <Toggle
                checked={letterDelayMode === 'immersive'}
                onChange={async (val) => {
                  const mode = val ? 'immersive' : 'instant'
                  setLetterDelayMode(mode)
                  await saveSetting('letterDelayMode', mode)
                }}
              />
            </div>
          </div>
        </div>
      </Collapsible>
    </div>
  )
}

export default XiaohuiSettingsPanel
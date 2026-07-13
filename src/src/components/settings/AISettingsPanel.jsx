import { useState, useEffect } from 'react'
import { getSetting, saveSetting, deleteSetting } from '../../db/database'
import { AI_PROVIDERS } from '../../constants/aiProviders'
import { getAIConfig, getDailyLimitStatus } from '../../utils/aiHelper'
import Toggle from '../ui/Toggle'
import Collapsible from '../ui/Collapsible'
import Icon from '../ui/Icon'

function maskApiKey(key) {
  if (!key) return ''
  if (key.length <= 6) return '*'.repeat(key.length)
  return key.slice(0, 3) + '*'.repeat(key.length - 6) + key.slice(-3)
}

const STATUS_CONFIG = {
  1: { icon: 'shield', label: '自定义 API', color: '#10b981' },
  2: { icon: 'sparkle', label: '免费额度', color: 'var(--accent)' },
  3: { icon: 'search', label: '关键词匹配', color: '#f59e0b' },
  4: { icon: 'close', label: 'AI 已关闭', color: '#9ca3af' },
}

function AISettingsPanel() {
  const [aiProvider, setAiProvider] = useState('siliconflow')
  const [aiApiKey, setAiApiKey] = useState('')
  const [aiBaseUrl, setAiBaseUrl] = useState('')
  const [aiModel, setAiModel] = useState('')
  const [aiEnabled, setAiEnabled] = useState(true)
  const [testingConnection, setTestingConnection] = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [editingApiKey, setEditingApiKey] = useState(false)
  const [providerApiKeys, setProviderApiKeys] = useState({})
  const [availableModels, setAvailableModels] = useState([])
  const [configStep, setConfigStep] = useState('key')
  const [aiStatus, setAiStatus] = useState(null)
  const [providerDropdown, setProviderDropdown] = useState(false)
  const [useBuiltinFree, setUseBuiltinFree] = useState(true)

  useEffect(() => {
    loadAISettings()
  }, [])

  const loadAISettings = async () => {
    const provider = await getSetting('aiProvider')
    const apiKey = await getSetting('aiApiKey')
    const baseUrl = await getSetting('aiBaseUrl')
    const model = await getSetting('aiModel')
    const enabled = await getSetting('aiEnabled')
    const savedModels = await getSetting('aiModels')
    const builtinFree = await getSetting('useBuiltinFree')
    if (provider) setAiProvider(provider)
    if (apiKey) setAiApiKey(apiKey)
    if (baseUrl) setAiBaseUrl(baseUrl)
    if (model) setAiModel(model)
    if (enabled !== undefined) setAiEnabled(enabled)
    if (savedModels) setAvailableModels(savedModels)
    if (builtinFree !== undefined) setUseBuiltinFree(!!builtinFree)

    const keys = {}
    for (const key of Object.keys(AI_PROVIDERS)) {
      const savedKey = await getSetting(`aiApiKey_${key}`)
      if (savedKey) keys[key] = savedKey
    }
    setProviderApiKeys(keys)
    refreshAIStatus()
  }

  const refreshAIStatus = async () => {
    try {
      const config = await getAIConfig()
      const limitStatus = getDailyLimitStatus()
      setAiStatus({ ...config, ...limitStatus })
    } catch (e) {
      console.error('获取 AI 状态失败:', e)
    }
  }

  const fetchAvailableModels = async (provider, apiKey, baseUrl) => {
    if (!apiKey) return []
    try {
      const prov = AI_PROVIDERS[provider]
      const url = prov?.custom ? baseUrl : prov?.baseUrl
      if (!url) return []

      const res = await fetch(`${url}/models`, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      })

      if (res.ok) {
        const data = await res.json()
        if (data.data && Array.isArray(data.data)) return data.data.map(m => m.id).slice(0, 20)
        if (data.models && Array.isArray(data.models)) return data.models.map(m => m.id || m).slice(0, 20)
      }

      const chatRes = await fetch(`${url}/chat/models`, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      })
      if (chatRes.ok) {
        const data = await chatRes.json()
        if (Array.isArray(data)) return data.slice(0, 20)
        if (data.data && Array.isArray(data.data)) return data.data.map(m => m.id).slice(0, 20)
      }
      return []
    } catch {
      return []
    }
  }

  const handleTestConnection = async () => {
    setTestingConnection(true)
    setTestResult(null)
    try {
      const prov = AI_PROVIDERS[aiProvider]
      const key = aiApiKey || providerApiKeys[aiProvider] || import.meta.env.VITE_AI_API_KEY
      const baseUrl = prov.custom ? (aiBaseUrl || '') : prov.baseUrl

      if (!key || !baseUrl) {
        setTestResult({ success: false, message: '请填写完整配置' })
        setTestingConnection(false)
        return
      }

      const models = await fetchAvailableModels(aiProvider, key, baseUrl)

      if (models.length > 0) {
        setAvailableModels(models)
        await saveSetting('aiModels', models)
        if (!aiModel || !models.includes(aiModel)) {
          setAiModel(models[0])
          await saveSetting('aiModel', models[0])
        }
        setConfigStep('model')
        setTestResult({ success: true, message: `已获取 ${models.length} 个模型，请选择` })
      } else {
        const model = prov.custom ? aiModel : prov.model
        if (!model) {
          setTestResult({ success: false, message: '请手动输入模型名称' })
          setTestingConnection(false)
          return
        }
        setAiModel(model)
        await saveSetting('aiModel', model)

        const res = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
          body: JSON.stringify({ model, messages: [{ role: 'user', content: 'hi' }], max_tokens: 10 }),
        })

        if (res.ok) {
          setConfigStep('done')
          setTestResult({ success: true, message: '配置成功' })
        } else {
          setTestResult({ success: false, message: `连接失败 (${res.status})` })
        }
      }
    } catch (err) {
      setTestResult({ success: false, message: '网络错误' })
    }
    setTestingConnection(false)
    setTimeout(() => setTestResult(null), 3000)
  }

  const handleSaveApiKey = async () => {
    if (!aiApiKey.trim()) return
    await saveSetting(`aiApiKey_${aiProvider}`, aiApiKey.trim())
    if (AI_PROVIDERS[aiProvider]?.custom && aiBaseUrl) {
      await saveSetting('aiBaseUrl', aiBaseUrl)
    }
    if (AI_PROVIDERS[aiProvider]?.custom && aiModel) {
      await saveSetting('aiModel', aiModel)
    }
    setEditingApiKey(false)
    setProviderApiKeys(prev => ({ ...prev, [aiProvider]: aiApiKey.trim() }))
    setTestResult({ success: true, message: '已保存' })
    setTimeout(() => setTestResult(null), 2000)
    refreshAIStatus()
  }

  const handleDeleteApiKey = async () => {
    if (!confirm('确定要删除这个 API Key 吗？')) return
    try {
      await deleteSetting(`aiApiKey_${aiProvider}`)
      setProviderApiKeys(prev => {
        const next = { ...prev }
        delete next[aiProvider]
        return next
      })
      setAiApiKey('')
      setEditingApiKey(true)
      setTestResult({ success: true, message: '已删除，将使用内置免费额度' })
      setTimeout(() => setTestResult(null), 2000)
      refreshAIStatus()
    } catch (e) {
      console.error('删除失败:', e)
    }
  }

  const handleConfirmModel = async () => {
    setTestingConnection(true)
    setTestResult(null)
    try {
      const prov = AI_PROVIDERS[aiProvider]
      const key = aiApiKey || providerApiKeys[aiProvider] || import.meta.env.VITE_AI_API_KEY
      const baseUrl = prov.custom ? (aiBaseUrl || '') : prov.baseUrl

      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
        body: JSON.stringify({ model: aiModel, messages: [{ role: 'user', content: 'hi' }], max_tokens: 10 }),
      })

      if (res.ok) {
        setConfigStep('done')
        setTestResult({ success: true, message: '配置成功' })
      } else {
        setTestResult({ success: false, message: `连接失败 (${res.status})` })
      }
    } catch (err) {
      setTestResult({ success: false, message: '网络错误' })
    }
    setTestingConnection(false)
    setTimeout(() => setTestResult(null), 3000)
  }

  const statusConfig = aiStatus ? STATUS_CONFIG[aiStatus.level] : null

  return (
    <div>
      <h3 className="text-sm font-medium px-5 pt-5 pb-3" style={{ color: 'var(--ink)' }}>AI 设置</h3>

      <Collapsible title="AI 连接配置" iconName="shield" hint={aiEnabled ? '已开启' : '已关闭'}>
        <div className="space-y-3">
          {/* 启用 AI 开关 */}
          <div className="flex items-center justify-between h-12 px-4 rounded-xl" style={{ backgroundColor: 'var(--bg)' }}>
            <span className="text-sm" style={{ color: 'var(--ink)' }}>启用 AI</span>
            <Toggle
              checked={aiEnabled}
              onChange={async () => {
                const newValue = !aiEnabled
                setAiEnabled(newValue)
                await saveSetting('aiEnabled', newValue)
                setTimeout(refreshAIStatus, 100)
              }}
            />
          </div>

          {/* AI 状态卡片 */}
          {aiStatus && aiEnabled && statusConfig && (
            <div className="p-4 rounded-xl space-y-3" style={{ backgroundColor: statusConfig.color + '1a', border: `1px solid ${statusConfig.color}4d` }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon name={statusConfig.icon} size={16} color={statusConfig.color} />
                  <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{statusConfig.label}</span>
                </div>
                <span className="text-xs font-medium rounded-full" style={{ backgroundColor: statusConfig.color, color: 'white', paddingLeft: '16px', paddingRight: '16px', paddingTop: '6px', paddingBottom: '6px' }}>L{aiStatus.level}</span>
              </div>

              {aiStatus.level === 2 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span style={{ color: 'var(--muted)' }}>今日剩余</span>
                    <span style={{ color: 'var(--ink)' }}>{aiStatus.dailyRemaining} / {aiStatus.dailyLimit} 次</span>
                  </div>
                  <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg2)' }}>
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(aiStatus.dailyRemaining / aiStatus.dailyLimit) * 100}%`, backgroundColor: 'var(--accent)' }} />
                  </div>
                </div>
              )}

              {aiStatus.level === 3 && (
                <p className="text-xs" style={{ color: 'var(--muted)' }}>无网络或 API Key 无效，使用本地关键词匹配</p>
              )}
              {aiStatus.level === 4 && (
                <p className="text-xs" style={{ color: 'var(--muted)' }}>AI 功能已手动关闭</p>
              )}
            </div>
          )}

          {/* 使用内置免费额度 */}
          {aiEnabled && (
            <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--bg)' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon name="sparkle" size={16} color="var(--ink)" />
                  <span className="text-sm" style={{ color: 'var(--ink)' }}>使用内置免费额度</span>
                </div>
                <Toggle
                  checked={useBuiltinFree}
                  disabled={!providerApiKeys[aiProvider]}
                  onChange={async () => {
                    const newValue = !useBuiltinFree
                    setUseBuiltinFree(newValue)
                    await saveSetting('useBuiltinFree', newValue)
                    setTimeout(refreshAIStatus, 100)
                  }}
                />
              </div>
              <p className="text-xs mt-2" style={{ color: 'var(--muted)' }}>
                {useBuiltinFree ? '当前使用内置免费额度，不消耗你的 API Key' : '关闭后将使用你配置的 API Key'}
                {!providerApiKeys[aiProvider] && '（配置 API Key 后可关闭）'}
              </p>
            </div>
          )}

          {/* 服务商选择 + API Key + 模型 */}
          <div className="p-3 rounded-xl space-y-3" style={{ backgroundColor: 'var(--bg)' }}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>AI 提供商</p>
              {providerApiKeys[aiProvider] && (
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>使用自定义 Key</span>
              )}
            </div>

            <div className="relative">
              <button
                onClick={() => setProviderDropdown(!providerDropdown)}
                className="w-full px-4 py-3 rounded-lg text-left flex items-center justify-between transition-all"
                style={{ backgroundColor: 'var(--bg2)', color: 'var(--ink)', border: '1px solid var(--rule)' }}
              >
                <span className="text-sm font-medium">{AI_PROVIDERS[aiProvider]?.name || '选择提供商'}</span>
                <Icon name="chevron-down" size={16} color="var(--ink)" className={`transition-transform duration-200 ${providerDropdown ? 'rotate-180' : ''}`} />
              </button>

              {providerDropdown && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setProviderDropdown(false)} />
                  <div className="absolute top-full left-0 right-0 mt-2 rounded-xl overflow-hidden z-50 max-h-72 overflow-y-auto" style={{ backgroundColor: 'var(--bg2)', border: '1px solid var(--rule)', boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }}>
                    {Object.entries(AI_PROVIDERS).map(([key, val]) => {
                      const hasKey = !!providerApiKeys[key]
                      return (
                        <button
                          key={key}
                          onClick={async () => {
                            setAiProvider(key)
                            await saveSetting('aiProvider', key)
                            setConfigStep('key')
                            setAvailableModels([])
                            setProviderDropdown(false)
                            const savedKey = providerApiKeys[key]
                            if (savedKey) {
                              setAiApiKey(savedKey)
                              setEditingApiKey(false)
                            } else {
                              setAiApiKey('')
                              setEditingApiKey(true)
                            }
                            if (AI_PROVIDERS[key]?.custom) {
                              const savedBaseUrl = await getSetting('aiBaseUrl')
                              const savedModel = await getSetting('aiModel')
                              if (savedBaseUrl) setAiBaseUrl(savedBaseUrl)
                              if (savedModel) setAiModel(savedModel)
                            }
                            setTestResult(null)
                            refreshAIStatus()
                          }}
                          className="w-full px-4 py-3 text-left text-sm flex items-center justify-between transition-all"
                          style={{ backgroundColor: aiProvider === key ? 'var(--accent)15' : 'transparent', color: aiProvider === key ? 'var(--accent)' : 'var(--ink)', borderBottom: '1px solid var(--rule)' }}
                        >
                          <span className="font-medium">{val.name}</span>
                          <div className="flex items-center gap-2">
                            {hasKey && <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>已配置</span>}
                            {aiProvider === key && <Icon name="check" size={14} color="var(--accent)" />}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </>
              )}
            </div>

            {/* 免费额度提示 */}
            {!providerApiKeys[aiProvider] && aiStatus && aiStatus.level === 2 && (
              <div className="p-3 rounded-lg space-y-2" style={{ backgroundColor: 'var(--accent-light)', border: '1px solid var(--accent-border)' }}>
                <div className="flex items-center gap-2">
                  <Icon name="sparkle" size={14} color="var(--accent)" />
                  <span className="text-xs font-medium" style={{ color: 'var(--accent)' }}>当前使用内置免费额度</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span style={{ color: 'var(--muted)' }}>今日剩余</span>
                  <span style={{ color: 'var(--ink)' }}>{aiStatus.dailyRemaining} / {aiStatus.dailyLimit} 次</span>
                </div>
                <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--accent-border)' }}>
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(aiStatus.dailyRemaining / aiStatus.dailyLimit) * 100}%`, backgroundColor: 'var(--accent)' }} />
                </div>
              </div>
            )}

            {/* Base URL（自定义服务商） */}
            {AI_PROVIDERS[aiProvider]?.custom && (
              <div className="p-3 rounded-xl space-y-3" style={{ backgroundColor: 'var(--bg2)' }}>
                <input
                  type="text"
                  value={aiBaseUrl}
                  onChange={(e) => setAiBaseUrl(e.target.value)}
                  placeholder="API 地址 (如: https://api.example.com/v1)"
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none border"
                  style={{ backgroundColor: 'var(--bg)', color: 'var(--ink)', borderColor: 'var(--rule)' }}
                />
              </div>
            )}

            {/* 默认模型（非自定义服务商） */}
            {!AI_PROVIDERS[aiProvider]?.custom && AI_PROVIDERS[aiProvider]?.model && (
              <div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--bg2)' }}>
                <p className="text-xs font-medium mb-2" style={{ color: 'var(--muted)' }}>默认模型</p>
                <div className="px-3 py-2 rounded-lg text-xs" style={{ backgroundColor: 'var(--bg)', color: 'var(--ink)' }}>
                  {AI_PROVIDERS[aiProvider].model}
                </div>
              </div>
            )}

            {/* API Key */}
            <div className="p-3 rounded-xl space-y-3" style={{ backgroundColor: 'var(--bg2)' }}>
              <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>API Key</p>

              {providerApiKeys[aiProvider] && !editingApiKey ? (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-mono" style={{ color: 'var(--accent)' }}>{maskApiKey(providerApiKeys[aiProvider])}</span>
                  <div className="flex gap-2">
                    <button onClick={() => setEditingApiKey(true)} className="text-xs px-3 py-1 rounded-lg transition-all" style={{ backgroundColor: 'var(--bg)', color: 'var(--muted)' }}>修改</button>
                    <button onClick={handleDeleteApiKey} className="text-xs px-3 py-1 rounded-lg transition-all" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>删除</button>
                  </div>
                </div>
              ) : (
                <>
                  <input
                    type="password"
                    value={aiApiKey}
                    onChange={(e) => setAiApiKey(e.target.value)}
                    placeholder="输入你的 API Key"
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none border"
                    style={{ backgroundColor: 'var(--bg)', color: 'var(--ink)', borderColor: 'var(--rule)' }}
                  />
                  <div className="flex gap-2">
                    <button onClick={handleSaveApiKey} className="flex-1 py-2 rounded-lg text-xs font-medium transition-all" style={{ backgroundColor: 'var(--rule)', color: 'var(--ink)' }}>保存</button>
                    <button onClick={handleTestConnection} disabled={testingConnection} className="flex-1 py-2 rounded-lg text-xs font-medium transition-all disabled:opacity-50" style={{ backgroundColor: 'var(--accent)', color: 'white' }}>
                      {testingConnection ? '获取中...' : (configStep === 'key' ? '连接' : '重新获取')}
                    </button>
                  </div>
                </>
              )}

              {testResult && (
                <p className="text-xs text-center" style={{ color: testResult.success ? '#10b981' : '#ef4444' }}>{testResult.message}</p>
              )}

              {/* 模型选择 */}
              {(availableModels.length > 0 || AI_PROVIDERS[aiProvider]?.custom) && (
                <div className="space-y-2">
                  <p className="text-xs font-medium" style={{ color: 'var(--muted)' }}>选择模型</p>
                  {availableModels.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                      {availableModels.map(model => (
                        <button
                          key={model}
                          onClick={() => { setAiModel(model); saveSetting('aiModel', model) }}
                          className="px-3 py-2 rounded-lg text-xs text-left truncate transition-all"
                          style={{ backgroundColor: aiModel === model ? 'var(--accent)' : 'var(--bg)', color: aiModel === model ? 'white' : 'var(--ink)' }}
                        >
                          {aiModel === model && <span className="mr-1"><Icon name="check" size={10} color="white" /></span>}
                          {model}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={aiModel}
                      onChange={(e) => setAiModel(e.target.value)}
                      placeholder="输入模型名称"
                      className="w-full px-3 py-2 rounded-lg text-sm outline-none border"
                      style={{ backgroundColor: 'var(--bg)', color: 'var(--ink)', borderColor: 'var(--rule)' }}
                    />
                  )}

                  {configStep === 'model' && availableModels.length > 0 && (
                    <button onClick={handleConfirmModel} disabled={testingConnection || !aiModel} className="w-full py-2 rounded-lg text-xs font-medium transition-all disabled:opacity-50" style={{ backgroundColor: 'var(--accent)', color: 'white' }}>
                      {testingConnection ? '测试中...' : '确认并测试连接'}
                    </button>
                  )}
                </div>
              )}

              {configStep === 'done' && (
                <div className="flex items-center justify-center gap-2 py-2">
                  <Icon name="check" size={14} color="#10b981" />
                  <span className="text-xs" style={{ color: '#10b981' }}>配置完成</span>
                </div>
              )}

              {!providerApiKeys[aiProvider] && !aiApiKey && (
                <p className="text-xs px-1" style={{ color: 'var(--muted)' }}>不填 API Key 使用内置免费额度，每天 50 次</p>
              )}
            </div>
          </div>
        </div>
      </Collapsible>
    </div>
  )
}

export default AISettingsPanel

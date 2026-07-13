import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { getAllRecords, exportAllData, importData, importRecords, db, clearAllData } from '../../db/database'
import { exportToPDF, exportToHTML } from '../../utils/pdfExport'
import { EMOTIONS } from '../../constants/emotions'
import { recordBackupDate } from '../../utils/reminder'
import { saveOrShareFile } from '../../utils/fileHelper'
import Icon from '../ui/Icon'

function DataManagementModal({ onClose, onRefresh, onBackupComplete }) {
  const fileInputRef = useRef(null)
  const [parsedData, setParsedData] = useState(null)
  const [selectedIds, setSelectedIds] = useState([])
  const [conflictStrategy, setConflictStrategy] = useState('skip')
  const [importResult, setImportResult] = useState(null)
  const [parseError, setParseError] = useState('')
  const [conflictCount, setConflictCount] = useState(0)
  const [aiEnhancing, setAiEnhancing] = useState(false)
  const [aiEnhanced, setAiEnhanced] = useState(false)
  const [aiProgress, setAiProgress] = useState({ current: 0, total: 0 })
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [clearing, setClearing] = useState(false)

  const handleBackupDate = async () => {
    await recordBackupDate()
    if (onBackupComplete) onBackupComplete(new Date().toISOString())
  }

  const handleExportPDF = async () => {
    setExporting(true)
    try {
      const records = await getAllRecords()
      if (records.length === 0) {
        alert('暂无数据可导出')
        setExporting(false)
        return
      }
      const grouped = {}
      records.forEach(r => {
        const date = new Date(r.createdAt).toISOString().split('T')[0]
        if (!grouped[date]) grouped[date] = []
        grouped[date].push(r)
      })
      const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))
      const dateRange = `${dates[dates.length - 1]} 至 ${dates[0]}`
      await exportToPDF(records, { title: '慧记记录导出', dateRange })
      await handleBackupDate()
    } catch (err) {
      console.error('导出失败:', err)
      alert('导出失败，请重试')
    }
    setExporting(false)
  }

  const handleExportHTML = async () => {
    setExporting(true)
    try {
      const records = await getAllRecords()
      if (records.length === 0) {
        alert('暂无数据可导出')
        setExporting(false)
        return
      }
      await exportToHTML(records, { title: '慧记记录导出', dateRange: '全部记录' })
      await handleBackupDate()
    } catch (err) {
      console.error('导出失败:', err)
      alert('导出失败，请重试')
    }
    setExporting(false)
  }

  const handleExportJSON = async () => {
    setExporting(true)
    try {
      const data = await exportAllData()
      const json = JSON.stringify(data, null, 2)
      await saveOrShareFile(json, `慧记数据_${new Date().toISOString().split('T')[0]}.json`, 'application/json', { title: '导出慧记数据' })
      await handleBackupDate()
    } catch (err) {
      console.error('导出失败:', err)
    }
    setExporting(false)
  }

  const handleExportMarkdown = async () => {
    setExporting(true)
    try {
      const records = await getAllRecords()
      let md = '# 慧记日记导出\n\n'
      md += `导出时间：${new Date().toLocaleString('zh-CN')}\n\n---\n\n`
      const grouped = {}
      records.forEach(r => {
        const date = new Date(r.createdAt).toISOString().split('T')[0]
        if (!grouped[date]) grouped[date] = []
        grouped[date].push(r)
      })
      Object.entries(grouped).sort((a, b) => b[0].localeCompare(a[0])).forEach(([date, items]) => {
        md += `## ${date}\n\n`
        items.forEach(item => {
          const time = new Date(item.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
          const typeLabel = item.type === 'note' ? '随笔' : item.type === 'mood' ? '心情' : item.type === 'memo' ? '备忘' : '日记'
          md += `### ${time} - ${typeLabel}\n\n`
          if (item.content) md += `${item.content}\n\n`
          if (item.emotions) md += `情绪：${item.emotions.join(', ')}\n\n`
          if (item.tags) md += `标签：${item.tags.map(t => `#${t}`).join(' ')}\n\n`
          md += '---\n\n'
        })
      })
      await saveOrShareFile(md, `慧记日记_${new Date().toISOString().split('T')[0]}.md`, 'text/markdown', { title: '导出慧记日记' })
      await handleBackupDate()
    } catch (err) {
      console.error('导出失败:', err)
    }
    setExporting(false)
  }

  const checkConflicts = async (records) => {
    const existing = await getAllRecords()
    const existingDates = new Set()
    existing.forEach(r => {
      const d = new Date(r.createdAt).toISOString().split('T')[0]
      existingDates.add(d)
    })
    let conflicts = 0
    records.forEach(r => {
      const d = new Date(r.createdAt).toISOString().split('T')[0]
      if (existingDates.has(d)) conflicts++
    })
    setConflictCount(conflicts)
  }

  const handleImportFile = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setImporting(true)
    setParseError('')
    setImportResult(null)
    setParsedData(null)

    try {
      const { parseImportFile } = await import('../../utils/importParsers')
      const result = await parseImportFile(file)

      if (result.error) {
        setParseError(result.error)
        setImporting(false)
        return
      }

      if (result.isHuijiFormat) {
        if (!confirm('检测到慧记备份文件，将直接恢复全部数据。是否继续？')) {
          setImporting(false)
          e.target.value = ''
          return
        }
        await importData(result)
        onRefresh()
        onClose()
        setImporting(false)
        return
      }

      setParsedData(result)
      const ids = result.records.map((_, i) => i)
      setSelectedIds(ids)
      await checkConflicts(result.records)
    } catch (err) {
      console.error('导入失败:', err)
      setParseError('文件解析失败，请检查文件格式')
    }
    setImporting(false)
    e.target.value = ''
  }

  const toggleSelectAll = () => {
    if (selectedIds.length === parsedData.records.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(parsedData.records.map((_, i) => i))
    }
  }

  const toggleSelect = (index) => {
    if (selectedIds.includes(index)) {
      setSelectedIds(selectedIds.filter(i => i !== index))
    } else {
      setSelectedIds([...selectedIds, index])
    }
  }

  const confirmImport = async () => {
    if (selectedIds.length === 0) {
      alert('请至少选择一条记录')
      return
    }
    if (conflictStrategy === 'overwrite' && conflictCount > 0) {
      if (!confirm(`将覆盖 ${conflictCount} 天的已有记录，确定继续吗？`)) return
    }
    setImporting(true)
    try {
      const recordsToImport = selectedIds.map(i => parsedData.records[i])
      const result = await importRecords(recordsToImport, { conflictStrategy })
      setImportResult(result)
      onRefresh()
    } catch (err) {
      console.error('导入失败:', err)
      setParseError('导入过程中出现错误')
    }
    setImporting(false)
  }

  const resetImport = () => {
    setParsedData(null)
    setSelectedIds([])
    setImportResult(null)
    setParseError('')
    setConflictCount(0)
    setAiEnhanced(false)
    setAiProgress({ current: 0, total: 0 })
  }

  const handleClear = async () => {
    if (!confirm('确定要清空所有数据吗？此操作不可恢复！')) return
    setClearing(true)
    try {
      await clearAllData()
      await new Promise(resolve => setTimeout(resolve, 300))
      try {
        const dbName = db.name
        db.close()
        const req = indexedDB.deleteDatabase(dbName)
        await new Promise((resolve, reject) => {
          req.onsuccess = resolve
          req.onerror = reject
          req.onblocked = resolve
        })
        await new Promise(resolve => setTimeout(resolve, 300))
      } catch (e) {
        console.error('删除数据库失败:', e)
      }
    } catch (err) {
      console.error('清空失败:', err)
    }
    alert('数据已清空，即将刷新页面...')
    window.location.reload()
  }

  const handleAIEnhance = async () => {
    setAiEnhancing(true)
    try {
      const { enhanceWithAI } = await import('../../utils/importParsers')
      const enhanced = await enhanceWithAI(
        parsedData.records,
        (current, total) => setAiProgress({ current, total })
      )
      setParsedData({ ...parsedData, records: enhanced })
      setAiEnhanced(true)
    } catch (err) {
      console.error('AI增强失败:', err)
      alert('AI分析失败，请重试')
    }
    setAiEnhancing(false)
    setAiProgress({ current: 0, total: 0 })
  }

  return typeof document !== 'undefined' ? createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center animate-fade-in"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md mx-4 rounded-xl overflow-hidden animate-slide-up" style={{ backgroundColor: 'var(--bg)' }}>
        {/* 头部 */}
        <div className="flex items-center justify-between px-5 h-12 border-b" style={{ borderColor: 'var(--rule)' }}>
          <h3 className="font-bold" style={{ color: 'var(--ink)' }}>数据管理</h3>
          <button onClick={onClose} className="p-2 rounded-lg transition-all hover:bg-[var(--bg2)]" style={{ color: 'var(--muted)' }}>
            <Icon name="close" size={20} color="var(--muted)" />
          </button>
        </div>

        {/* 内容 */}
        <div className="p-5 space-y-4">
          {/* 导出 */}
          <div>
            <p className="text-xs font-medium mb-2" style={{ color: 'var(--muted)' }}>导出数据</p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={handleExportPDF} disabled={exporting} className="huiji-btn-secondary flex items-center justify-center gap-2 disabled:opacity-50">
                <Icon name="export" size={16} color="var(--ink)" />
                {exporting ? '导出中...' : 'PDF'}
              </button>
              <button onClick={handleExportHTML} disabled={exporting} className="huiji-btn-secondary flex items-center justify-center gap-2 disabled:opacity-50">
                <Icon name="export" size={16} color="var(--ink)" />
                {exporting ? '导出中...' : 'HTML'}
              </button>
              <button onClick={handleExportJSON} disabled={exporting} className="huiji-btn-secondary flex items-center justify-center gap-2 disabled:opacity-50">
                <Icon name="save" size={16} color="var(--ink)" />
                {exporting ? '导出中...' : 'JSON'}
              </button>
              <button onClick={handleExportMarkdown} disabled={exporting} className="huiji-btn-secondary flex items-center justify-center gap-2 disabled:opacity-50">
                <Icon name="book" size={16} color="var(--ink)" />
                {exporting ? '导出中...' : 'Markdown'}
              </button>
            </div>
          </div>

          {/* 导入 */}
          {!parsedData && !importResult && (
            <div>
              <p className="text-xs font-medium mb-2" style={{ color: 'var(--muted)' }}>导入数据</p>
              <input type="file" accept=".json,.txt,.md,.markdown" onChange={handleImportFile} className="hidden" ref={fileInputRef} />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
                className="huiji-btn-secondary w-full flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Icon name="import" size={16} color="var(--ink)" />
                {importing ? '解析中...' : '选择文件导入'}
              </button>
              <p className="text-xs mt-2 text-center" style={{ color: 'var(--muted)' }}>支持 .json / .txt / .md 格式</p>
              {parseError && <p className="text-xs mt-2 text-center" style={{ color: '#ef4444' }}>{parseError}</p>}
            </div>
          )}

          {/* 导入预览 */}
          {parsedData && !importResult && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>导入预览</p>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--bg2)', color: 'var(--muted)' }}>{parsedData.records.length} 条记录</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 cursor-pointer" onClick={toggleSelectAll}>
                  <input type="checkbox" checked={selectedIds.length === parsedData.records.length} onChange={toggleSelectAll} className="rounded" />
                  <span style={{ color: 'var(--muted)' }}>全选</span>
                </label>
                {conflictCount > 0 && (
                  <span className="flex items-center gap-1" style={{ color: '#f59e0b' }}>
                    <Icon name="alert" size={12} color="#f59e0b" />
                    {conflictCount} 天已有记录
                  </span>
                )}
              </div>

              {conflictCount > 0 && (
                <div className="p-3 rounded-xl space-y-2" style={{ backgroundColor: 'var(--bg2)' }}>
                  <p className="text-xs font-medium" style={{ color: 'var(--ink)' }}>冲突处理策略</p>
                  <div className="flex gap-2">
                    {['skip', 'overwrite', 'merge'].map(s => (
                      <button
                        key={s}
                        onClick={() => setConflictStrategy(s)}
                        className="flex-1 py-1.5 rounded-lg text-xs transition-all"
                        style={{ backgroundColor: conflictStrategy === s ? 'var(--accent)' : 'var(--bg)', color: conflictStrategy === s ? 'white' : 'var(--muted)' }}
                      >
                        {s === 'skip' ? '跳过' : s === 'overwrite' ? '覆盖' : '追加'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* AI 深度分析 */}
              <div className="p-3 rounded-xl space-y-2" style={{ backgroundColor: 'var(--bg2)' }}>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium" style={{ color: 'var(--ink)' }}>AI 情绪分析</p>
                  {aiEnhanced && <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#10b981', color: 'white' }}>已增强</span>}
                </div>
                {!aiEnhanced ? (
                  <button
                    onClick={handleAIEnhance}
                    disabled={aiEnhancing}
                    className="huiji-btn-secondary w-full flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {aiEnhancing ? (
                      <>
                        <Icon name="refresh" size={14} color="var(--ink)" className="animate-spin" />
                        {aiProgress.total > 0 ? `分析中 ${aiProgress.current}/${aiProgress.total}...` : '分析中...'}
                      </>
                    ) : (
                      <>
                        <Icon name="sparkle" size={14} color="var(--ink)" />
                        AI 深度分析
                      </>
                    )}
                  </button>
                ) : (
                  <p className="text-xs text-center" style={{ color: 'var(--muted)' }}>已使用 AI 分析，情绪标签已更新</p>
                )}
              </div>

              {/* 记录列表 */}
              <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                {parsedData.records.map((record, index) => {
                  const date = new Date(record.createdAt).toLocaleDateString('zh-CN')
                  const emotionNames = (record.emotions || [])
                    .join('、')
                  const isSelected = selectedIds.includes(index)
                  return (
                    <div
                      key={index}
                      onClick={() => toggleSelect(index)}
                      className={`p-3 rounded-xl cursor-pointer transition-all ${isSelected ? 'ring-2 ring-[var(--accent)]' : ''}`}
                      style={{ backgroundColor: 'var(--bg2)' }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(index)} className="rounded flex-shrink-0" onClick={e => e.stopPropagation()} />
                        <span className="text-xs font-medium" style={{ color: 'var(--accent)' }}>{date}</span>
                        {emotionNames && <span className="text-xs" style={{ color: 'var(--muted)' }}>{emotionNames}</span>}
                        {record._aiEnhanced && <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: '#10b981', color: 'white' }}>AI</span>}
                      </div>
                      <p className="text-xs line-clamp-2 pl-6" style={{ color: 'var(--muted)' }}>{record.title || record.content.slice(0, 50)}</p>
                    </div>
                  )
                })}
              </div>

              <div className="flex gap-2 pt-2">
                <button onClick={resetImport} className="huiji-btn-secondary flex-1 disabled:opacity-50">返回</button>
                <button onClick={confirmImport} disabled={importing || selectedIds.length === 0} className="huiji-btn-primary flex-1 disabled:opacity-50">
                  {importing ? '导入中...' : `导入 ${selectedIds.length} 条`}
                </button>
              </div>
            </div>
          )}

          {/* 导入结果 */}
          {importResult && (
            <div className="text-center py-4 space-y-4">
              <div className="flex justify-center">
                <Icon name="check" size={48} color="#10b981" />
              </div>
              <div>
                <p className="text-base font-medium mb-1" style={{ color: 'var(--ink)' }}>导入完成</p>
                <p className="text-sm" style={{ color: 'var(--muted)' }}>
                  成功 {importResult.success} 条
                  {importResult.skipped > 0 && ` · 跳过 ${importResult.skipped} 条`}
                  {importResult.failed > 0 && ` · 失败 ${importResult.failed} 条`}
                </p>
              </div>
              <button onClick={() => { resetImport(); onClose() }} className="huiji-btn-primary w-full">完成</button>
            </div>
          )}

          {/* 清空数据 */}
          <div className="pt-4 border-t" style={{ borderColor: 'var(--rule)' }}>
            <p className="text-xs font-medium mb-2" style={{ color: 'var(--muted)' }}>清空数据</p>
            <button
              onClick={handleClear}
              disabled={clearing}
              className="w-full flex items-center justify-center gap-2 border rounded-md px-3 py-1.5 text-xs font-medium hover:bg-red-50 disabled:opacity-50"
              style={{ color: '#DC2626', borderColor: '#DC2626', backgroundColor: 'var(--bg)' }}
            >
              <Icon name="trash" size={16} color="#DC2626" />
              {clearing ? '清空中...' : '清空所有数据'}
            </button>
            <p className="text-xs mt-2" style={{ color: '#DC2626' }}>此操作不可撤销，请谨慎操作</p>
          </div>
        </div>
      </div>
    </div>,
    document.body
  ) : null
}

export default DataManagementModal

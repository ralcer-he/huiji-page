import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../ui/Icon'
import { getAllRecords } from '../../db/database'
import { getRecordType } from '../../constants/types'
import { stripHtml } from '../../utils/recordHelpers'

function RecentRecordsPanel({ visible, onClose, currentEditId }) {
  const navigate = useNavigate()
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!visible) return
    fetchRecords()
  }, [visible])

  const fetchRecords = async () => {
    setLoading(true)
    try {
      const all = await getAllRecords()
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      // 只显示当天记录，排除当前正在编辑的
      const todayRecords = all
        .filter(r => {
          const rDate = new Date(r.createdAt)
          rDate.setHours(0, 0, 0, 0)
          return r.id !== currentEditId && rDate.getTime() === today.getTime()
        })
      setRecords(todayRecords)
    } catch (e) {
      console.error('加载最近记录失败:', e)
    }
    setLoading(false)
  }

  const handleRecordClick = (record) => {
    navigate(`/write?editId=${record.id}`)
    onClose()
  }

  const getPreview = (record) => {
    if (record.type === 'mood') {
      return (record.emotions || []).join('、') || '心情记录'
    }
    if (record.content) {
      const text = record.content.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()
      return text.slice(0, 40) || '无内容'
    }
    if (record.type === 'memo') {
      return '待办事项'
    }
    return '无内容'
  }

  const formatDate = (date) => {
    const now = new Date()
    const diff = now - date
    const oneDay = 24 * 60 * 60 * 1000
    if (diff < oneDay && now.getDate() === date.getDate()) {
      return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    }
    if (diff < 2 * oneDay) return '昨天'
    if (diff < 7 * oneDay) {
      const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
      return days[date.getDay()]
    }
    return `${date.getMonth() + 1}/${date.getDate()}`
  }

  if (!visible) return null

  return (
    <>
      {/* 遮罩层 - 仅在小屏幕时显示 */}
      <div
        className="fixed inset-0 z-40 lg:hidden"
        style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}
        onClick={onClose}
      />

      {/* 侧边面板 */}
      <div
        className="fixed lg:relative right-0 top-0 bottom-0 z-50 lg:z-auto w-[260px] flex-shrink-0 flex flex-col animate-slide-up lg:animate-fade-in"
        style={{
          backgroundColor: 'var(--bg)',
          borderLeft: '1px solid var(--rule)',
        }}
      >
        {/* 头部 */}
        <div
          className="flex items-center justify-between px-4 h-12 border-b flex-shrink-0"
          style={{ borderColor: 'var(--rule)' }}
        >
          <div className="flex items-center gap-2">
            <Icon name="clock" size={16} color="var(--accent)" strokeWidth={1.5} />
            <span className="text-sm font-semibold" style={{ color: 'var(--ink-strong)' }}>
              最近记录
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-[6px] transition-colors duration-200 hover:bg-[var(--bg2)] lg:hidden"
          >
            <Icon name="close" size={16} color="var(--muted)" strokeWidth={1.5} />
          </button>
        </div>

        {/* 记录列表 */}
        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full mb-2" />
              <p className="text-xs" style={{ color: 'var(--muted)' }}>加载中...</p>
            </div>
          ) : records.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Icon name="note" size={28} color="var(--placeholder)" strokeWidth={1} />
              <p className="text-xs mt-3" style={{ color: 'var(--muted)' }}>暂无记录</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {records.map(record => {
                const config = getRecordType(record.type)
                const preview = getPreview(record)
                const dateLabel = formatDate(record.createdAt)
                return (
                  <button
                    key={record.id}
                    onClick={() => handleRecordClick(record)}
                    className="w-full text-left p-3 rounded-lg transition-all duration-200 hover:bg-[var(--bg2)] group"
                  >
                    <div className="flex items-start gap-2.5">
                      {/* 左侧类型图标 */}
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ backgroundColor: config.color + '15' }}
                      >
                        <Icon name={config.iconName} size={16} color={config.color} strokeWidth={1.5} />
                      </div>
                      {/* 右侧内容 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span
                            className="text-xs font-medium"
                            style={{ color: config.color }}
                          >
                            {config.label}
                          </span>
                          <span className="text-[11px] flex-shrink-0" style={{ color: 'var(--muted)' }}>
                            {dateLabel}
                          </span>
                        </div>
                        <p
                          className="text-sm truncate leading-relaxed"
                          style={{ color: 'var(--ink)' }}
                        >
                          {preview}
                        </p>
                        {record.tags && record.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {record.tags.slice(0, 2).map((tag, i) => (
                              <span
                                key={i}
                                className="text-[11px] px-1.5 py-0.5 rounded"
                                style={{ backgroundColor: 'var(--bg2)', color: 'var(--muted)' }}
                              >
                                #{tag}
                              </span>
                            ))}
                            {record.tags.length > 2 && (
                              <span
                                className="text-[11px] px-1.5 py-0.5 rounded"
                                style={{ backgroundColor: 'var(--bg2)', color: 'var(--muted)' }}
                              >
                                +{record.tags.length - 2}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* 底部统计 */}
        {!loading && records.length > 0 && (
          <div
            className="px-4 py-2.5 border-t flex-shrink-0"
            style={{ borderColor: 'var(--rule)' }}
          >
            <p className="text-xs text-center" style={{ color: 'var(--muted)' }}>
              共 {records.length} 条记录
            </p>
          </div>
        )}
      </div>
    </>
  )
}

export default RecentRecordsPanel

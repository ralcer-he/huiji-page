import { useState, useEffect, useMemo } from 'react'
import { calculateDailyEmotions } from '../../utils/calculateEmotions'
import { generateInsight, extractKeywords } from '../../utils/insightHelpers'
import Collapsible from '../ui/Collapsible'
import EmptyState from '../ui/EmptyState'
import Icon from '../ui/Icon'
import SectionTitle from '../ui/SectionTitle'
import { useWordCloudThresholds } from '../../hooks/useAppSettings'
import { useDominantEmotionPeriod } from '../../hooks/useAppSettings'

function calculateWeeklyTrend(records) {
  const weekdays = ['日', '一', '二', '三', '四', '五', '六']
  const today = new Date()
  const weekData = []
  const startOfWeek = new Date(today)
  startOfWeek.setDate(today.getDate() - today.getDay())

  for (let i = 0; i < 7; i++) {
    const date = new Date(startOfWeek)
    date.setDate(startOfWeek.getDate() + i)
    const dateStr = date.toISOString().split('T')[0]

    const dayRecords = records.filter(r => {
      const rDate = new Date(r.createdAt).toISOString().split('T')[0]
      return rDate === dateStr
    })

    const { topEmotion } = calculateDailyEmotions(dayRecords)
    const hasRecord = dayRecords.length > 0
    const height = hasRecord ? Math.min(55 + dayRecords.length * 15, 100) : 0

    weekData.push({
      label: weekdays[i],
      hasRecord,
      color: topEmotion?.color || null,
      height,
      emoji: topEmotion?.iconName || '',
      count: dayRecords.length,
    })
  }

  return weekData
}

function calculateMonthlyTrend(records) {
  const labels = ['第1周', '第2周', '第3周', '第4周']
  const today = new Date()
  const monthData = []
  
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  
  const weekRanges = []
  for (let w = 0; w < 4; w++) {
    const startDay = w * 7 + 1
    const endDay = Math.min((w + 1) * 7, daysInMonth)
    weekRanges.push({ startDay, endDay })
  }
  
  for (let i = 0; i < 4; i++) {
    const { startDay, endDay } = weekRanges[i]
    const weekRecords = records.filter(r => {
      const rDate = new Date(r.createdAt)
      return rDate.getFullYear() === today.getFullYear() 
        && rDate.getMonth() === today.getMonth()
        && rDate.getDate() >= startDay
        && rDate.getDate() <= endDay
    })
    
    const { topEmotion } = calculateDailyEmotions(weekRecords)
    const hasRecord = weekRecords.length > 0
    const height = hasRecord ? Math.min(55 + weekRecords.length * 8, 100) : 0
    
    monthData.push({
      label: labels[i],
      hasRecord,
      color: topEmotion?.color || null,
      height,
      emoji: topEmotion?.iconName || '',
      count: weekRecords.length,
    })
  }
  
  return monthData
}

function getLinePath(data) {
  const points = data.map((d, i) => ({
    x: 20 + i * 40,
    y: d.hasRecord ? 100 - (d.height / 100) * 80 : 100,
    hasRecord: d.hasRecord,
  }))

  let path = ''
  
  for (let i = 0; i < points.length; i++) {
    const p = points[i]
    if (i === 0) {
      path += `M ${p.x} ${p.y}`
    } else {
      const prev = points[i - 1]
      path += ` C ${prev.x + 15} ${prev.y}, ${p.x - 15} ${p.y}, ${p.x} ${p.y}`
    }
  }

  return path
}

function getAreaPath(data) {
  const linePath = getLinePath(data)
  if (!linePath) return ''

  const lastX = 20 + (data.length - 1) * 40
  const firstX = 20

  return `${linePath} L ${lastX} 100 L ${firstX} 100 Z`
}

const PERIOD_OPTIONS = [
  { days: 1, label: '今天' },
  { days: 3, label: '3天' },
  { days: 7, label: '7天' },
  { days: 30, label: '30天' },
]

function InsightSection({ records }) {
  const [chartType, setChartType] = useState('bar')
  const [wordCloudPeriod, setWordCloudPeriod] = useState(7)
  const [trendPeriod, setTrendPeriod] = useState('week')
  const [showTrendPeriodDropdown, setShowTrendPeriodDropdown] = useState(false)
  const wordCloudThresholds = useWordCloudThresholds()
  const dominantEmotionPeriod = useDominantEmotionPeriod()

  const dominantEmotionRecords = useMemo(() => {
    if (dominantEmotionPeriod === 'all') return records
    const now = new Date()
    let startDate
    if (dominantEmotionPeriod === 'week') {
      startDate = new Date(now)
      startDate.setDate(now.getDate() - now.getDay())
      startDate.setHours(0, 0, 0, 0)
    } else if (dominantEmotionPeriod === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
    } else if (dominantEmotionPeriod === 'year') {
      startDate = new Date(now.getFullYear(), 0, 1)
    }
    return records.filter(r => {
      const rDate = new Date(r.createdAt || r.id)
      return rDate >= startDate
    })
  }, [records, dominantEmotionPeriod])

  const topEmotions = useMemo(() => {
    const { emotions } = calculateDailyEmotions(dominantEmotionRecords)
    return emotions.slice(0, 5)
  }, [dominantEmotionRecords])

  const weeklyTrend = useMemo(() => calculateWeeklyTrend(records), [records])
  const monthlyTrend = useMemo(() => calculateMonthlyTrend(records), [records])
  const trendData = trendPeriod === 'week' ? weeklyTrend : monthlyTrend

  const insight = useMemo(() => {
    const { emotions } = calculateDailyEmotions(dominantEmotionRecords)
    return generateInsight(dominantEmotionRecords, { emotions })
  }, [dominantEmotionRecords])

  const periodRecords = useMemo(() => {
    const now = new Date()
    const cutoff = new Date(now.getTime() - wordCloudPeriod * 24 * 60 * 60 * 1000)
    return records.filter(r => {
      const date = new Date(r.createdAt || r.id)
      return date >= cutoff
    })
  }, [records, wordCloudPeriod])

  const keywords = useMemo(() => extractKeywords(periodRecords, wordCloudPeriod, wordCloudThresholds), [periodRecords, wordCloudPeriod, wordCloudThresholds])

  const hasInsight = insight.dominantName !== '暂无数据'

  return (
    <div className="mt-6">
      <div className="flex items-center gap-2 mb-4">
        <Icon name="sparkle" size={18} color="var(--muted)" />
        <SectionTitle level={2}>AI 情绪洞察</SectionTitle>
      </div>

      {/* 桌面端两栏：情绪分布 + 本周趋势 */}
      <div className="huiji-card mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5">
        {/* 情绪分布 */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium" style={{ color: 'var(--ink)' }}>情绪分布</h3>
          </div>
          {topEmotions.length === 0 ? (
            <EmptyState iconName="chart" title="还没有心情记录" />
          ) : (
            <div className="space-y-3">
              {topEmotions.map(emo => (
                <div key={emo.name} className="flex items-center gap-3">
                  <div
                    className="w-3.5 h-3.5 rounded flex-shrink-0"
                    style={{ backgroundColor: emo.color + '40', border: `1px solid ${emo.color}` }}
                  />
                  <span className="text-xs w-12 flex-shrink-0" style={{ color: 'var(--ink)' }}>{emo.name}</span>
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg2)' }}>
                    <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${emo.percentage}%`, backgroundColor: emo.color + 'AA' }} />
                  </div>
                  <span className="text-xs w-10 text-right flex-shrink-0" style={{ color: 'var(--muted)' }}>{emo.percentage}%</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 情绪趋势 */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="relative">
              <button
                onClick={() => setShowTrendPeriodDropdown(!showTrendPeriodDropdown)}
                className="flex items-center gap-1 text-sm font-medium transition-colors hover:opacity-80"
                style={{ color: 'var(--ink)' }}
              >
                {trendPeriod === 'week' ? '本周情绪趋势' : '本月情绪趋势'}
                <Icon name={showTrendPeriodDropdown ? 'chevron-up' : 'chevron-down'} size={14} color="var(--muted)" strokeWidth={1.5} />
              </button>
              {showTrendPeriodDropdown && (
                <div
                  className="absolute top-full left-0 mt-1 w-32 py-1 rounded-xl shadow-lg z-50 animate-fade-in"
                  style={{
                    backgroundColor: 'var(--bg)',
                    border: '1px solid var(--rule)',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                  }}
                >
                  {[
                    { value: 'week', label: '本周情绪趋势' },
                    { value: 'month', label: '本月情绪趋势' },
                  ].map(option => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setTrendPeriod(option.value)
                        setShowTrendPeriodDropdown(false)
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-[13px] transition-colors duration-150"
                      style={{
                        backgroundColor: trendPeriod === option.value ? 'var(--accent-light)' : 'transparent',
                        color: trendPeriod === option.value ? 'var(--accent)' : 'var(--ink)',
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-1">
              <button onClick={() => setChartType('bar')} className="flex items-center justify-center w-8 h-8 rounded-lg transition-all" style={{ backgroundColor: chartType === 'bar' ? 'var(--accent)' : 'var(--bg2)', color: chartType === 'bar' ? 'white' : 'var(--muted)' }} title="柱状图">
                <Icon name="bar-chart" size={16} color={chartType === 'bar' ? 'white' : 'var(--muted)'} strokeWidth={1.5} />
              </button>
              <button onClick={() => setChartType('line')} className="flex items-center justify-center w-8 h-8 rounded-lg transition-all" style={{ backgroundColor: chartType === 'line' ? 'var(--accent)' : 'var(--bg2)', color: chartType === 'line' ? 'white' : 'var(--muted)' }} title="折线图">
                <Icon name="line-chart" size={16} color={chartType === 'line' ? 'white' : 'var(--muted)'} strokeWidth={1.5} />
              </button>
            </div>
          </div>

          {chartType === 'bar' && (
            <div className="flex items-end justify-between h-36 gap-1">
              {trendData.map((item, index) => (
                <div key={index} className="flex-1 flex flex-col items-center gap-2">
                  <div className="flex-1 w-full flex items-end justify-center">
                    {item.hasRecord && <Icon name={item.emoji} size={16} color={item.color} strokeWidth={1.5} className="mb-1" />}
                  </div>
                  <div className="w-full rounded-t-lg transition-all duration-700" style={{ height: `${item.height}%`, backgroundColor: item.color || 'var(--rule)', minHeight: item.hasRecord ? '12px' : '6px', opacity: item.hasRecord ? 1 : 0.3 }} />
                  <span className="text-xs" style={{ color: 'var(--muted)' }}>{item.label}</span>
                </div>
              ))}
            </div>
          )}

          {chartType === 'line' && (
            <div className="relative h-36">
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 280 120" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.05" />
                  </linearGradient>
                </defs>
                <path d={getAreaPath(trendData)} fill="url(#lineGradient)" className="transition-all duration-700" />
                <path d={getLinePath(trendData)} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transition-all duration-700" />
                {trendData.map((item, index) => {
                  if (!item.hasRecord) return null
                  const x = 20 + index * 40
                  const y = 100 - (item.height / 100) * 80
                  return <circle key={index} cx={x} cy={y} r="4" fill="var(--bg)" stroke="var(--accent)" strokeWidth="2" className="transition-all duration-700" />
                })}
              </svg>
              <div className="absolute bottom-0 left-0 right-0 flex justify-between">
                {trendData.map((item, index) => (
                  <div key={index} className="flex-1 text-center text-xs" style={{ color: 'var(--muted)' }}>{item.label}</div>
                ))}
              </div>
            </div>
          )}
        </div>
        </div>
      </div>

      {/* 主导情绪卡片 */}
      {hasInsight ? (
        <div className="p-6 rounded-2xl relative overflow-hidden mb-4 border" style={{ backgroundColor: insight.dominantColor + '26', borderColor: insight.dominantColor + '60' }}>
          <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full" style={{ backgroundColor: insight.dominantColor + '1F' }} />
          <div className="relative z-10 flex items-center gap-5">
            <div
              className="shrink-0 flex items-center justify-center w-16 h-16 rounded-2xl border-2"
              style={{ backgroundColor: 'var(--bg)', borderColor: insight.dominantColor }}
            >
              <Icon name={insight.dominantIconName || 'mood'} size={36} color={insight.dominantColor} strokeWidth={2} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs mb-1" style={{ color: 'var(--muted)' }}>你的主导情绪</p>
              <div className="flex items-center gap-3">
                <h3 className="text-2xl font-bold" style={{ color: insight.dominantColor }}>{insight.dominantName}</h3>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <EmptyState iconName="sparkle" title="暂无情绪数据" hint="记录心情后可查看分析" />
      )}

      {/* 情绪波动分析 */}
      {hasInsight && (
        <Collapsible title="情绪波动分析" iconName="chart" defaultOpen={true}>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span style={{ color: 'var(--ink)' }}>情绪稳定性</span>
                <span style={{ color: 'var(--muted)' }}>{insight.stability}%</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg2)' }}>
                <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${insight.stability}%`, backgroundColor: insight.stability > 70 ? '#10b981AA' : insight.stability > 40 ? '#f59e0bAA' : '#ef4444AA' }} />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {insight.emotionTypes.map((emo, i) => (
                <span key={i} className="px-2.5 py-1 rounded-full text-xs flex items-center gap-1 border" style={{ backgroundColor: 'var(--bg)', color: emo.color, borderColor: emo.color + '60' }}>
                  <Icon name={emo.iconName} size={12} color={emo.color} strokeWidth={1.5} />
                  {emo.name}
                </span>
              ))}
            </div>
          </div>
        </Collapsible>
      )}

      {/* 关键词云 */}
      <div className="huiji-card mb-4 overflow-hidden">
      <Collapsible title="关键词云" iconName="tag" defaultOpen={true}>
        <div className="flex gap-1.5 p-1.5 rounded-xl mb-4" style={{ backgroundColor: 'var(--bg2)' }}>
          {PERIOD_OPTIONS.map(opt => (
            <button key={opt.days} onClick={() => setWordCloudPeriod(opt.days)} className="flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all" style={{ backgroundColor: wordCloudPeriod === opt.days ? 'var(--accent)' : 'transparent', color: wordCloudPeriod === opt.days ? 'white' : 'var(--muted)' }}>
              {opt.label}
            </button>
          ))}
        </div>
        {keywords.length === 0 ? (
          <p className="text-xs py-4 text-center" style={{ color: 'var(--muted)' }}>暂无关键词</p>
        ) : (
          <div className="relative min-h-[120px] flex flex-wrap items-center justify-center gap-2 p-4 rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--bg2)', borderRadius: 'var(--radius-card)' }}>
            {keywords.map((kw, i) => {
              const periodMultiplier = wordCloudPeriod === 1 ? 1.0 : wordCloudPeriod === 3 ? 0.85 : wordCloudPeriod === 7 ? 0.7 : 0.55
              const baseSize = Math.min((10 + kw.weight * 18) * periodMultiplier, 24)
              const rotate = (i % 3 - 1) * 4
              return (
                <span key={i} className="px-2.5 py-1.5 rounded-lg transition-colors duration-200 cursor-default max-w-full break-words inline-block" style={{ fontSize: `${baseSize}px`, color: 'var(--ink)', transform: `rotate(${rotate}deg)`, fontWeight: kw.weight > 0.6 ? 600 : 400, lineHeight: 1.4 }}>
                  {kw.word}
                </span>
              )
            })}
          </div>
        )}
      </Collapsible>
      </div>

      {/* AI 建议 */}
      {insight.suggestions.length > 0 && (
        <div className="huiji-card mb-4 overflow-hidden">
        <Collapsible title="AI 建议" iconName="info" defaultOpen={true}>
          <div className="space-y-2">
            {insight.suggestions.map((s, i) => (
              <div key={i} className="flex items-start gap-2 p-3 rounded-lg" style={{ backgroundColor: 'var(--bg2)' }}>
                <Icon name="check" size={14} color="var(--accent)" className="mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{s.title}</p>
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Collapsible>
        </div>
      )}
    </div>
  )
}

export default InsightSection

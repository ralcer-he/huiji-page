import { useState, useEffect, useMemo } from 'react'
import { getAllRecords } from '../db/database'
import { calculateDailyEmotions } from '../utils/calculateEmotions'
import { generateInsight, extractKeywords } from '../utils/insightHelpers'
import { calculateStreak } from '../utils/recordHelpers'
import Icon from '../components/ui/Icon'
import { useWordCloudThresholds } from '../hooks/useAppSettings'

function InsightPage() {
  const [allRecords, setAllRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('week') // week | month

  const [wordCloudPeriod, setWordCloudPeriod] = useState('today')
  const wordCloudThresholds = useWordCloudThresholds()

  useEffect(() => {
    loadRecords()
  }, [])

  const loadRecords = async () => {
    setLoading(true)
    try {
      const records = await getAllRecords()
      setAllRecords(records)
    } catch (error) {
      console.error('加载记录失败:', error)
    }
    setLoading(false)
  }

  const filteredRecords = useMemo(() => {
    const now = new Date()
    let startDate
    if (period === 'week') {
      startDate = new Date(now)
      startDate.setDate(now.getDate() - 6)
    } else {
      startDate = new Date(now)
      startDate.setDate(now.getDate() - 29)
    }
    startDate.setHours(0, 0, 0, 0)
    return allRecords.filter(r => new Date(r.createdAt) >= startDate)
  }, [allRecords, period])

  const emotions = useMemo(() => {
    return calculateDailyEmotions(filteredRecords)
  }, [filteredRecords])

  const trendData = useMemo(() => {
    return calculateTrendData(filteredRecords, period)
  }, [filteredRecords, period])

  const streakData = useMemo(() => {
    const currentStreak = calculateStreak(allRecords)
    const dateSet = new Set()
    allRecords.forEach(r => {
      dateSet.add(new Date(r.createdAt).toISOString().split('T')[0])
    })
    return {
      currentStreak,
      totalDays: dateSet.size,
      totalRecords: allRecords.length,
    }
  }, [allRecords])

  const insight = useMemo(() => {
    const result = generateInsight(allRecords, emotions)
    if (allRecords.length === 0) {
      return { ...result, summary: '暂无心情记录' }
    }
    return result
  }, [allRecords, emotions])

  const keywords = useMemo(() => {
    return extractKeywords(allRecords, 7, wordCloudThresholds)
  }, [allRecords, wordCloudThresholds])

  const wordCloudRecords = useMemo(() => {
    const now = new Date()
    let startDate = new Date()
    startDate.setHours(0, 0, 0, 0)
    if (wordCloudPeriod === 'today') {
      // 今天 0 点至今
    } else if (wordCloudPeriod === '3days') {
      startDate.setDate(now.getDate() - 2)
    } else if (wordCloudPeriod === '7days') {
      startDate.setDate(now.getDate() - 6)
    } else if (wordCloudPeriod === '30days') {
      startDate.setDate(now.getDate() - 29)
    }
    return allRecords.filter(r => new Date(r.createdAt) >= startDate)
  }, [allRecords, wordCloudPeriod])

  const wordCloudKeywords = useMemo(() => {
    return extractKeywords(wordCloudRecords, wordCloudPeriod, wordCloudThresholds)
  }, [wordCloudRecords, wordCloudPeriod, wordCloudThresholds])

  const stabilityValue = Number(insight.stability || 0)
  const isHappyDominant = insight.dominantName === '开心'

  return (
    <div className="w-full py-6 pb-24 animate-fade-in max-w-[1100px] mx-auto">
      {/* 顶部标题 */}
      <div className="mb-6">
        <h1 className="huiji-h1">AI 情绪洞察</h1>
      </div>

      {/* 时间范围切换 - 图标按钮 */}
      <div className="flex items-center gap-2 mb-6">
        <span className="text-sm" style={{ color: 'var(--muted)' }}>时间范围</span>
        <div className="flex gap-1.5">
          <button
            onClick={() => setPeriod('week')}
            className="flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200"
            style={{
              backgroundColor: period === 'week' ? 'var(--accent)' : 'var(--bg2)',
              color: period === 'week' ? 'white' : 'var(--muted)',
            }}
            title="本周"
          >
            <Icon name="clock" size={18} color={period === 'week' ? 'white' : 'var(--muted)'} strokeWidth={1.5} />
          </button>
          <button
            onClick={() => setPeriod('month')}
            className="flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200"
            style={{
              backgroundColor: period === 'month' ? 'var(--accent)' : 'var(--bg2)',
              color: period === 'month' ? 'white' : 'var(--muted)',
            }}
            title="本月"
          >
            <Icon name="calendar" size={18} color={period === 'month' ? 'white' : 'var(--muted)'} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* 顶部 3 个统计卡 */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="huiji-card p-4 text-center" style={{ backgroundColor: 'var(--accent-light)' }}>
          <div className="text-xl font-semibold mb-1" style={{ color: 'var(--accent)' }}>
            {streakData.currentStreak}
          </div>
          <div className="text-xs" style={{ color: 'var(--muted)' }}>连续天数</div>
        </div>
        <div className="huiji-card p-4 text-center" style={{ backgroundColor: 'var(--accent-light)' }}>
          <div className="text-xl font-semibold mb-1" style={{ color: 'var(--accent)' }}>
            {streakData.totalDays}
          </div>
          <div className="text-xs" style={{ color: 'var(--muted)' }}>记录天数</div>
        </div>
        <div className="huiji-card p-4 text-center" style={{ backgroundColor: 'var(--accent-light)' }}>
          <div className="text-xl font-semibold mb-1" style={{ color: 'var(--accent)' }}>
            {stabilityValue.toFixed(1)}
          </div>
          <div className="text-xs" style={{ color: 'var(--muted)' }}>情绪稳定性</div>
        </div>
      </div>

      {/* 主导情绪模块 - 浅黄背景卡片 */}
      <div
        className="huiji-card p-6 mb-6"
        style={{
          backgroundColor: isHappyDominant ? '#FFF8E1' : 'var(--bg2)',
        }}
      >
        <div className="flex items-center gap-5">
          <div className="shrink-0 flex items-center justify-center w-16 h-16 rounded-2xl" style={{ backgroundColor: insight.dominantColor + '30', border: `2px solid ${insight.dominantColor}60` }}>
            <Icon name={insight.dominantIconName || 'mood'} size={36} color={insight.dominantColor} strokeWidth={2} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-semibold" style={{ color: 'var(--ink-strong)' }}>
                {insight.dominantName}
              </h2>
              <span className="px-2.5 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: insight.dominantColor + '20', color: insight.dominantColor }}>
                {insight.dominantPercentage}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* AI 情绪洞察 - 单卡片 */}
      <div className="huiji-card p-5 mb-6">
        <h3 className="text-base font-semibold mb-4" style={{ color: 'var(--ink-strong)' }}>
          情绪波动
        </h3>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
                情绪稳定性
              </p>
              <p className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>
                {stabilityValue.toFixed(1)}
              </p>
            </div>
            <div
              className="w-full rounded-full overflow-hidden"
              style={{ height: '6px', backgroundColor: 'var(--bg2)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{
                  width: `${insight.stability}%`,
                  backgroundColor: 'var(--accent)',
                }}
              />
            </div>
            <p className="huiji-caption-secondary mt-1.5">
              {insight.stability > 70 ? '情绪整体平稳，状态不错' : insight.stability > 40 ? '有一定波动，属于正常范围' : '波动较大，注意调节'}
            </p>
          </div>

          <div>
            <p className="text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
              情绪丰富度
            </p>
            <div className="flex flex-wrap gap-2">
              {insight.emotionTypes.map((emo, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1"
                  style={{
                    backgroundColor: emo.color + '20',
                    color: emo.color,
                  }}
                >
                  <Icon name={emo.iconName} size={12} color={emo.color} strokeWidth={1.5} />
                  {emo.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 情绪趋势折线图 */}
      <div className="huiji-card p-5 mb-6">
        <h3 className="text-base font-semibold mb-4" style={{ color: 'var(--ink-strong)' }}>
          情绪趋势
        </h3>
        <EmotionTrendChart data={trendData} period={period} />
      </div>

      {/* 关键词云 */}
      <div className="huiji-card p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold" style={{ color: 'var(--ink-strong)' }}>
            关键词
          </h3>
          <div className="flex gap-1.5 p-1.5 rounded-xl" style={{ backgroundColor: 'var(--bg)' }}>
            {[
              { value: 'today', label: '今天' },
              { value: '3days', label: '3天' },
              { value: '7days', label: '7天' },
              { value: '30days', label: '30天' },
            ].map(item => (
              <button
                key={item.value}
                onClick={() => setWordCloudPeriod(item.value)}
                className="flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                style={{
                  backgroundColor: wordCloudPeriod === item.value ? 'var(--accent)' : 'transparent',
                  color: wordCloudPeriod === item.value ? 'white' : 'var(--muted)',
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <div
          className="flex flex-wrap gap-2 justify-center items-center min-h-[120px] p-4 rounded-xl"
          style={{ alignContent: 'center', backgroundColor: 'var(--bg2)' }}
        >
          {wordCloudKeywords.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              记录更多内容后显示关键词
            </p>
          ) : (
            wordCloudKeywords.map((kw, i) => {
              const size = 13 + kw.weight * 6
              return (
                <span
                  key={i}
                  className="px-2 py-0.5 font-medium transition-all duration-300 cursor-default whitespace-nowrap"
                  style={{
                    color: 'var(--ink)',
                    fontSize: `${size}px`,
                    lineHeight: 1.5,
                  }}
                >
                  {kw.word}
                </span>
              )
            })
          )}
        </div>
        {wordCloudKeywords.length > 0 && (
          <p className="text-xs text-center mt-3" style={{ color: 'var(--muted)' }}>
            共{wordCloudKeywords.length}个关键词
          </p>
        )}
      </div>

      {/* 情绪建议 */}
      <div className="huiji-card p-5 mb-6">
        <h3 className="text-base font-semibold mb-4" style={{ color: 'var(--ink-strong)' }}>
          情绪建议
        </h3>
        <div className="space-y-3">
          {insight.suggestions.map((suggestion, i) => (
            <div key={i} className="p-3 rounded-xl" style={{ backgroundColor: 'var(--bg2)' }}>
              <div className="text-sm font-medium mb-1" style={{ color: 'var(--ink)' }}>
                {suggestion.title}
              </div>
              <div className="text-xs" style={{ color: 'var(--muted)' }}>
                {suggestion.desc}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function calculateTrendData(records, period) {
  const days = period === 'week' ? 7 : 30
  const result = []
  const now = new Date()

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(now.getDate() - i)
    date.setHours(0, 0, 0, 0)

    const nextDate = new Date(date)
    nextDate.setDate(date.getDate() + 1)

    const dayRecords = records.filter(r => {
      const rDate = new Date(r.createdAt)
      return rDate >= date && rDate < nextDate
    })

    const { topEmotion, emotions: dayEmotions } = calculateDailyEmotions(dayRecords)

    const labels = period === 'week'
      ? ['日', '一', '二', '三', '四', '五', '六'][date.getDay()]
      : date.getDate().toString()

    result.push({
      date: date.toISOString().split('T')[0],
      label: labels,
      hasRecord: dayRecords.length > 0,
      topEmotion: topEmotion || null,
      emotions: dayEmotions,
      positivityScore: calculatePositivityScore(dayEmotions),
    })
  }

  return result
}

function calculatePositivityScore(emotions) {
  if (!emotions || emotions.length === 0) return 50

  const positiveEmotions = ['开心', '兴奋', '平静', '感动']
  const negativeEmotions = ['难过', '愤怒', '焦虑', '疲惫']

  let positiveScore = 0
  let negativeScore = 0

  emotions.forEach(emo => {
    if (positiveEmotions.includes(emo.name)) {
      positiveScore += emo.percentage
    } else if (negativeEmotions.includes(emo.name)) {
      negativeScore += emo.percentage
    }
  })

  const total = positiveScore + negativeScore
  if (total === 0) return 50

  return Math.round(50 + (positiveScore - negativeScore) / 2)
}

function EmotionTrendChart({ data, period }) {
  const height = 180
  const padding = { top: 20, right: 10, bottom: 30, left: 10 }
  const chartHeight = height - padding.top - padding.bottom

  const hasData = data.some(d => d.hasRecord)

  if (!hasData) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          记录更多天后显示趋势
        </p>
      </div>
    )
  }

  const points = data.map((d, i) => {
    const xPct = padding.left + (i / (data.length - 1)) * (100 - padding.left - padding.right)
    const y = padding.top + (1 - d.positivityScore / 100) * chartHeight
    return { xPct, y, ...d }
  })

  const pathD = points.map((p, i) => {
    if (i === 0) return `M ${p.xPct} ${p.y}`
    return `L ${p.xPct} ${p.y}`
  }).join(' ')

  const areaD = pathD + ` L ${points[points.length - 1].xPct} ${height - padding.bottom} L ${points[0].xPct} ${height - padding.bottom} Z`

  return (
    <div className="relative w-full" style={{ height }}>
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 100 ${height}`}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="trendGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.12" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
          <line
            key={i}
            x1={padding.left}
            y1={padding.top + ratio * chartHeight}
            x2={100 - padding.right}
            y2={padding.top + ratio * chartHeight}
            stroke="var(--rule)"
            strokeWidth="0.5"
            strokeDasharray="2,2"
          />
        ))}

        <path
          d={areaD}
          fill="url(#trendGradient)"
        />

        <path
          d={pathD}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {points.map((p, i) => (
          p.hasRecord && (
            <circle
              key={i}
              cx={p.xPct}
              cy={p.y}
              r="4"
              fill="var(--bg2)"
              stroke="var(--accent)"
              strokeWidth="2"
            />
          )
        ))}
      </svg>

      <div
        className="absolute bottom-0 left-0 right-0 flex justify-between"
        style={{ paddingLeft: padding.left + '%', paddingRight: padding.right + '%' }}
      >
        {data.map((d, i) => (
          <span
            key={i}
            className="text-xs"
            style={{ color: d.hasRecord ? 'var(--muted)' : 'var(--rule)' }}
          >
            {d.label}
          </span>
        ))}
      </div>

      <div className="absolute top-0 right-0 flex items-center gap-2">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'var(--accent)' }} />
        <span className="text-xs" style={{ color: 'var(--muted)' }}>情绪指数</span>
      </div>
    </div>
  )
}

export default InsightPage

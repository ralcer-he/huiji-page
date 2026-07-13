import { useState, useEffect, useMemo } from 'react'
import { getAllRecords } from '../db/database'
import { calculateStreak, getLocalDateStr, stripHtml } from '../utils/recordHelpers'
import YearInPixels from '../components/YearInPixels'
import AnnualReviewReport from '../components/AnnualReviewReport'
import InsightSection from '../components/settings/InsightSection'

function StatsPage() {
  const [allRecords, setAllRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAnnualReview, setShowAnnualReview] = useState(false)

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

  const stats = useMemo(() => {
    if (allRecords.length === 0) {
      return { total: 0, days: 0, streak: 0, words: 0 }
    }
    const dates = new Set(
      allRecords.map(r => getLocalDateStr(r.createdAt))
    )
    const totalWords = allRecords
      .filter(r => r.content)
      .reduce((sum, r) => {
        const text = stripHtml(r.content)
        const chinese = text.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g)
        const english = text.match(/[a-zA-Z]+/g)
        return sum + (chinese ? chinese.length : 0) + (english ? english.length : 0)
      }, 0)
    return {
      total: allRecords.length,
      days: dates.size,
      streak: calculateStreak(allRecords),
      words: totalWords,
    }
  }, [allRecords])

  return (
    <div className="w-full py-6 pb-24 animate-fade-in max-w-[800px] mx-auto">
      {/* 数据概览卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="huiji-card p-4 text-center" style={{ backgroundColor: 'var(--accent-light)' }}>
          <div className="text-xl font-semibold mb-1" style={{ color: 'var(--accent)' }}>{stats.total}</div>
          <div className="text-xs" style={{ color: 'var(--muted)' }}>总记录</div>
        </div>
        <div className="huiji-card p-4 text-center" style={{ backgroundColor: 'var(--accent-light)' }}>
          <div className="text-xl font-semibold mb-1" style={{ color: 'var(--accent)' }}>{stats.days}</div>
          <div className="text-xs" style={{ color: 'var(--muted)' }}>记录天数</div>
        </div>
        <div className="huiji-card p-4 text-center" style={{ backgroundColor: 'var(--accent-light)' }}>
          <div className="text-xl font-semibold mb-1" style={{ color: 'var(--accent)' }}>{stats.streak}</div>
          <div className="text-xs" style={{ color: 'var(--muted)' }}>连续天数</div>
        </div>
        <div className="huiji-card p-4 text-center" style={{ backgroundColor: 'var(--accent-light)' }}>
          <div className="text-xl font-semibold mb-1" style={{ color: 'var(--accent)' }}>{stats.words.toLocaleString()}</div>
          <div className="text-xs" style={{ color: 'var(--muted)' }}>总字数</div>
        </div>
      </div>

      {/* AI 情绪洞察区域 */}
      <InsightSection records={allRecords} />

      {/* 年度像素图 */}
      <div className="mt-5">
        <YearInPixels
          records={allRecords}
          onDayClick={() => {
            window.location.hash = '#/calendar'
          }}
        />
      </div>

      {/* 年度报告 */}
      <div className="mt-6">
        <button
          onClick={() => setShowAnnualReview(true)}
          className="w-full huiji-card p-4 flex items-center justify-center gap-2 hover:bg-[var(--bg2)] transition-colors rounded-xl"
        >
          <span className="text-sm font-medium" style={{ color: 'var(--accent)' }}>查看年度报告</span>
        </button>
      </div>

      {showAnnualReview && (
        <AnnualReviewReport onClose={() => setShowAnnualReview(false)} />
      )}
    </div>
  )
}

export default StatsPage

import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { getAllRecords } from '../db/database'
import { EMOTIONS } from '../constants/emotions'
import { exportToPDF } from '../utils/pdfExport'
import { formatLastBackupDate, recordBackupDate } from '../utils/reminder'
import { stripHtml } from '../utils/recordHelpers'
import Icon from './ui/Icon'
import EmptyState from './ui/EmptyState'

// 生成年度回顾报告
export function generateAnnualReport(records, year) {
  const yearRecords = records.filter(r => {
    const date = new Date(r.createdAt)
    return date.getFullYear() === year
  })
  
  if (yearRecords.length === 0) {
    return null
  }
  
  // 获取日期字符串工具函数
  const getDateStr = (record) => new Date(record.createdAt).toISOString().split('T')[0]
  
  // 基础统计
  const totalRecords = yearRecords.length
  const writingDays = new Set(yearRecords.map(r => getDateStr(r))).size
  
  // 总字数统计（与统计页逻辑一致）
  const totalWords = yearRecords
    .filter(r => r.content)
    .reduce((sum, r) => {
      const text = stripHtml(r.content)
      const chinese = text.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g)
      const english = text.match(/[a-zA-Z]+/g)
      return sum + (chinese ? chinese.length : 0) + (english ? english.length : 0)
    }, 0)
  
  // 月度统计
  const monthlyStats = {}
  for (let i = 1; i <= 12; i++) {
    monthlyStats[i] = { count: 0, emotions: {} }
  }
  
  yearRecords.forEach(r => {
    const month = new Date(r.createdAt).getMonth() + 1
    monthlyStats[month].count++
    if (r.emotions) {
      r.emotions.forEach(e => {
        monthlyStats[month].emotions[e] = (monthlyStats[month].emotions[e] || 0) + 1
      })
    }
  })
  
  // 情绪统计
  const emotionCounts = {}
  yearRecords.forEach(r => {
    if (r.emotions) {
      r.emotions.forEach(e => {
        emotionCounts[e] = (emotionCounts[e] || 0) + 1
      })
    }
  })
  
  // 活动标签统计
  const activityCounts = {}
  yearRecords.forEach(r => {
    if (r.activities) {
      r.activities.forEach(a => {
        activityCounts[a] = (activityCounts[a] || 0) + 1
      })
    }
  })
  
  // 标签统计
  const tagCounts = {}
  yearRecords.forEach(r => {
    if (r.tags) {
      r.tags.forEach(t => {
        tagCounts[t] = (tagCounts[t] || 0) + 1
      })
    }
  })
  
  // 找出最佳月份
  const monthlyRanking = Object.entries(monthlyStats)
    .map(([month, stats]) => ({ month: parseInt(month), ...stats }))
    .sort((a, b) => b.count - a.count)
  
  const topMonth = monthlyRanking[0]
  const topEmotion = Object.entries(emotionCounts).sort((a, b) => b[1] - a[1])[0]
  const topActivity = Object.entries(activityCounts).sort((a, b) => b[1] - a[1])[0]
  
  // 连续记录计算
  const sortedDates = [...new Set(yearRecords.map(r => getDateStr(r)))].sort()
  let maxStreak = 0
  let currentStreak = 1
  
  for (let i = 1; i < sortedDates.length; i++) {
    const prev = new Date(sortedDates[i - 1])
    const curr = new Date(sortedDates[i])
    const diffDays = (curr - prev) / (1000 * 60 * 60 * 24)
    
    if (diffDays === 1) {
      currentStreak++
      maxStreak = Math.max(maxStreak, currentStreak)
    } else {
      currentStreak = 1
    }
  }
  
  // 每月记录天数
  const monthlyWritingDays = {}
  for (let i = 1; i <= 12; i++) {
    monthlyWritingDays[i] = new Set()
  }
  yearRecords.forEach(r => {
    const date = getDateStr(r)
    const month = new Date(date).getMonth() + 1
    monthlyWritingDays[month].add(date)
  })
  
  return {
    year,
    totalRecords,
    writingDays,
    totalWords,
    monthlyStats,
    monthlyWritingDays,
    emotionCounts,
    activityCounts,
    tagCounts,
    topMonth,
    topEmotion,
    topActivity,
    maxStreak,
    streakDays: currentStreak,
  }
}

// 获取主导情绪
function getDominantEmotion(emotionCounts) {
  if (!emotionCounts || Object.keys(emotionCounts).length === 0) return null
  const sorted = Object.entries(emotionCounts).sort((a, b) => b[1] - a[1])
  return sorted[0][0]
}

// 获取情绪emoji
function getEmotionEmoji(emotionName) {
  const emotion = EMOTIONS.find(e => e.name === emotionName)
  return emotion ? emotion.emoji : '😊'
}

// 获取情绪颜色
function getEmotionColor(emotionName) {
  const emotion = EMOTIONS.find(e => e.name === emotionName)
  return emotion ? emotion.color : '#E8D5A3'
}

const MONTH_NAMES = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']

export default function AnnualReviewReport({ onClose }) {
  const [year, setYear] = useState(new Date().getFullYear())
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [records, setRecords] = useState([])
  
  useEffect(() => {
    loadData()
  }, [year])
  
  const loadData = async () => {
    setLoading(true)
    const allRecords = await getAllRecords()
    setRecords(allRecords)
    const annualReport = generateAnnualReport(allRecords, year)
    setReport(annualReport)
    setLoading(false)
  }
  
  const handleExportPDF = async () => {
    if (!report) return
    setExporting(true)
    
    try {
      // 生成年度回顾的HTML内容
      const content = generateReportHTML(report, year)
      
      // 通过iframe打印
      const iframe = document.createElement('iframe')
      iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:none;'
      document.body.appendChild(iframe)
      
      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document
      iframeDoc.open()
      iframeDoc.write(content)
      iframeDoc.close()
      
      iframe.onload = () => {
        iframe.contentWindow.print()
        setTimeout(() => {
          document.body.removeChild(iframe)
        }, 1000)
      }
      
      await recordBackupDate()
    } catch (err) {
      console.error('导出失败:', err)
      alert('导出失败，请重试')
    }
    setExporting(false)
  }
  
  if (loading) {
    return typeof document !== 'undefined' ? createPortal(
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
        <div className="huiji-card rounded-[12px] p-6 w-80 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full mx-auto mb-2" />
          <p className="text-sm" style={{ color: 'var(--muted)' }}>生成年度报告...</p>
        </div>
      </div>,
      document.body
    ) : null
  }
  
  if (!report) {
    return typeof document !== 'undefined' ? createPortal(
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
        <div className="huiji-card rounded-[12px] p-6 w-80 text-center">
          <EmptyState
            iconName="note"
            title={`${year}年暂无记录`}
            hint="开始记录后即可生成年度报告"
          />
          <button
            onClick={onClose}
            className="mt-4 px-6 py-2 rounded-xl text-sm font-medium"
            style={{ backgroundColor: 'var(--accent)', color: 'white' }}
          >
            返回
          </button>
        </div>
      </div>,
      document.body
    ) : null
  }
  
  return typeof document !== 'undefined' ? createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
      <div 
        className="huiji-card rounded-[12px] w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        style={{ maxHeight: '90vh' }}
      >
        {/* 头部 */}
        <div className="h-12 px-5 border-b flex items-center justify-between" style={{ borderColor: 'var(--rule)' }}>
          <div className="flex items-center gap-3">
            <Icon name="chart" size={24} color="var(--accent)" strokeWidth={1.5} />
            <div>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--ink)' }}>年度回顾</h2>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>{year}年数据报告</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-[6px] flex items-center justify-center hover:bg-[var(--bg2)] transition-colors duration-200"
          >
            <Icon name="close" size={20} color="currentColor" strokeWidth={2} />
          </button>
        </div>
        
        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* 年份选择 */}
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setYear(y => y - 1)}
              className="w-8 h-8 rounded-[6px] flex items-center justify-center hover:bg-[var(--bg2)] transition-colors duration-200"
            >
              ‹
            </button>
            <span className="text-lg font-semibold px-4">{year}年</span>
            <button
              onClick={() => setYear(y => y + 1)}
              disabled={year >= new Date().getFullYear()}
              className="w-8 h-8 rounded-[6px] flex items-center justify-center hover:bg-[var(--bg2)] transition-colors duration-200 disabled:opacity-30"
            >
              ›
            </button>
          </div>
          
          {/* 概览卡片 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl text-center" style={{ backgroundColor: 'var(--bg)' }}>
              <div className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>{report.totalRecords}</div>
              <div className="mt-1" style={{ color: 'var(--muted)', fontSize: '13px' }}>总记录数</div>
            </div>
            <div className="p-4 rounded-xl text-center" style={{ backgroundColor: 'var(--bg)' }}>
              <div className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>{report.writingDays}</div>
              <div className="mt-1" style={{ color: 'var(--muted)', fontSize: '13px' }}>写作天数</div>
            </div>
            <div className="p-4 rounded-xl text-center" style={{ backgroundColor: 'var(--bg)' }}>
              <div className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>{report.maxStreak}</div>
              <div className="mt-1" style={{ color: 'var(--muted)', fontSize: '13px' }}>最长连续</div>
            </div>
            <div className="p-4 rounded-xl text-center" style={{ backgroundColor: 'var(--bg)' }}>
              <div className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>{report.totalWords}</div>
              <div className="mt-1" style={{ color: 'var(--muted)', fontSize: '13px' }}>总字数</div>
            </div>
          </div>
          
          {/* 月度记录热力图 */}
          <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--bg)' }}>
            <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--ink)' }}>月度记录分布</h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {Object.entries(report.monthlyStats).map(([month, stats]) => {
                const maxCount = Math.max(...Object.values(report.monthlyStats).map(s => s.count))
                const intensity = maxCount > 0 ? stats.count / maxCount : 0
                const opacity = 0.2 + intensity * 0.8
                
                return (
                  <div key={month}
                    className="p-2 rounded-[8px] text-center transition-all duration-200"
                    style={{ 
                      backgroundColor: stats.count > 0 ? `var(--accent-light)` : 'var(--bg2)',
                    }}
                  >
                    <div className="text-[12px] font-medium" style={{ color: stats.count > 0 ? 'var(--accent)' : 'var(--muted)' }}>{MONTH_NAMES[month - 1]}</div>
                    <div className="text-[16px] font-bold" style={{ color: stats.count > 0 ? 'var(--accent)' : 'var(--muted)' }}>
                      {stats.count}
                    </div>
                    <div className="huiji-caption-secondary text-[12px]">篇</div>
                  </div>
                )
              })}
            </div>
          </div>
          
          {/* 情绪分布 */}
          <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--bg)' }}>
            <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--ink)' }}>情绪分布</h3>
            <div className="space-y-2">
              {Object.entries(report.emotionCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([emotion, count]) => {
                  const percentage = Math.round((count / report.totalRecords) * 100)
                  const color = getEmotionColor(emotion)
                  
                  return (
                    <div key={emotion} className="flex items-center gap-3">
                      <Icon name={EMOTIONS.find(e => e.name === emotion)?.iconName || 'mood'} size={20} color={color} strokeWidth={1.5} />
                      <span className="text-sm flex-1" style={{ color: 'var(--ink)' }}>{emotion}</span>
                      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg2)' }}>
                        <div 
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%`, backgroundColor: color }}
                        />
                      </div>
                      <span className="text-xs w-12 text-right" style={{ color: 'var(--muted)' }}>{percentage}%</span>
                    </div>
                  )
                })}
            </div>
            {report.topEmotion && (
              <div className="mt-3 pt-3 border-t text-center" style={{ borderColor: 'var(--rule)' }}>
                <span className="text-sm" style={{ color: 'var(--muted)' }}>
                  年度最佳心情：{report.topEmotion[0]} ({report.topEmotion[1]}次)
                </span>
              </div>
            )}
          </div>
          
          {/* 活动分布 */}
          {Object.keys(report.activityCounts).length > 0 && (
            <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--bg)' }}>
              <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--ink)' }}>活动分布</h3>
              <div className="flex flex-wrap gap-2">
                {Object.entries(report.activityCounts)
                  .sort((a, b) => b[1] - a[1])
                  .map(([activity, count]) => (
                    <span 
                      key={activity}
                      className="px-3 py-1 rounded-full text-sm"
                      style={{ backgroundColor: 'var(--accent)', color: 'white' }}
                    >
                      {activity} {count}次
                    </span>
                  ))}
              </div>
            </div>
          )}
          
          {/* 高光时刻 */}
          <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--bg)' }}>
            <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--ink)' }}>{year}年高光时刻</h3>
            <div className="space-y-2 text-sm" style={{ color: 'var(--muted)' }}>
              <p>累计记录 <span className="font-bold" style={{ color: 'var(--accent)' }}>{report.totalRecords}</span> 条</p>
              <p>累计书写 <span className="font-bold" style={{ color: 'var(--accent)' }}>{report.totalWords}</span> 字</p>
              <p>记录覆盖 <span className="font-bold" style={{ color: 'var(--accent)' }}>{report.writingDays}</span> 天</p>
              <p>最长连续记录 <span className="font-bold" style={{ color: 'var(--accent)' }}>{report.maxStreak}</span> 天</p>
              {report.topMonth && (
                <p>记录最多的月份是 <span className="font-bold" style={{ color: 'var(--accent)' }}>{MONTH_NAMES[report.topMonth.month - 1]}</span> ({report.topMonth.count}条)</p>
              )}
              {report.topActivity && (
                <p>最常参与的活动是 <span className="font-bold" style={{ color: 'var(--accent)' }}>{report.topActivity[0]}</span> ({report.topActivity[1]}次)</p>
              )}
            </div>
          </div>
          
          {/* 底部操作 */}
          <div className="pt-4 border-t" style={{ borderColor: 'var(--rule)' }}>
            <div className="flex justify-between">
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl text-sm font-medium"
                style={{ backgroundColor: 'var(--bg)', color: 'var(--ink)' }}
              >
                关闭
              </button>
              <button
                onClick={handleExportPDF}
                disabled={exporting}
                className="px-5 py-2.5 rounded-xl text-sm font-medium transition-colors duration-200 flex items-center gap-2"
                style={{ backgroundColor: 'var(--accent)', color: 'white' }}
              >
                <Icon name="export" size={16} color="white" strokeWidth={1.5} />
                {exporting ? '导出中...' : '导出PDF'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  ) : null
}

function generateReportHTML(report, year) {
  const totalRecords = report.totalRecords
  const writingDays = report.writingDays
  
  // 情绪分布HTML
  const emotionDistributionHTML = Object.entries(report.emotionCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([emotion, count]) => {
      const percentage = Math.round((count / totalRecords) * 100)
      const color = getEmotionColor(emotion)
      return `
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
          <span style="flex: 1; font-size: 14px; color: #333;">${emotion}</span>
          <div style="flex: 1; height: 8px; background: #f0f0f0; border-radius: 4px; overflow: hidden;">
            <div style="height: 100%; width: ${percentage}%; background: ${color}; border-radius: 4px;"></div>
          </div>
          <span style="width: 40px; text-align: right; font-size: 12px; color: #999;">${percentage}%</span>
        </div>
      `
    }).join('')
  
  // 月度分布HTML
  const monthlyDistributionHTML = Object.entries(report.monthlyStats)
    .map(([month, stats]) => {
      const maxCount = Math.max(...Object.values(report.monthlyStats).map(s => s.count))
      const intensity = maxCount > 0 ? stats.count / maxCount : 0
      const opacity = 0.2 + intensity * 0.8
      
      return `
        <div style="padding: 12px; border-radius: 8px; text-align: center; background: rgba(255, 160, 122, ${opacity});">
          <div style="font-size: 12px; font-weight: 500;">${MONTH_NAMES[month - 1]}</div>
          <div style="font-size: 20px; font-weight: bold; color: ${stats.count > 0 ? '#FFA07A' : '#ccc'};">${stats.count}</div>
          <div style="font-size: 11px; color: #999;">篇</div>
        </div>
      `
    }).join('')
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
          line-height: 1.6;
          color: #333;
          padding: 40px;
          max-width: 800px;
          margin: 0 auto;
        }
        h1 { font-size: 28px; text-align: center; margin-bottom: 8px; color: #1a1a1a; }
        .subtitle { text-align: center; color: #666; font-size: 14px; margin-bottom: 40px; }
        .section { margin-bottom: 32px; }
        .section-title { font-size: 18px; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 1px solid #e0e0e0; }
        .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 32px; }
        .stat-card { background: #5DADE2; color: white; padding: 24px; border-radius: 12px; text-align: center; }
        .stat-value { font-size: 36px; font-weight: bold; margin-bottom: 4px; }
        .stat-label { font-size: 14px; opacity: 0.9; }
        .monthly-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
        .highlight-section { background: #f9f9f9; padding: 24px; border-radius: 16px; }
        .highlight-item { margin-bottom: 12px; font-size: 14px; }
        .highlight-item strong { color: #FFA07A; }
        .footer { margin-top: 48px; padding-top: 24px; border-top: 1px solid #e0e0e0; text-align: center; color: #999; font-size: 12px; }
        @media print { body { padding: 20px; } }
      </style>
    </head>
    <body>
      <h1>${year}年慧记年度回顾</h1>
      <p class="subtitle">由慧记生成 · ${new Date().toLocaleDateString('zh-CN')}</p>
      
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${totalRecords}</div>
          <div class="stat-label">总记录数</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${writingDays}</div>
          <div class="stat-label">写作天数</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${report.maxStreak}</div>
          <div class="stat-label">最长连续</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${report.totalWords}</div>
          <div class="stat-label">总字数</div>
        </div>
      </div>
      
      <div class="section">
        <h2 class="section-title">情绪分布</h2>
        ${emotionDistributionHTML}
      </div>
      
      <div class="section">
        <h2 class="section-title">月度记录分布</h2>
        <div class="monthly-grid">
          ${monthlyDistributionHTML}
        </div>
      </div>
      
      <div class="section">
        <h2 class="section-title">${year}年高光时刻</h2>
        <div class="highlight-section">
          <p class="highlight-item">累计记录 <strong>${totalRecords}</strong> 条</p>
          <p class="highlight-item">累计书写 <strong>${report.totalWords}</strong> 字</p>
          <p class="highlight-item">记录覆盖 <strong>${writingDays}</strong> 天</p>
          <p class="highlight-item">最长连续记录 <strong>${report.maxStreak}</strong> 天</p>
          ${report.topMonth ? `<p class="highlight-item">记录最多的月份是 <strong>${MONTH_NAMES[report.topMonth.month - 1]}</strong> (${report.topMonth.count}条)</p>` : ''}
          ${report.topActivity ? `<p class="highlight-item">最常参与的活动是 <strong>${report.topActivity[0]}</strong> (${report.topActivity[1]}次)</p>` : ''}
        </div>
      </div>
      
      <div class="footer">
        <p>由慧记导出 · ${new Date().toLocaleDateString('zh-CN')}</p>
      </div>
    </body>
    </html>
  `
}

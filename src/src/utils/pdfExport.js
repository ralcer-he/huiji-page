import { EMOTIONS } from '../constants/emotions'
import { saveOrShareFile } from './fileHelper'
import { Capacitor } from '@capacitor/core'

// 生成带样式的 HTML 内容
function generateStyledHTML(title, content, styles = {}) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', Helvetica, Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          padding: 40px;
          max-width: 800px;
          margin: 0 auto;
        }
        h1 {
          font-size: 28px;
          color: #1a1a1a;
          margin-bottom: 8px;
          text-align: center;
        }
        .subtitle {
          text-align: center;
          color: #666;
          font-size: 14px;
          margin-bottom: 40px;
          padding-bottom: 20px;
          border-bottom: 2px solid #f0f0f0;
        }
        .section {
          margin-bottom: 32px;
        }
        .section-title {
          font-size: 18px;
          color: #1a1a1a;
          margin-bottom: 16px;
          padding-bottom: 8px;
          border-bottom: 1px solid #e0e0e0;
        }
        .record {
          background: #f9f9f9;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 16px;
        }
        .record-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        .record-date {
          font-size: 14px;
          color: #666;
        }
        .record-emotions {
          display: flex;
          gap: 8px;
        }
        .emotion-tag {
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          color: white;
        }
        .record-content {
          font-size: 15px;
          color: #333;
          line-height: 1.8;
        }
        .record-meta {
          margin-top: 12px;
          display: flex;
          gap: 16px;
          font-size: 12px;
          color: #999;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-bottom: 32px;
        }
        .stat-card {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 24px;
          border-radius: 16px;
          text-align: center;
        }
        .stat-card.green {
          background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
        }
        .stat-card.orange {
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        }
        .stat-value {
          font-size: 36px;
          font-weight: bold;
          margin-bottom: 4px;
        }
        .stat-label {
          font-size: 14px;
          opacity: 0.9;
        }
        .mood-distribution {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 16px;
        }
        .mood-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: #f5f5f5;
          border-radius: 24px;
          font-size: 14px;
        }
        .footer {
          margin-top: 48px;
          padding-top: 24px;
          border-top: 1px solid #e0e0e0;
          text-align: center;
          color: #999;
          font-size: 12px;
        }
        @media print {
          body { padding: 20px; }
          .record { break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      ${content}
    </body>
    </html>
  `
}

// 格式化日期
function formatDate(dateStr) {
  const date = new Date(dateStr)
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  const hour = date.getHours().toString().padStart(2, '0')
  const minute = date.getMinutes().toString().padStart(2, '0')
  return `${year}年${month}月${day}日 ${hour}:${minute}`
}

// 获取情绪颜色
function getEmotionColor(emotionName) {
  const emotion = EMOTIONS.find(e => e.name === emotionName)
  return emotion?.color || '#666'
}

// 生成单条记录的 HTML
function generateRecordHTML(record) {
  const emotions = record.emotions || []
  const emotionTags = emotions.map(e => {
    const color = getEmotionColor(e)
    return `<span class="emotion-tag" style="background-color: ${color}">${e}</span>`
  }).join('')
  
  const weather = record.weather ? record.weather : ''
  const location = record.location ? record.location : ''
  const activities = record.activities ? record.activities.join(' ') : ''
  const tags = record.tags ? record.tags.map(t => `#${t}`).join(' ') : ''
  
  const metaParts = [weather, location, activities, tags].filter(Boolean)
  const metaHTML = metaParts.length > 0 ? `<div class="record-meta">${metaParts.join(' · ')}</div>` : ''
  
  // 处理内容（可能是 HTML）
  let content = record.content || ''
  if (content.includes('<')) {
    // 去除 HTML 标签
    content = content.replace(/<[^>]+>/g, '').trim()
  }
  
  return `
    <div class="record">
      <div class="record-header">
        <span class="record-date">${formatDate(record.createdAt)}</span>
        ${emotions.length > 0 ? `<div class="record-emotions">${emotionTags}</div>` : ''}
      </div>
      <div class="record-content">${content || '(无内容)'}</div>
      ${metaHTML}
    </div>
  `
}

// 导出为 PDF（通过浏览器打印）
export async function exportToPDF(records, options = {}) {
  const {
    title = '慧记导出',
    dateRange = '',
    stats = null
  } = options

  // 计算统计数据
  const totalRecords = records.length
  const emotionCounts = {}
  records.forEach(r => {
    if (r.emotions) {
      r.emotions.forEach(e => {
        emotionCounts[e] = (emotionCounts[e] || 0) + 1
      })
    }
  })

  // 生成情绪分布
  const moodDistributionHTML = Object.entries(emotionCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([emotion, count]) => {
      const color = getEmotionColor(emotion)
      return `<div class="mood-item"><span style="color: ${color}">●</span> ${emotion} (${count}次)</div>`
    }).join('')

  // 生成记录列表
  const recordsHTML = records.map(r => generateRecordHTML(r)).join('')

  const content = `
    <h1>${title}</h1>
    <p class="subtitle">${dateRange} · 共 ${totalRecords} 条记录 · 慧记</p>
    
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">${totalRecords}</div>
        <div class="stat-label">总记录数</div>
      </div>
      <div class="stat-card green">
        <div class="stat-value">${Object.keys(emotionCounts).length}</div>
        <div class="stat-label">情绪种类</div>
      </div>
      <div class="stat-card orange">
        <div class="stat-value">${dateRange.includes('年') ? Math.round(totalRecords / 12) : Math.round(totalRecords / 30)}</div>
        <div class="stat-label">日均记录</div>
      </div>
    </div>

    <div class="section">
      <h2 class="section-title">情绪分布</h2>
      <div class="mood-distribution">${moodDistributionHTML || '<p>暂无数据</p>'}</div>
    </div>

    <div class="section">
      <h2 class="section-title">记录详情</h2>
      ${recordsHTML || '<p>暂无记录</p>'}
    </div>

    <div class="footer">
      <p>由慧记导出 · ${new Date().toLocaleDateString('zh-CN')}</p>
    </div>
  `

  const html = generateStyledHTML(title, content)
  
  // Capacitor WebView 中 window.print() 不可靠，降级为 HTML 文件分享
  if (Capacitor.isNativePlatform()) {
    await saveOrShareFile(html, `慧记导出_${new Date().toISOString().split('T')[0]}.html`, 'text/html', { title: '导出慧记记录' })
    return
  }
  
  // 创建 iframe 来渲染和打印
  const iframe = document.createElement('iframe')
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:none;'
  document.body.appendChild(iframe)
  
  const iframeDoc = iframe.contentDocument || iframe.contentWindow.document
  iframeDoc.open()
  iframeDoc.write(html)
  iframeDoc.close()
  
  // 等待内容渲染
  iframe.onload = () => {
    iframe.contentWindow.print()
    // 打印完成后移除 iframe
    setTimeout(() => {
      document.body.removeChild(iframe)
    }, 1000)
  }
}

// 导出为带样式的 HTML 文件
export async function exportToHTML(records, options = {}) {
  const {
    title = '慧记导出',
    dateRange = ''
  } = options

  const content = `
    <h1>${title}</h1>
    <p class="subtitle">${dateRange} · 共 ${records.length} 条记录</p>
    <div class="section">
      <h2 class="section-title">记录列表</h2>
      ${records.map(r => generateRecordHTML(r)).join('')}
    </div>
  `

  const html = generateStyledHTML(title, content)
  
  await saveOrShareFile(html, `慧记导出_${new Date().toISOString().split('T')[0]}.html`, 'text/html', { title: '导出慧记记录' })
}

export default { exportToPDF, exportToHTML }

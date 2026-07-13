import { getEmotionByName } from '../constants/emotions'
import { ICON_PATHS } from '../components/ui/Icon'
import { getSetting } from '../db/database'
import { DEFAULT_SHARE_CARD_CONFIG } from '../constants/defaults'

const CARD_SIZE = 1080
const PADDING = 80

function formatDate(dateStr) {
  const date = new Date(dateStr)
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return `${year}年${month}月${day}日 ${weekDays[date.getDay()]}`
}

function formatTime(dateStr) {
  const date = new Date(dateStr)
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
}

function loadSvgIcon(iconName, size = 48, color = '#333') {
  return new Promise((resolve) => {
    const pathData = ICON_PATHS[iconName]
    if (!pathData) { resolve(null); return }
    const svgPaths = pathData.split(' M').map((d, i) => `<path d="${i === 0 ? d : 'M' + d}" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`).join('')
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24">${svgPaths}</svg>`
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
  })
}

function wrapText(ctx, text, maxWidth) {
  const lines = []
  const paragraphs = text.split('\n')
  
  for (const para of paragraphs) {
    let line = ''
    for (let i = 0; i < para.length; i++) {
      const testLine = line + para[i]
      const metrics = ctx.measureText(testLine)
      if (metrics.width > maxWidth && line) {
        lines.push(line)
        line = para[i]
      } else {
        line = testLine
      }
    }
    if (line) {
      lines.push(line)
    }
    if (para === '') {
      lines.push('')
    }
  }
  
  return lines
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + width - radius, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
  ctx.lineTo(x + width, y + height - radius)
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  ctx.lineTo(x + radius, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
}

/**
 * 将富文本 HTML 转换为带格式提示的纯文本
 * 保留引用前缀、行内代码符号、分割线等视觉提示
 */
function htmlToFormattedText(html) {
  if (!html) return ''
  let text = html
  text = text.replace(/<hr[^>]*>/gi, '\n————————————\n')
  text = text.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (m, inner) => {
    return '\n' + inner.split('\n').map(l => l.trim() ? '│ ' + l : l).join('\n') + '\n'
  })
  text = text.replace(/<\/(p|div|h[1-6]|li|blockquote)>/gi, '\n')
  text = text.replace(/<br\s*\/?>/gi, '\n')
  text = text.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, '`$1`')
  text = text.replace(/<mark[^>]*>([\s\S]*?)<\/mark>/gi, '【$1】')
  text = text.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '\n# $1\n')
  text = text.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '\n## $1\n')
  text = text.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '• $1\n')
  text = text.replace(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi, '$2')
  text = text.replace(/<(em|i)[^>]*>([\s\S]*?)<\/\1>/gi, '$2')
  text = text.replace(/<s[^>]*>([\s\S]*?)<\/s>/gi, '$1')
  text = text.replace(/<u[^>]*>([\s\S]*?)<\/u>/gi, '$1')
  text = text.replace(/<a[^>]*>([\s\S]*?)<\/a>/gi, '$1')
  text = text.replace(/<img[^>]*>/gi, '')
  text = text.replace(/<[^>]*>/g, '')
  text = text.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  text = text.replace(/\n{3,}/g, '\n\n').trim()
  return text
}

function extractImages(html) {
  if (!html) return []
  const imgRegex = /<img[^>]+src="([^"]+)"[^>]*>/gi
  const images = []
  let match
  while ((match = imgRegex.exec(html)) !== null) {
    images.push(match[1])
  }
  return images
}

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

export async function generateShareCard(record) {
  const canvas = document.createElement('canvas')
  canvas.width = CARD_SIZE
  canvas.height = CARD_SIZE
  const ctx = canvas.getContext('2d')

  const savedConfig = await getSetting('shareCardConfig')
  const config = { ...DEFAULT_SHARE_CARD_CONFIG, ...savedConfig }

  const mainEmotion = record.emotions?.[0] ? getEmotionByName(record.emotions[0]) : null
  const accentColor = mainEmotion?.color || '#5DADE2'
  
  const bgGradient = ctx.createLinearGradient(0, 0, CARD_SIZE, CARD_SIZE)
  bgGradient.addColorStop(0, accentColor + '20')
  bgGradient.addColorStop(1, accentColor + '40')
  ctx.fillStyle = bgGradient
  ctx.fillRect(0, 0, CARD_SIZE, CARD_SIZE)

  // 装饰圆
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
  ctx.beginPath()
  ctx.arc(CARD_SIZE - 100, 150, 120, 0, Math.PI * 2)
  ctx.fill()
  
  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'
  ctx.beginPath()
  ctx.arc(120, CARD_SIZE - 100, 80, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'
  roundRect(ctx, PADDING, PADDING, CARD_SIZE - PADDING * 2, CARD_SIZE - PADDING * 2, 40)
  ctx.fill()

  // 顶部装饰条
  ctx.fillStyle = accentColor
  roundRect(ctx, PADDING + 60, PADDING + 50, 60, 6, 3)
  ctx.fill()

  ctx.fillStyle = accentColor
  ctx.font = 'bold 28px system-ui, -apple-system, sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText('慧记', PADDING + 60, PADDING + 100)

  if (config.showDate) {
    ctx.fillStyle = '#94A3B8'
    ctx.font = '22px system-ui, -apple-system, sans-serif'
    ctx.fillText(formatDate(record.createdAt), PADDING + 60, PADDING + 140)
  }

  if (record.title) {
    ctx.fillStyle = '#1E293B'
    ctx.font = 'bold 36px system-ui, -apple-system, sans-serif'
    ctx.textAlign = 'left'
    const titleLines = wrapText(ctx, record.title, contentWidth)
    titleLines.slice(0, 2).forEach((line, index) => {
      ctx.fillText(line, PADDING + 60, PADDING + 190 + index * 45)
    })
  }

  const typeLabels = { note: '随笔', mood: '心情', memo: '备忘', diary: '日记' }
  const typeLabel = typeLabels[record.type] || '记录'
  if (config.showCategory) {
    ctx.fillStyle = 'white'
    roundRect(ctx, CARD_SIZE - PADDING - 60 - 120, PADDING + 60, 120, 44, 22)
    ctx.fillStyle = accentColor
    ctx.fill()
    ctx.fillStyle = 'white'
    ctx.font = 'bold 22px system-ui, -apple-system, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(typeLabel, CARD_SIZE - PADDING - 60 - 60, PADDING + 90)
  }

  const contentWidth = CARD_SIZE - PADDING * 2 - 120
  const centerX = CARD_SIZE / 2

  if (record.type === 'mood' && record.emotions?.length > 0) {
    ctx.textAlign = 'center'
    const emotion = getEmotionByName(record.emotions[0])
    if (emotion) {
      // 计算垂直居中位置
      const footerY = CARD_SIZE - PADDING - 80
      const headerEnd = PADDING + 140
      const availableHeight = footerY - headerEnd
      const moodBubbleTop = headerEnd + availableHeight * 0.35

      // 绘制情绪背景
      ctx.fillStyle = emotion.color
      roundRect(ctx, centerX - 200, moodBubbleTop, 400, 120, 60)
      ctx.fill()
      
      // 加载并绘制 SVG 图标
      const iconImg = await loadSvgIcon(emotion.iconName, 64, '#333')
      if (iconImg) {
        ctx.drawImage(iconImg, centerX - 80, moodBubbleTop + 20, 64, 64)
      }
      
      // 绘制情绪名称
      ctx.font = 'bold 48px system-ui, -apple-system, sans-serif'
      ctx.fillStyle = '#333'
      ctx.fillText(emotion.name, centerX + 30, moodBubbleTop + 85)
      
      // 绘制内容 - 居中
      if (record.content) {
        ctx.fillStyle = '#1E293B'
        ctx.font = 'bold 40px system-ui, -apple-system, sans-serif'
        ctx.textBaseline = 'top'
        const content = htmlToFormattedText(record.content)
        const lines = wrapText(ctx, content, contentWidth - 80)
        const displayLines = lines.slice(0, 5)
        const lineHeight = 55
        let contentY = moodBubbleTop + 160
        displayLines.forEach((line, index) => {
          ctx.fillText(line, centerX, contentY + index * lineHeight)
        })
      }
    }
  } else if (record.type === 'memo') {
    ctx.textAlign = 'center'
    const content = htmlToFormattedText(record.content) || '暂无内容'
    
    const footerY = CARD_SIZE - PADDING - 80
    const headerEnd = PADDING + 140
    const availableHeight = footerY - headerEnd
    const memoCenterY = headerEnd + availableHeight * 0.45
    
    ctx.fillStyle = record.completed ? '#94A3B8' : '#1E293B'
    ctx.font = 'bold 56px system-ui, -apple-system, sans-serif'
    ctx.textBaseline = 'middle'
    ctx.fillText(content, centerX, memoCenterY)
    
    ctx.fillStyle = record.completed ? '#10B981' : '#94A3B8'
    ctx.font = 'bold 28px system-ui, -apple-system, sans-serif'
    ctx.fillText(record.completed ? '已完成' : '待完成', centerX, memoCenterY + 70)
  } else {
    ctx.textAlign = 'center'
    let content = htmlToFormattedText(record.content) || ''
    
    const footerY = CARD_SIZE - PADDING - 80
    const titleHeight = record.title ? 90 : 0
    const headerEnd = PADDING + 140 + titleHeight
    const availableHeight = footerY - headerEnd
    
    const images = record.content ? extractImages(record.content) : []
    const loadedImages = images.length > 0 ? await Promise.all(images.map(loadImage)) : []
    const validImages = loadedImages.filter(img => img !== null)
    
    let currentY = headerEnd
    
    if (validImages.length > 0) {
      const maxImageWidth = contentWidth - 80
      const maxImageHeight = availableHeight * 0.5
      
      validImages.slice(0, 3).forEach(img => {
        let drawWidth = img.width
        let drawHeight = img.height
        
        if (drawWidth > maxImageWidth) {
          const ratio = maxImageWidth / drawWidth
          drawWidth = maxImageWidth
          drawHeight = drawHeight * ratio
        }
        if (drawHeight > maxImageHeight) {
          const ratio = maxImageHeight / drawHeight
          drawHeight = maxImageHeight
          drawWidth = drawWidth * ratio
        }
        
        const imgX = centerX - drawWidth / 2
        const imgY = currentY + (maxImageHeight - drawHeight) / 2
        
        roundRect(ctx, imgX - 8, imgY - 8, drawWidth + 16, drawHeight + 16, 12)
        ctx.fillStyle = '#F1F5F9'
        ctx.fill()
        
        ctx.drawImage(img, imgX, imgY, drawWidth, drawHeight)
        
        currentY += maxImageHeight + 30
      })
    }
    
    if (content) {
      ctx.fillStyle = '#1E293B'
      ctx.font = 'bold 44px system-ui, -apple-system, sans-serif'
      ctx.textBaseline = 'top'
      
      const remainingHeight = footerY - currentY
      const lines = wrapText(ctx, content, contentWidth - 80)
      const lineHeight = 60
      const maxLines = Math.floor(remainingHeight / lineHeight)
      const displayLines = lines.slice(0, Math.max(maxLines, 2))
      const totalTextHeight = displayLines.length * lineHeight
      const startY = currentY + (remainingHeight - totalTextHeight) / 2
      
      displayLines.forEach((line, index) => {
        ctx.fillText(line, centerX, startY + index * lineHeight)
      })
      
      if (lines.length > displayLines.length) {
        ctx.fillStyle = '#64748B'
        ctx.fillText('...', centerX, startY + displayLines.length * lineHeight)
      }
    } else if (validImages.length === 0) {
      ctx.fillStyle = '#94A3B8'
      ctx.font = 'bold 44px system-ui, -apple-system, sans-serif'
      ctx.textBaseline = 'middle'
      ctx.fillText('暂无内容', centerX, headerEnd + availableHeight / 2)
    }
  }

  if (record.tags?.length > 0) {
    ctx.fillStyle = accentColor
    ctx.font = '24px system-ui, -apple-system, sans-serif'
    ctx.textAlign = 'left'
    const tagText = record.tags.map(t => `#${t}`).join('  ')
    ctx.fillText(tagText, PADDING + 60, contentY)
    contentY += 50
  }

  const footerY = CARD_SIZE - PADDING - 80
  
  if (config.showSlogan || config.showWatermark) {
    ctx.strokeStyle = accentColor + '30'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(PADDING + 60, footerY)
    ctx.lineTo(CARD_SIZE - PADDING - 60, footerY)
    ctx.stroke()
  }

  if (config.showSlogan) {
    ctx.fillStyle = '#94A3B8'
    ctx.font = '22px system-ui, -apple-system, sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText('记录生活，感知情绪', PADDING + 60, footerY + 50)
  }

  if (config.showWatermark) {
    ctx.fillStyle = accentColor
    ctx.font = 'bold 22px system-ui, -apple-system, sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText('慧记 · AI 情绪日记', CARD_SIZE - PADDING - 60, footerY + 50)
  }

  return canvas.toDataURL('image/png')
}

export async function generateDailySummaryCard(records, date) {
  const typeLabels = { note: '随笔', mood: '心情', memo: '备忘', diary: '日记' }
  const sortedRecords = [...records].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))

  const savedConfig = await getSetting('shareCardConfig')
  const config = { ...DEFAULT_SHARE_CARD_CONFIG, ...savedConfig }
  
  const headerHeight = 300
  const footerHeight = 150
  const recordCardHeight = 180
  const recordGap = 30
  const contentHeight = sortedRecords.length * (recordCardHeight + recordGap)
  const totalHeight = headerHeight + contentHeight + footerHeight + PADDING * 2

  const canvas = document.createElement('canvas')
  canvas.width = CARD_SIZE
  canvas.height = totalHeight
  const ctx = canvas.getContext('2d')

  const bgGradient = ctx.createLinearGradient(0, 0, CARD_SIZE, totalHeight)
  bgGradient.addColorStop(0, '#E8F4FD')
  bgGradient.addColorStop(1, '#D4E8F7')
  ctx.fillStyle = bgGradient
  ctx.fillRect(0, 0, CARD_SIZE, totalHeight)

  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
  roundRect(ctx, PADDING, PADDING, CARD_SIZE - PADDING * 2, totalHeight - PADDING * 2, 40)
  ctx.fill()

  ctx.fillStyle = '#5DADE2'
  ctx.font = 'bold 32px system-ui, -apple-system, sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText('慧记', PADDING + 60, PADDING + 70)

  ctx.fillStyle = '#1E293B'
  ctx.font = 'bold 48px system-ui, -apple-system, sans-serif'
  ctx.fillText('今日记录', PADDING + 60, PADDING + 150)

  if (config.showDate) {
    ctx.fillStyle = '#94A3B8'
    ctx.font = '24px system-ui, -apple-system, sans-serif'
    ctx.fillText(formatDate(date), PADDING + 60, PADDING + 200)
  }

  ctx.fillStyle = '#5DADE2'
  ctx.font = 'bold 28px system-ui, -apple-system, sans-serif'
  ctx.textAlign = 'right'
  ctx.fillText(`${sortedRecords.length} 条`, CARD_SIZE - PADDING - 60, PADDING + 160)

  let y = PADDING + headerHeight
  const contentWidth = CARD_SIZE - PADDING * 2 - 120

  sortedRecords.forEach((record, index) => {
    const cardY = y + index * (recordCardHeight + recordGap)
    
    ctx.fillStyle = '#F8FAFC'
    roundRect(ctx, PADDING + 60, cardY, contentWidth, recordCardHeight, 24)
    ctx.fill()

    const typeLabel = typeLabels[record.type] || '记录'
    if (config.showCategory) {
      ctx.fillStyle = '#5DADE2'
      ctx.font = 'bold 22px system-ui, -apple-system, sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText(typeLabel, PADDING + 90, cardY + 50)
    }

    ctx.fillStyle = '#94A3B8'
    ctx.font = '20px system-ui, -apple-system, sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText(formatTime(record.createdAt), CARD_SIZE - PADDING - 90, cardY + 50)

    let previewText = ''
    if (record.type === 'mood' && record.emotions?.length > 0) {
      const emotion = getEmotionByName(record.emotions[0])
      previewText = emotion ? emotion.name : '心情记录'
    } else {
      previewText = htmlToFormattedText(record.content)
    }

    ctx.fillStyle = '#475569'
    ctx.font = '26px system-ui, -apple-system, sans-serif'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    
    const lines = wrapText(ctx, previewText, contentWidth - 60)
    const displayLines = lines.slice(0, 3)
    displayLines.forEach((line, lineIndex) => {
      ctx.fillText(line, PADDING + 90, cardY + 80 + lineIndex * 40)
    })
    
    if (lines.length > 3) {
      ctx.fillStyle = '#94A3B8'
      ctx.fillText('...', PADDING + 90, cardY + 80 + 3 * 40)
    }
  })

  const footerY = totalHeight - PADDING - 100
  
  if (config.showSlogan || config.showWatermark) {
    ctx.strokeStyle = '#E2E8F0'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(PADDING + 60, footerY)
    ctx.lineTo(CARD_SIZE - PADDING - 60, footerY)
    ctx.stroke()
  }

  if (config.showSlogan) {
    ctx.fillStyle = '#94A3B8'
    ctx.font = '22px system-ui, -apple-system, sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText('记录生活，感知情绪', PADDING + 60, footerY + 50)
  }

  if (config.showWatermark) {
    ctx.fillStyle = '#5DADE2'
    ctx.font = 'bold 22px system-ui, -apple-system, sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText('慧记 · AI 情绪日记', CARD_SIZE - PADDING - 60, footerY + 50)
  }

  return canvas.toDataURL('image/png')
}

export default { generateShareCard, generateDailySummaryCard }

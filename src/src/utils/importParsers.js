import { matchEmotionsByKeywords } from './emotionKeywords'

function getTimestamp() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function extractTagsFromContent(text) {
  if (!text) return []
  const tagRegex = /#([\u4e00-\u9fa5\w]+)/g
  const matches = text.match(tagRegex)
  if (!matches) return []
  return [...new Set(matches.map(t => t.slice(1)))]
}

function generateTitle(content, maxLen = 50) {
  const plain = content.replace(/<[^>]*>/g, '').replace(/\n/g, ' ').trim()
  return plain.slice(0, maxLen)
}

function parseDateString(dateStr) {
  if (!dateStr) return null

  const cleaned = dateStr.trim()

  const cnMatch = cleaned.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/)
  if (cnMatch) {
    const [, y, m, d] = cnMatch
    return new Date(parseInt(y), parseInt(m) - 1, parseInt(d))
  }

  const dashMatch = cleaned.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
  if (dashMatch) {
    const [, y, m, d] = dashMatch
    return new Date(parseInt(y), parseInt(m) - 1, parseInt(d))
  }

  const dotMatch = cleaned.match(/(\d{4})\.(\d{1,2})\.(\d{1,2})/)
  if (dotMatch) {
    const [, y, m, d] = dotMatch
    return new Date(parseInt(y), parseInt(m) - 1, parseInt(d))
  }

  const timestamp = Date.parse(cleaned)
  if (!isNaN(timestamp)) {
    return new Date(timestamp)
  }

  return null
}

function formatDateISO(date) {
  if (!(date instanceof Date) || isNaN(date.getTime())) return null
  return date.toISOString()
}

function createDiaryRecord({ content, date, title, tags, emotions, weather, location }) {
  const recordDate = date || new Date()
  const recordContent = content || ''
  const recordTitle = title || generateTitle(recordContent)
  const recordTags = tags || extractTagsFromContent(recordContent)
  const recordEmotions = emotions || matchEmotionsByKeywords(recordContent)

  return {
    id: `import_diary_${getTimestamp()}`,
    type: 'diary',
    content: recordContent,
    title: recordTitle,
    tags: recordTags,
    emotions: recordEmotions,
    weather: weather || undefined,
    location: location || undefined,
    createdAt: formatDateISO(recordDate),
    updatedAt: formatDateISO(recordDate),
    _importSource: 'migrated',
    _aiEnhanced: false,
  }
}

export function detectFormat(fileName, content) {
  const ext = fileName.split('.').pop().toLowerCase()

  if (ext === 'json') {
    try {
      const data = JSON.parse(content)
      if (data.records && Array.isArray(data.records) && data.settings) {
        return 'huiji'
      }
      if (data.chatConversations || data.letters || data.userProfile) {
        return 'huiji'
      }
      return 'generic-json'
    } catch {
      return 'unknown'
    }
  }

  if (ext === 'md' || ext === 'markdown') {
    return 'markdown'
  }

  if (ext === 'txt') {
    return 'txt'
  }

  try {
    JSON.parse(content)
    return 'generic-json'
  } catch {}

  if (content.includes('---') && content.includes('date:')) {
    return 'markdown'
  }

  const datePattern = /\d{4}[-/年]\d{1,2}[-/月]\d{1,2}日?/
  if (datePattern.test(content)) {
    return 'txt'
  }

  return 'unknown'
}

export function parseHuijiJson(jsonStr) {
  try {
    const data = JSON.parse(jsonStr)
    if (!data.records || !Array.isArray(data.records)) {
      return { records: [], settings: [], error: '格式不正确：缺少 records 数组' }
    }
    return {
      records: data.records,
      settings: data.settings || [],
      chatConversations: data.chatConversations || [],
      chatMessages: data.chatMessages || [],
      userProfile: data.userProfile || [],
      memoryEvents: data.memoryEvents || [],
      xiaohuiDiary: data.xiaohuiDiary || [],
      letters: data.letters || [],
      isHuijiFormat: true,
      version: data.version || 1,
    }
  } catch (e) {
    return { records: [], settings: [], error: 'JSON 解析失败：' + e.message }
  }
}

export function parseTxt(text) {
  const records = []
  const lines = text.split(/\r?\n/)

  const dateRegex = /^(\d{4}[-/年]\d{1,2}[-/月]\d{1,2}日?)/
  const separatorRegex = /^[=\-]{3,}\s*$/

  let currentDate = null
  let currentContent = []

  const flushRecord = () => {
    if (currentDate && currentContent.length > 0) {
      const content = currentContent.join('\n').trim()
      if (content) {
        records.push(createDiaryRecord({
          content,
          date: currentDate,
        }))
      }
    }
    currentContent = []
  }

  for (const line of lines) {
    if (separatorRegex.test(line.trim())) {
      flushRecord()
      continue
    }

    const dateMatch = line.trim().match(dateRegex)
    if (dateMatch) {
      flushRecord()
      const parsedDate = parseDateString(dateMatch[1])
      if (parsedDate) {
        currentDate = parsedDate
      }
      const rest = line.slice(dateMatch[0].length).trim()
      if (rest) {
        currentContent.push(rest)
      }
      continue
    }

    if (currentDate) {
      currentContent.push(line)
    }
  }

  flushRecord()

  return {
    records,
    format: 'txt',
    count: records.length,
  }
}

function parseYamlFrontmatter(text) {
  const match = text.match(/^---\s*\n([\s\S]*?)\n---/)
  if (!match) return { data: {}, content: text }

  const yamlStr = match[1]
  const content = text.slice(match[0].length).trim()
  const data = {}

  const lines = yamlStr.split(/\r?\n/)
  for (const line of lines) {
    const colonIndex = line.indexOf(':')
    if (colonIndex === -1) continue

    const key = line.slice(0, colonIndex).trim()
    let value = line.slice(colonIndex + 1).trim()

    if (value.startsWith('[') && value.endsWith(']')) {
      value = value.slice(1, -1).split(',').map(s => s.trim().replace(/^['"]|['"]$/g, ''))
    } else {
      value = value.replace(/^['"]|['"]$/g, '')
    }

    data[key] = value
  }

  return { data, content }
}

export function parseMarkdown(text) {
  const records = []
  const { data: frontmatter, content: mainContent } = parseYamlFrontmatter(text)

  const hasFrontmatterDate = frontmatter.date || frontmatter.Date || frontmatter.日期

  if (hasFrontmatterDate) {
    const date = parseDateString(String(hasFrontmatterDate))
    const mood = frontmatter.mood || frontmatter.emotion || frontmatter.feeling || frontmatter.心情
    const tags = frontmatter.tags || frontmatter.labels || frontmatter.标签 || []
    const weather = frontmatter.weather || frontmatter.天气
    const location = frontmatter.location || frontmatter.地点

    let title = ''
    let body = mainContent

    const titleMatch = mainContent.match(/^#\s+(.+)$/m)
    if (titleMatch) {
      title = titleMatch[1].trim()
      body = mainContent.slice(titleMatch.index + titleMatch[0].length).trim()
    }

    const emotions = mood ? [String(mood)] : []

    records.push(createDiaryRecord({
      content: body,
      date,
      title,
      tags: Array.isArray(tags) ? tags : [tags],
      emotions,
      weather,
      location,
    }))
  } else {
    const headingDateRegex = /^#\s+(\d{4}[-/年]\d{1,2}[-/月]\d{1,2}日?)/gm
    const sections = []
    let match
    let lastIndex = 0

    while ((match = headingDateRegex.exec(text)) !== null) {
      if (sections.length > 0) {
        sections[sections.length - 1].end = match.index
      }
      sections.push({
        dateStr: match[1],
        start: match.index,
        end: text.length,
      })
      lastIndex = match.index
    }

    if (sections.length === 0) {
      const firstLine = text.split('\n')[0].trim()
      const dateMatch = firstLine.match(/^#?\s*(\d{4}[-/年]\d{1,2}[-/月]\d{1,2}日?)/)
      if (dateMatch) {
        const date = parseDateString(dateMatch[1])
        const content = text.replace(/^#?\s*.+\n/, '').trim()
        records.push(createDiaryRecord({ content, date }))
      } else {
        records.push(createDiaryRecord({ content: text }))
      }
    } else {
      for (const section of sections) {
        const date = parseDateString(section.dateStr)
        const sectionText = text.slice(section.start, section.end)
        const content = sectionText.replace(/^#\s+.+\n/, '').trim()
        if (content || date) {
          records.push(createDiaryRecord({ content, date }))
        }
      }
    }
  }

  return {
    records,
    format: 'markdown',
    count: records.length,
  }
}

function findField(obj, candidates) {
  for (const key of candidates) {
    if (obj[key] !== undefined && obj[key] !== null) {
      return obj[key]
    }
    const lowerKey = key.toLowerCase()
    for (const k of Object.keys(obj)) {
      if (k.toLowerCase() === lowerKey) {
        return obj[k]
      }
    }
  }
  return undefined
}

function extractArrayFromJson(data) {
  if (Array.isArray(data)) return data

  const listFields = [
    'records', 'entries', 'diaryList', 'diaries', 'items', 'list',
    'data', 'results', 'diary', 'notes', 'posts', 'articles',
  ]

  for (const field of listFields) {
    if (data[field] && Array.isArray(data[field])) {
      return data[field]
    }
  }

  for (const key of Object.keys(data)) {
    if (Array.isArray(data[key]) && data[key].length > 0) {
      const firstItem = data[key][0]
      if (typeof firstItem === 'object' && firstItem !== null) {
        const hasDate = findField(firstItem, ['date', 'createdAt', 'time', 'creationDate', 'createTime', '日期'])
        const hasContent = findField(firstItem, ['content', 'text', 'body', 'diary', 'content_text', '内容'])
        if (hasDate !== undefined || hasContent !== undefined) {
          return data[key]
        }
      }
    }
  }

  return null
}

export function parseGenericJson(jsonStr) {
  try {
    const data = JSON.parse(jsonStr)
    const records = []

    const items = extractArrayFromJson(data)
    if (!items || !Array.isArray(items)) {
      return { records: [], format: 'generic-json', count: 0, error: '未找到日记数据数组' }
    }

    for (const item of items) {
      if (typeof item !== 'object' || item === null) continue

      const dateValue = findField(item, [
        'date', 'createdAt', 'createTime', 'time', 'creationDate',
        'created_at', 'created', 'datetime', 'timestamp', '日期', '创建时间',
      ])
      const date = parseDateString(String(dateValue || '')) || new Date()

      const content = findField(item, [
        'content', 'text', 'body', 'diary', 'content_text', 'note',
        'description', 'details', '内容', '正文',
      ]) || ''

      if (!content && !dateValue) continue

      const title = findField(item, [
        'title', 'subject', 'headline', '标题',
      ]) || ''

      const moodValue = findField(item, [
        'mood', 'emotion', 'feeling', '心情', '情绪',
      ])
      let emotions = []
      if (moodValue) {
        if (Array.isArray(moodValue)) {
          emotions = moodValue.map(String)
        } else {
          emotions = [String(moodValue)]
        }
      }

      const tagsValue = findField(item, [
        'tags', 'labels', 'categories', 'category', '标签', '分类',
      ])
      let tags = []
      if (tagsValue) {
        if (Array.isArray(tagsValue)) {
          tags = tagsValue.map(String)
        } else if (typeof tagsValue === 'string') {
          tags = tagsValue.split(/[,，、]/).map(s => s.trim()).filter(Boolean)
        }
      }

      const weather = findField(item, ['weather', '天气'])
      const location = findField(item, ['location', 'place', 'address', '地点', '位置'])

      records.push(createDiaryRecord({
        content: String(content),
        date,
        title: String(title || ''),
        tags,
        emotions,
        weather: weather ? String(weather) : undefined,
        location: location ? String(location) : undefined,
      }))
    }

    return {
      records,
      format: 'generic-json',
      count: records.length,
    }
  } catch (e) {
    return { records: [], format: 'generic-json', count: 0, error: 'JSON 解析失败：' + e.message }
  }
}

export async function parseImportFile(file) {
  const fileName = file.name
  const text = await file.text()

  const format = detectFormat(fileName, text)

  if (format === 'huiji') {
    const result = parseHuijiJson(text)
    return {
      format: 'huiji',
      records: result.records,
      settings: result.settings,
      chatConversations: result.chatConversations,
      chatMessages: result.chatMessages,
      userProfile: result.userProfile,
      memoryEvents: result.memoryEvents,
      xiaohuiDiary: result.xiaohuiDiary,
      letters: result.letters,
      isHuijiFormat: true,
      version: result.version,
      error: result.error,
    }
  }

  if (format === 'txt') {
    const result = parseTxt(text)
    return {
      format: 'txt',
      records: result.records,
      count: result.count,
    }
  }

  if (format === 'markdown') {
    const result = parseMarkdown(text)
    return {
      format: 'markdown',
      records: result.records,
      count: result.count,
    }
  }

  if (format === 'generic-json') {
    const result = parseGenericJson(text)
    return {
      format: 'generic-json',
      records: result.records,
      count: result.count,
      error: result.error,
    }
  }

  return {
    format: 'unknown',
    records: [],
    error: '不支持的文件格式',
  }
}

export async function enhanceWithAI(records, onProgress) {
  if (!records || records.length === 0) return records

  let analyzeEmotions
  try {
    const module = await import('./aiHelper.js')
    analyzeEmotions = module.analyzeEmotions
  } catch {
    console.warn('AI模块加载失败，使用本地关键词匹配')
    return records.map(r => ({
      ...r,
      _aiEnhanced: false,
    }))
  }

  const batchSize = 5
  const enhanced = []

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize)

    const batchPromises = batch.map(async (record) => {
      if (record._aiEnhanced) return record

      const content = record.content || ''
      if (content.length < 10) {
        return { ...record, _aiEnhanced: false }
      }

      try {
        const plainText = content.replace(/<[^>]*>/g, '').trim()
        const result = await analyzeEmotions(plainText)

        if (result && result.emotions && result.emotions.length > 0) {
          return {
            ...record,
            emotions: result.emotions.map(e => e.name),
            _aiEnhanced: result.source === 'ai',
          }
        }
      } catch (e) {
        console.warn('AI增强失败:', e)
      }

      return { ...record, _aiEnhanced: false }
    })

    const batchResults = await Promise.all(batchPromises)
    enhanced.push(...batchResults)

    if (onProgress) {
      onProgress(Math.min(i + batchSize, records.length), records.length)
    }
  }

  return enhanced
}

export function getAIAvailable() {
  return true
}

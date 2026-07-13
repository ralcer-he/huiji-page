import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { getAllRecords, deleteRecord, searchRecords } from '../db/database'
import { EMOTIONS } from '../constants/emotions'
import { RECORD_TYPE_MAP } from '../constants/types'
import { PRESET_TAGS, getTagColor } from '../constants/tags'
import { calculateStreak, groupRecordsByDate, stripHtml } from '../utils/recordHelpers'
import MemoryOnThisDay from '../components/MemoryOnThisDay'
import EmptyState from '../components/ui/EmptyState'
import Icon from '../components/ui/Icon'
import IconButton from '../components/ui/IconButton'
import { generateShareCard, generateDailySummaryCard } from '../utils/shareCard'
import { saveOrShareDataUrl } from '../utils/fileHelper'

// 关键词高亮函数
function HighlightedText({ text, highlight }) {
  if (!highlight || !highlight.trim()) {
    return <>{text}</>
  }
  
  const parts = text.split(new RegExp(`(${escapeRegExp(highlight)})`, 'gi'))
  
  return (
    <>
      {parts.map((part, i) => 
        part.toLowerCase() === highlight.toLowerCase() 
          ? <mark key={i} className="px-0.5 rounded" style={{ backgroundColor: 'rgba(251, 191, 36, 0.4)', color: 'inherit' }}>{part}</mark>
          : part
      )}
    </>
  )
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const FILTER_TABS = [
  { value: 'all', label: '全部' },
  { value: 'note', label: '随笔' },
  { value: 'mood', label: '心情' },
  { value: 'memo', label: '备忘' },
  { value: 'diary', label: '日记' },
]

const TYPE_COLORS = {
  memo: '#10B981',
  diary: '#8B5CF6',
  note: '#5DADE2',
  mood: '#F59E0B',
}

function TimelinePage() {
  const [records, setRecords] = useState([])
  const [activeFilter, setActiveFilter] = useState('all')
  const [timeRange, setTimeRange] = useState('all') // 'all' | 'today' | 'month'
  const [showTimeRangeDropdown, setShowTimeRangeDropdown] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selectedRecord, setSelectedRecord] = useState(null)
  const [showSearch, setShowSearch] = useState(false)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [searchEmotion, setSearchEmotion] = useState('')
  const [searchTag, setSearchTag] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState(null)
  const [dailyShareImage, setDailyShareImage] = useState(null)
  const [showDailyShareModal, setShowDailyShareModal] = useState(false)
  const [generatingDaily, setGeneratingDaily] = useState(false)
  const [dailyShareDate, setDailyShareDate] = useState('')

  const [showMemoryOnThisDay, setShowMemoryOnThisDay] = useState(false)
  const [showTimelineShareModal, setShowTimelineShareModal] = useState(false)
  const [timelineShareImage, setTimelineShareImage] = useState(null)
  const [generatingTimelineShare, setGeneratingTimelineShare] = useState(false)
  const [viewMode, setViewMode] = useState(() => {
    const saved = localStorage.getItem('huiji_timeline_view_mode')
    return saved || 'list'
  })

  useEffect(() => {
    loadRecords()
  }, [])

  useEffect(() => {
    localStorage.setItem('huiji_timeline_view_mode', viewMode)
  }, [viewMode])

  const loadRecords = async () => {
    setLoading(true)
    try {
      const allRecords = await getAllRecords()
      setRecords(allRecords)
      setSearchResults(null)
    } catch (error) {
      console.error('加载记录失败:', error)
    }
    setLoading(false)
  }

  const handleSearch = async () => {
    if (!searchKeyword.trim() && !searchEmotion) {
      setSearchResults(null)
      return
    }
    
    setSearching(true)
    try {
      const results = await searchRecords(searchKeyword, searchEmotion)
      setSearchResults(results)
    } catch (error) {
      console.error('搜索失败:', error)
    }
    setSearching(false)
  }

  const clearSearch = () => {
    setSearchKeyword('')
    setSearchEmotion('')
    setSearchResults(null)
    setShowSearch(false)
  }

  const handleDailyShare = async (dayRecords, dateStr) => {
    setGeneratingDaily(true)
    setDailyShareDate(dateStr)
    try {
      const imageData = await generateDailySummaryCard(dayRecords, dayRecords[0]?.createdAt || new Date())
      setDailyShareImage(imageData)
      setShowDailyShareModal(true)
    } catch (error) {
      console.error('生成每日分享图失败:', error)
    }
    setGeneratingDaily(false)
  }

  const handleTimelineShare = async () => {
    setGeneratingTimelineShare(true)
    try {
      const recentRecords = [...records].slice(0, 10)
      const imageData = await generateDailySummaryCard(recentRecords, new Date())
      setTimelineShareImage(imageData)
      setShowTimelineShareModal(true)
    } catch (error) {
      console.error('生成回忆分享图失败:', error)
      alert('生成分享图失败，请重试')
    }
    setGeneratingTimelineShare(false)
  }

  const handleDownloadDaily = () => {
    if (!dailyShareImage) return
    const datePart = dailyShareDate.replace(/年|月|日/g, '').replace(/\s+/g, '')
    const link = document.createElement('a')
    link.download = `慧记_${datePart}_合集.png`
    link.href = dailyShareImage
    link.click()
  }

  const allTags = useMemo(() => {
    const tagMap = {}
    records.forEach(r => {
      if (r.tags && r.tags.length > 0) {
        r.tags.forEach(tag => {
          tagMap[tag] = (tagMap[tag] || 0) + 1
        })
      }
    })
    return Object.entries(tagMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count }))
  }, [records])

  // 时间范围筛选（每次渲染都重新计算）
  const filteredRecords = (() => {
    const now = new Date()
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    const curYM = todayStr.slice(0, 7)

    let filtered = searchResults 
      ? (activeFilter === 'all' ? searchResults : searchResults.filter(r => r.type === activeFilter))
      : (activeFilter === 'all' ? records : records.filter(r => r.type === activeFilter))
    
    if (timeRange !== 'all') {
      filtered = filtered.filter(r => {
        if (!r.createdAt) return false
        const d = new Date(r.createdAt)
        const localDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        if (timeRange === 'today') return localDateStr === todayStr
        if (timeRange === 'month') return localDateStr.startsWith(curYM)
        return true
      })
    }

    if (searchEmotion) {
      filtered = filtered.filter(r => 
        r.emotions && r.emotions.includes(searchEmotion)
      )
    }
    
    if (searchTag) {
      filtered = filtered.filter(r => 
        r.tags && r.tags.includes(searchTag)
      )
    }
    
    return filtered
  })()

  const groupedByDate = groupRecordsByDate(filteredRecords)

  const stats = {
    total: records.length,
    thisMonth: records.filter(r => {
      const now = new Date()
      const d = new Date(r.createdAt)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    }).length,
    streak: calculateStreak(records),
  }

  return (
    <div className="w-full py-6 animate-fade-in max-w-[1000px] mx-auto">
      {/* 顶部工具栏 */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setShowTimeRangeDropdown(!showTimeRangeDropdown)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium transition-colors duration-200"
              style={{
                backgroundColor: timeRange !== 'all' ? 'var(--accent-light)' : 'transparent',
                color: timeRange !== 'all' ? 'var(--accent)' : 'var(--ink)',
              }}
            >
              <Icon name="calendar" size={14} color="currentColor" strokeWidth={1.5} />
              <span>{timeRange === 'all' ? '全部' : timeRange === 'today' ? '今天' : '本月'}</span>
              <Icon name={showTimeRangeDropdown ? "chevron-up" : "chevron-down"} size={12} color="currentColor" strokeWidth={1.5} />
            </button>
            {/* 下拉菜单 */}
            {showTimeRangeDropdown && (
              <div 
                className="absolute top-full left-0 mt-2 w-32 py-1 rounded-xl shadow-lg z-50 animate-fade-in"
                style={{
                  backgroundColor: 'var(--bg)',
                  border: '1px solid var(--rule)',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                }}
              >
                {[
                  { value: 'all', label: '全部', icon: 'calendar' },
                  { value: 'today', label: '今天', icon: 'clock' },
                  { value: 'month', label: '本月', icon: 'calendar' },
                ].map(option => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setTimeRange(option.value)
                      setShowTimeRangeDropdown(false)
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-[13px] transition-colors duration-150"
                    style={{
                      backgroundColor: timeRange === option.value ? 'var(--accent-light)' : 'transparent',
                      color: timeRange === option.value ? 'var(--accent)' : 'var(--ink)',
                    }}
                  >
                    <Icon name={option.icon} size={14} color="currentColor" strokeWidth={1.5} />
                    <span>{option.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => setShowMemoryOnThisDay(!showMemoryOnThisDay)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium transition-colors duration-200"
            style={{
              backgroundColor: showMemoryOnThisDay ? 'var(--accent-light)' : 'transparent',
              color: showMemoryOnThisDay ? 'var(--accent)' : 'var(--ink)',
            }}
          >
            <Icon name="clock" size={14} color="currentColor" strokeWidth={1.5} />
            <span>往年今日</span>
          </button>
        </div>
        <button
          onClick={() => setShowSearch(!showSearch)}
          className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200"
          style={{
            backgroundColor: 'transparent',
            border: '1px solid var(--rule)',
          }}
        >
          <Icon name="search" size={16} color={showSearch ? 'var(--accent)' : 'var(--ink)'} strokeWidth={1.5} />
        </button>
      </div>

      {/* 搜索栏 */}
      {showSearch && (
        <div 
          className="mb-6 px-4 py-3 rounded-xl animate-slide-down"
          style={{
            border: '1px solid var(--rule)',
          }}
        >
          {/* 关键词搜索 */}
          <div className="flex items-center gap-3 mb-4">
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="搜索关键词..."
              className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none"
              style={{
                backgroundColor: 'var(--bg)',
                color: 'var(--ink)',
                border: '1px solid var(--rule)',
              }}
            />
            <button
              onClick={handleSearch}
              disabled={searching}
              className="w-10 h-10 flex items-center justify-center flex-shrink-0 transition-all duration-200 disabled:opacity-50"
              style={{
                backgroundColor: 'transparent',
              }}
            >
              <Icon name="search" size={16} color="var(--accent)" strokeWidth={1.5} />
            </button>
          </div>

          {/* 情绪筛选 */}
          <div className="flex items-center gap-2.5 mb-4">
            <span className="text-xs flex-shrink-0" style={{ color: 'var(--muted)' }}>情绪</span>
            <div className="flex flex-wrap gap-2">
              {EMOTIONS.slice(0, 6).map(emotion => {
                const selected = searchEmotion === emotion.name
                return (
                  <button
                    key={emotion.name}
                    onClick={() => setSearchEmotion(selected ? '' : emotion.name)}
                    className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200"
                    style={{
                      backgroundColor: selected ? emotion.color + '30' : 'var(--bg)',
                      border: selected ? `2px solid ${emotion.color}` : '1px solid var(--rule)',
                    }}
                  >
                    <Icon name={emotion.iconName} size={16} color={selected ? emotion.color : 'var(--ink)'} strokeWidth={1.5} />
                  </button>
                )
              })}
            </div>
          </div>

          {/* 标签筛选 */}
          {allTags.length > 0 && (
            <div className="flex items-start gap-2.5">
              <span className="text-xs flex-shrink-0 pt-1" style={{ color: 'var(--muted)' }}>标签</span>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSearchTag('')}
                  className="px-2.5 py-1 rounded-full text-xs transition-all duration-200"
                  style={{
                    backgroundColor: !searchTag ? 'var(--accent)' : 'var(--bg)',
                    color: !searchTag ? 'white' : 'var(--muted)',
                  }}
                >
                  全部
                </button>
                {allTags.map(({ tag, count }) => {
                  const color = getTagColor(tag)
                  const iconName = (PRESET_TAGS.find(t => t.name === tag))?.iconName || 'tag'
                  const selected = searchTag === tag
                  return (
                    <button
                      key={tag}
                      onClick={() => setSearchTag(selected ? '' : tag)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs transition-all duration-200"
                      style={{
                        backgroundColor: selected ? color : color + '15',
                        color: selected ? 'white' : color,
                        border: selected ? `1px solid ${color}` : `1px solid ${color}30`,
                      }}
                    >
                      <Icon name={iconName} size={12} color={color} strokeWidth={1.5} />
                      <span>#{tag}</span>
                      <span className="opacity-70 ml-0.5">{count}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* 搜索结果提示 */}
          {(searchResults || searchTag) && (
            <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid var(--rule)' }}>
              <span className="text-xs" style={{ color: 'var(--muted)' }}>
                {searchTag 
                  ? `#${searchTag}: ${filteredRecords.length} 条`
                  : `找到 ${filteredRecords.length} 条结果`
                }
              </span>
              <button
                onClick={() => {
                  clearSearch()
                  setSearchTag('')
                }}
                className="text-xs transition-all duration-200 hover:opacity-70"
                style={{ color: 'var(--accent)' }}
              >
                清除筛选
              </button>
            </div>
          )}
        </div>
      )}

      {/* 往年今日回忆 */}
      {showMemoryOnThisDay && (
        <div className="mb-6">
          <MemoryOnThisDay />
        </div>
      )}

      {/* 回忆内容区 */}
      <div className="relative">

        {/* 统计卡片 - 等宽横向排列 */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="huiji-card p-4 text-center">
            <div className="text-2xl font-semibold mb-1" style={{ color: 'var(--accent)' }}>
              {stats.total}
            </div>
            <div className="huiji-caption-secondary">总记录</div>
          </div>
          <div className="huiji-card p-4 text-center">
            <div className="text-2xl font-semibold mb-1" style={{ color: 'var(--accent)' }}>
              {stats.thisMonth}
            </div>
            <div className="huiji-caption-secondary">本月</div>
          </div>
          <div className="huiji-card p-4 text-center">
            <div className="text-2xl font-semibold mb-1" style={{ color: 'var(--accent)' }}>
              {stats.streak}
            </div>
            <div className="huiji-caption-secondary">连续天数</div>
          </div>
        </div>

        {/* 筛选栏 */}
        <div className="flex items-center justify-between mb-4 gap-2">
          <div className="flex overflow-x-auto scrollbar-hide flex-shrink min-w-0">
            {FILTER_TABS.map(tab => (
              <button
                key={tab.value}
                onClick={() => setActiveFilter(tab.value)}
                className={`huiji-tab-underline text-[14px] flex-shrink-0${activeFilter === tab.value ? ' active' : ''}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* 视图切换 */}
            <div className="flex items-center gap-0.5 p-0.5 rounded-[6px]" style={{ backgroundColor: 'var(--bg2)' }}>
              <button
                onClick={() => setViewMode('list')}
                className="p-1.5 rounded-[4px] transition-all duration-200"
                style={{
                  backgroundColor: viewMode === 'list' ? 'var(--bg)' : 'transparent',
                }}
                title="列表视图"
              >
                <Icon name="list" size={15} color={viewMode === 'list' ? 'var(--accent)' : 'var(--muted)'} strokeWidth={1.5} />
              </button>
              <button
                onClick={() => setViewMode('waterfall')}
                className="p-1.5 rounded-[4px] transition-all duration-200"
                style={{
                  backgroundColor: viewMode === 'waterfall' ? 'var(--bg)' : 'transparent',
                }}
                title="瀑布流视图"
              >
                <Icon name="grid" size={15} color={viewMode === 'waterfall' ? 'var(--accent)' : 'var(--muted)'} strokeWidth={1.5} />
              </button>
            </div>
            <span className="text-[13px] hidden sm:inline" style={{ color: 'var(--muted)' }}>
              共 {filteredRecords.length} 条
            </span>
            <button
              onClick={handleTimelineShare}
              disabled={generatingTimelineShare}
              className="p-1.5 rounded-[6px] transition-colors duration-200 hover:bg-[var(--bg2)] disabled:opacity-50"
              style={{ color: 'var(--muted)' }}
              title="分享回忆"
            >
              <Icon name="share" size={16} color="var(--muted)" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* 回忆记录列表 */}
        {loading ? (
          <div className="py-16 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-sm" style={{ color: 'var(--muted)' }}>加载中...</p>
          </div>
        ) : filteredRecords.length === 0 ? (
          <EmptyState iconName="note" title="暂无记录" hint="去编写页面记录" />
        ) : viewMode === 'waterfall' ? (
          /* 瀑布流视图 - 类似小红书，两列瀑布流 */
          <div className="grid grid-cols-2 gap-4">
            {filteredRecords.map(record => (
              <div key={record.id}>
                <WaterfallCard
                  record={record}
                  onClick={() => setSelectedRecord(record)}
                  highlight={searchResults ? searchKeyword : ''}
                  onTagClick={(tag) => {
                    setSearchTag(tag)
                    setShowSearch(true)
                  }}
                />
              </div>
            ))}
          </div>
        ) : (
          /* 列表视图 - 默认，时间线风格 */
          <div className="relative">
            {/* 左侧时间线 */}
            <div className="absolute left-[32px] top-0 bottom-0 w-px" style={{ backgroundColor: 'var(--accent-light)' }} />
            
            {Object.entries(groupedByDate).map(([dateStr, dayRecords]) => {
              const date = new Date(dateStr)
              const day = date.getDate()
              const month = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'][date.getMonth()]
              
              return dayRecords.map((record, index) => {
                const config = RECORD_TYPE_MAP[record.type] || RECORD_TYPE_MAP.note
                const emotion = record.type === 'mood' ? record.emotions?.[0] : null
                const emotionConfig = emotion ? EMOTIONS.find(e => e.name === emotion) : null
                
                return (
                  <div key={record.id} className="flex gap-4 mb-4">
                    {/* 左侧时间线节点 */}
                    <div className="flex-shrink-0 w-16 flex flex-col items-center relative">
                      {index === 0 && (
                        <>
                          <span className="text-2xl font-bold" style={{ color: 'var(--ink-strong)' }}>{day}</span>
                          <span className="text-xs" style={{ color: 'var(--muted)' }}>{month}</span>
                        </>
                      )}
                      <div
                        className="w-4 h-4 rounded-full mt-2 flex items-center justify-center"
                        style={{
                          backgroundColor: 'var(--accent-light)',
                          border: '2px solid var(--accent-light)',
                        }}
                      >
                        <Icon 
                          name={emotionConfig?.iconName || config.iconName} 
                          size={12} 
                          color="var(--accent)" 
                          strokeWidth={2} 
                        />
                      </div>
                    </div>
                    
                    {/* 右侧卡片 */}
                    <div className="flex-1 min-w-0">
                      <RecordCard
                        record={record}
                        onClick={() => setSelectedRecord(record)}
                        highlight={searchResults ? searchKeyword : ''}
                        onTagClick={(tag) => {
                          setSearchTag(tag)
                          setShowSearch(true)
                        }}
                      />
                    </div>
                  </div>
                )
              })
            })}
          </div>
        )}
      </div>

      {/* 详情弹窗 */}
      {selectedRecord && typeof document !== 'undefined' && createPortal(
        <RecordDetailModal 
          record={selectedRecord} 
          onClose={() => setSelectedRecord(null)}
          onDelete={async () => {
            await deleteRecord(selectedRecord.id)
            setSelectedRecord(null)
            loadRecords()
          }}
        />,
        document.body
      )}

      {/* 每日分享弹窗 */}
      {showDailyShareModal && dailyShareImage && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center animate-fade-in"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          onClick={(e) => e.target === e.currentTarget && setShowDailyShareModal(false)}
        >
          <div className="flex flex-col items-center gap-4 p-6 animate-scale-in max-h-[95vh]">
            <div className="overflow-y-auto max-h-[80vh]">
              <img 
                src={dailyShareImage} 
                alt="每日合集" 
                className="w-[85vw] max-w-lg rounded-2xl shadow-2xl"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleDownloadDaily}
                className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200"
                style={{
                  backgroundColor: 'var(--accent)',
                  color: 'white',
                }}
              >
                <Icon name="save" size={20} color="white" strokeWidth={1.5} />
              </button>
              <button
                onClick={() => setShowDailyShareModal(false)}
                className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  color: 'white',
                }}
              >
                <Icon name="close" size={20} color="white" strokeWidth={1.5} />
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 回忆分享弹窗 */}
      {showTimelineShareModal && timelineShareImage && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center animate-fade-in"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          onClick={(e) => e.target === e.currentTarget && setShowTimelineShareModal(false)}
        >
          <div className="flex flex-col items-center gap-4 p-6 animate-scale-in max-h-[95vh]">
            <div className="overflow-y-auto max-h-[80vh]">
              <img 
                src={timelineShareImage} 
                alt="回忆分享"
                className="w-[85vw] max-w-lg rounded-2xl shadow-2xl"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  if (!timelineShareImage) return
                  const link = document.createElement('a')
                  link.download = `慧记_回忆_${new Date().toISOString().split('T')[0]}.png`
                  link.href = timelineShareImage
                  link.click()
                }}
                className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200"
                style={{
                  backgroundColor: 'var(--accent)',
                  color: 'white',
                }}
              >
                <Icon name="save" size={20} color="white" strokeWidth={1.5} />
              </button>
              <button
                onClick={() => setShowTimelineShareModal(false)}
                className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  color: 'white',
                }}
              >
                <Icon name="close" size={20} color="white" strokeWidth={1.5} />
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

function RecordCard({ record, onClick, highlight, onTagClick }) {
  const config = RECORD_TYPE_MAP[record.type] || RECORD_TYPE_MAP.note
  const time = new Date(record.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })

  const renderContent = () => {
    switch (record.type) {
      case 'mood':
        return <MoodCardContent record={record} highlight={highlight} />
      case 'memo':
        return <MemoCardContent record={record} highlight={highlight} />
      default:
        return <DefaultCardContent record={record} highlight={highlight} />
    }
  }

  const handleTagClick = (e, tag) => {
    e.stopPropagation()
    if (onTagClick) {
      onTagClick(tag)
    }
  }

  return (
    <div
      onClick={onClick}
      className="timeline-card huiji-card p-5 min-h-[120px] transition-all duration-200 cursor-pointer hover:shadow-md flex flex-col"
    >
      {/* 卡片内容 - 居中显示 */}
      <div className="flex-1 flex items-center" style={{ paddingLeft: '20px' }}>
        {renderContent()}
      </div>

      {/* 标签 */}
      {record.tags && record.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {record.tags.slice(0, 4).map((tag, i) => {
            const color = getTagColor(tag)
            const iconName = (PRESET_TAGS.find(t => t.name === tag))?.iconName || 'tag'
            return (
              <button
                key={i}
                onClick={(e) => handleTagClick(e, tag)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-200 hover:shadow-sm"
                style={{
                  backgroundColor: color + '20',
                  color: color,
                  border: `1px solid ${color}40`,
                }}
              >
                <Icon name={iconName} size={12} color={color} strokeWidth={1.5} />
                <span>#{tag}</span>
              </button>
            )
          })}
          {record.tags.length > 4 && (
            <span
              className="px-2.5 py-1 rounded-full text-xs font-medium"
              style={{
                backgroundColor: 'var(--bg)',
                color: 'var(--muted)',
              }}
            >
              +{record.tags.length - 4}
            </span>
          )}
        </div>
      )}

      {/* 底部：时间（左）+ 类型（右） */}
      <div className="mt-4 flex items-center justify-between" style={{ borderTop: '1px solid var(--rule)', paddingTop: '8px' }}>
        <span className="text-sm" style={{ color: 'var(--muted)' }}>
          {time}
        </span>
        <span
          className="text-sm font-medium"
          style={{ color: config.color }}
        >
          {config.label}
        </span>
      </div>
    </div>
  )
}

// 瀑布流卡片 - 卡片式，类似小红书
function WaterfallCard({ record, onClick, highlight, onTagClick }) {
  const config = RECORD_TYPE_MAP[record.type] || RECORD_TYPE_MAP.note
  const date = new Date(record.createdAt)
  const dateStr = `${date.getMonth() + 1}月${date.getDate()}日`
  const time = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })

  const handleTagClick = (e, tag) => {
    e.stopPropagation()
    if (onTagClick) {
      onTagClick(tag)
    }
  }

  const renderContent = () => {
    switch (record.type) {
      case 'mood':
        return <WaterfallMoodContent record={record} highlight={highlight} />
      case 'memo':
        return <WaterfallMemoContent record={record} highlight={highlight} />
      default:
        return <WaterfallDefaultContent record={record} highlight={highlight} />
    }
  }

  return (
    <div
      onClick={onClick}
      className="huiji-card p-5 min-h-[280px] transition-all duration-200 cursor-pointer hover:shadow-md flex flex-col relative overflow-hidden"
    >
      {/* 顶部装饰条 */}
      <div
        className="absolute top-0 left-0 right-0 h-1"
        style={{ backgroundColor: config.color }}
      />

      {/* 卡片头部 - 类型标签 */}
      <div className="flex items-center justify-center mb-6">
        <span
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium"
          style={{
            backgroundColor: config.color + '15',
            color: config.color,
          }}
        >
          <Icon name={config.iconName} size={14} color={config.color} />
          {config.label}
        </span>
      </div>

      {/* 天气/地点信息 */}
      {(record.weather || record.location) && (
        <div className="flex items-center justify-center gap-3 mb-6" style={{ borderBottom: '1px solid var(--rule)' }}>
          {record.weather && (
            <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--muted)' }}>
              <Icon name="weather-sun" size={14} color="var(--muted)" />
              {record.weather}
            </span>
          )}
          {(record.weather && record.location) && <span className="text-[11px]" style={{ color: 'var(--rule)' }}>·</span>}
          {record.location && (
            <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--muted)' }}>
              <Icon name="location" size={14} color="var(--muted)" />
              {record.location}
            </span>
          )}
        </div>
      )}

      {/* 卡片内容 - 居中显示 */}
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full text-center">
          {renderContent()}
        </div>
      </div>

      {/* 日期时间 - 下移到底部 */}
      <div className="mt-6 pt-3" style={{ borderTop: '1px solid var(--rule)' }}>
        <div className="flex items-center justify-center gap-2">
          <span className="text-xs font-medium" style={{ color: 'var(--ink-strong)' }}>
            {dateStr}
          </span>
          <span className="text-[11px]" style={{ color: 'var(--rule)' }}>·</span>
          <span className="text-[11px]" style={{ color: 'var(--muted)' }}>
            {time}
          </span>
        </div>
      </div>

      {/* 标签 - 最多显示3个 */}
      {record.tags && record.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap justify-center gap-1.5">
          {record.tags.slice(0, 3).map((tag, i) => {
            const color = getTagColor(tag)
            const iconName = (PRESET_TAGS.find(t => t.name === tag))?.iconName || 'tag'
            return (
              <button
                key={i}
                onClick={(e) => handleTagClick(e, tag)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-200 hover:shadow-sm"
                style={{
                  backgroundColor: color + '20',
                  color: color,
                  border: `1px solid ${color}30`,
                }}
              >
                <Icon name={iconName} size={12} color={color} strokeWidth={1.5} />
                #{tag}
              </button>
            )
          })}
          {record.tags.length > 3 && (
            <span
              className="px-2.5 py-1 rounded-full text-xs font-medium"
              style={{
                backgroundColor: 'var(--bg2)',
                color: 'var(--muted)',
              }}
            >
              +{record.tags.length - 3}
            </span>
          )}
        </div>
      )}

      {/* 底部装饰 */}
      <div
        className="absolute bottom-0 left-0 right-0 h-8 opacity-5"
        style={{
          background: `linear-gradient(to top, ${config.color}, transparent)`,
        }}
      />
    </div>
  )
}

function WaterfallDefaultContent({ record, highlight }) {
  const html = record.contentHTML || record.content || ''
  const plainText = stripHtml(html)

  let safeHtml = html
  if (highlight && highlight.trim()) {
    const escaped = escapeRegExp(highlight)
    safeHtml = html.replace(
      new RegExp(`(${escaped})`, 'gi'),
      '<mark class="px-0.5 rounded" style="background-color:rgba(251,191,36,0.4)">$1</mark>'
    )
  }

  if (plainText.trim()) {
    return (
      <div className="flex flex-col gap-2">
        {record.title && (
          <h3 
            className="text-lg font-bold leading-relaxed line-clamp-2"
            style={{ color: 'var(--ink-strong)' }}
          >
            <HighlightedText text={record.title} highlight={highlight} />
          </h3>
        )}
        <div
          className="diary-content text-base font-medium leading-relaxed line-clamp-3"
          style={{ color: 'var(--ink)', textAlign: 'center' }}
          dangerouslySetInnerHTML={{ __html: safeHtml }}
        />
      </div>
    )
  }

  return (
    <p className="text-lg font-semibold leading-relaxed" style={{ color: 'var(--muted)' }}>
      暂无内容
    </p>
  )
}

function WaterfallMoodContent({ record, highlight }) {
  const emotions = record.emotions || []

  return (
    <div className="space-y-6">
      {/* 情绪图标+文字 - 无背景框，与列表视图统一 */}
      <div className="flex flex-wrap gap-3 justify-center">
        {emotions.slice(0, 3).map(name => {
          const emotion = EMOTIONS.find(e => e.name === name)
          return (
            <span
              key={name}
              className="text-lg font-semibold flex items-center gap-2"
              style={{ color: emotion?.color || 'var(--accent)' }}
            >
              <Icon name={emotion?.iconName} size={20} strokeWidth={1.5} />
              <span>{name}</span>
            </span>
          )
        })}
      </div>

      {/* 文字内容 - 居中加粗 */}
      {record.content && (
        <div className="text-center">
          <p
            className="text-lg font-semibold leading-relaxed"
            style={{ color: 'var(--ink-strong)' }}
          >
            <HighlightedText text={stripHtml(record.content)} highlight={highlight} />
          </p>
        </div>
      )}
    </div>
  )
}

function WaterfallMemoContent({ record, highlight }) {
  const completed = record.completed

  return (
    <div className="space-y-4">
      {/* 备忘内容 - 加粗，完成显示删除线 */}
      <p
        className="text-lg font-semibold leading-relaxed"
        style={{
          color: completed ? 'var(--muted)' : 'var(--ink-strong)',
          textDecoration: completed ? 'line-through' : 'none',
          textAlign: 'center',
        }}
      >
        <HighlightedText text={record.content} highlight={highlight} />
      </p>

      {/* 完成状态标签 */}
      <div className="flex items-center justify-center">
        <span
          className="text-xs font-medium px-3 py-1 rounded-full"
          style={{
            backgroundColor: completed ? '#10B98120' : 'var(--bg2)',
            color: completed ? '#10B981' : 'var(--muted)',
          }}
        >
          {completed ? '已完成' : '待完成'}
        </span>
      </div>
    </div>
  )
}

function DefaultCardContent({ record, highlight }) {
  const html = record.contentHTML || record.content || ''
  const plainText = stripHtml(html)

  let safeHtml = html
  if (highlight && highlight.trim()) {
    const escaped = escapeRegExp(highlight)
    safeHtml = html.replace(
      new RegExp(`(${escaped})`, 'gi'),
      '<mark class="px-0.5 rounded" style="background-color:rgba(251,191,36,0.4)">$1</mark>'
    )
  }

  if (plainText.trim()) {
    return (
      <div className="flex flex-col gap-2">
        {record.title && (
          <h3 
            className="text-xl font-bold leading-relaxed line-clamp-1"
            style={{ color: 'var(--ink-strong)' }}
          >
            <HighlightedText text={record.title} highlight={highlight} />
          </h3>
        )}
        <div
          className="diary-content text-base font-medium leading-relaxed line-clamp-3"
          style={{ color: 'var(--ink)', textAlign: 'left' }}
          dangerouslySetInnerHTML={{ __html: safeHtml }}
        />
      </div>
    )
  }

  return (
    <p className="text-lg font-semibold leading-relaxed" style={{ color: 'var(--muted)' }}>
      暂无内容
    </p>
  )
}

function MoodCardContent({ record, highlight }) {
  const emotions = record.emotions || []

  return (
    <div className="flex items-center gap-3">
      {/* 情绪图标+文字 */}
      <div className="flex flex-wrap gap-3">
        {emotions.slice(0, 3).map(name => {
          const emotion = EMOTIONS.find(e => e.name === name)
          return (
            <span
              key={name}
              className="text-lg font-semibold flex items-center gap-2"
              style={{ color: emotion?.color || 'var(--accent)' }}
            >
              <Icon name={emotion?.iconName} size={20} strokeWidth={1.5} />
              <span>{name}</span>
            </span>
          )
        })}
      </div>
      {/* 文字内容 */}
      {record.content && (
        <p
          className="text-lg font-semibold line-clamp-2"
          style={{ color: 'var(--ink-strong)' }}
        >
          <HighlightedText text={record.content} highlight={highlight} />
        </p>
      )}
    </div>
  )
}

function MemoCardContent({ record, highlight }) {
  const completed = record.completed
  
  return (
    <div className="flex items-center gap-4">
      <div
        className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center`}
        style={{
          backgroundColor: completed ? '#10b981' : 'transparent',
          borderColor: completed ? '#10b981' : 'var(--rule)',
        }}
      >
        {completed && (
          <Icon name="check" size={14} color="white" strokeWidth={2} />
        )}
      </div>
      <span 
        className="text-lg font-semibold flex-1"
        style={{ 
          color: completed ? 'var(--muted)' : 'var(--ink-strong)',
          textDecoration: completed ? 'line-through' : 'none',
        }}
      >
        <HighlightedText text={record.content} highlight={highlight} />
      </span>
    </div>
  )
}

function RecordDetailModal({ record, onClose, onDelete }) {
  const [shareImage, setShareImage] = useState(null)
  const [showShareModal, setShowShareModal] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showImageViewer, setShowImageViewer] = useState(false)
  const [currentImageSrc, setCurrentImageSrc] = useState('')
  const navigate = useNavigate()

  const config = RECORD_TYPE_MAP[record.type] || RECORD_TYPE_MAP.note
  const date = new Date(record.createdAt)
  const dateStr = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const handleShare = async () => {
    setGenerating(true)
    try {
      const imageData = await generateShareCard(record)
      setShareImage(imageData)
      setShowShareModal(true)
    } catch (error) {
      console.error('生成分享图失败:', error)
    }
    setGenerating(false)
  }

  const handleEdit = () => {
    onClose()
    navigate(`/write?editId=${record.id}&from=timeline`)
  }

  const handleCopy = async () => {
    let text = ''
    if (record.type === 'memo') {
      text = record.items?.map((item, i) => `${item.done ? '✅' : '⬜'} ${item.text}`).join('\n') || ''
    } else if (record.type === 'mood') {
      text = record.emotions?.join(' · ') || ''
      if (record.content) text += '\n\n' + stripHtml(record.content)
    } else {
      text = stripHtml(record.content || '')
    }
    
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      // Clipboard API 不可用时降级到 execCommand
      try {
        const ta = document.createElement('textarea')
        ta.value = text
        ta.style.cssText = 'position:fixed;left:-9999px'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch (e2) {
        console.error('复制失败:', e2)
      }
    }
  }

  const handleDownload = () => {
    if (!shareImage) return
    const fileName = `慧记_${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}.png`
    saveOrShareDataUrl(shareImage, fileName, { title: '保存分享图片' })
  }

  const handleContentImageClick = (e) => {
    const img = e.target.closest('img')
    if (img) {
      e.stopPropagation()
      setCurrentImageSrc(img.src)
      setShowImageViewer(true)
    }
  }

  const renderDetailContent = () => {
    switch (record.type) {
      case 'mood':
        return <MoodDetailContent record={record} />
      case 'memo':
        return <MemoDetailContent record={record} />
      case 'diary':
        return <DiaryDetailContent record={record} />
      default:
        return <NoteDetailContent record={record} />
    }
  }

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center animate-fade-in p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={handleOverlayClick}
    >
      <div 
        className="w-full max-w-lg rounded-2xl min-h-[60vh] max-h-[90vh] overflow-hidden flex flex-col animate-scale-in"
        style={{
          backgroundColor: 'var(--bg)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        {/* 弹窗头部 */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b gap-2"
          style={{ borderColor: 'var(--rule)' }}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Icon name={config.iconName} size={18} color={config.color} />
            <span className="font-medium flex-shrink-0" style={{ color: config.color }}>
              {config.label}
            </span>
            <span className="text-xs truncate" style={{ color: 'var(--muted)' }}>
              {dateStr}
            </span>
          </div>
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <button
              onClick={handleCopy}
              className="p-1.5 rounded-lg transition-all duration-200 hover:bg-[var(--bg2)]"
              style={{ color: copied ? '#10B981' : 'var(--muted)' }}
              title={copied ? '已复制' : '复制内容'}
            >
              {copied ? (
                <Icon name="check" size={18} color="#10B981" strokeWidth={1.5} />
              ) : (
                <Icon name="copy" size={18} color="var(--muted)" strokeWidth={1.5} />
              )}
            </button>
            <button
              onClick={handleEdit}
              className="p-1.5 rounded-lg transition-all duration-200 hover:bg-[var(--bg2)]"
              style={{ color: 'var(--muted)' }}
              title="编辑"
            >
              <Icon name="edit" size={18} color="var(--muted)" strokeWidth={1.5} />
            </button>
            <button
              onClick={handleShare}
              disabled={generating}
              className="p-1.5 rounded-lg transition-all duration-200 hover:bg-[var(--bg2)] disabled:opacity-50"
              style={{ color: 'var(--muted)' }}
            >
              {generating ? (
                <Icon name="refresh" size={18} color="var(--muted)" strokeWidth={1.5} className="animate-spin" />
              ) : (
                <Icon name="share" size={18} color="var(--muted)" strokeWidth={1.5} />
              )}
            </button>
            <IconButton name="trash" onClick={onDelete} label="删除" variant="danger" size={16} />
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg transition-all duration-200 hover:bg-[var(--bg2)]"
              style={{ color: 'var(--muted)' }}
            >
              <Icon name="close" size={18} color="var(--muted)" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* 弹窗内容 */}
        <div 
          className="flex-1 overflow-y-auto p-6 flex items-center justify-center detail-content-container cursor-pointer"
          onClick={handleContentImageClick}
        >
          {renderDetailContent()}
        </div>
      </div>

      {/* 分享卡片预览弹窗 */}
      {showShareModal && shareImage && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center animate-fade-in"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          onClick={(e) => e.target === e.currentTarget && setShowShareModal(false)}
        >
          <div className="flex flex-col items-center gap-4 p-6 animate-scale-in max-h-[95vh]">
            <div className="overflow-y-auto max-h-[80vh]">
              <img 
                src={shareImage} 
                alt="分享卡片" 
                className="w-[85vw] max-w-lg rounded-2xl shadow-2xl"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleDownload}
                className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200"
                style={{
                  backgroundColor: 'var(--accent)',
                  color: 'white',
                }}
              >
                <Icon name="save" size={20} color="white" strokeWidth={1.5} />
              </button>
              <button
                onClick={() => setShowShareModal(false)}
                className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  color: 'white',
                }}
              >
                <Icon name="close" size={20} color="white" strokeWidth={1.5} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 图片放大查看器 */}
      {showImageViewer && currentImageSrc && (
        <div 
          className="fixed inset-0 z-[70] flex items-center justify-center animate-fade-in"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.85)' }}
          onClick={() => setShowImageViewer(false)}
        >
          <img 
            src={currentImageSrc} 
            alt="放大查看"
            className="max-w-[95vw] max-h-[95vh] object-contain rounded-lg animate-scale-in"
            style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}

function NoteDetailContent({ record }) {
  const htmlContent = record.contentHTML || record.content || ''
  return (
    <div className="w-full text-center space-y-6">
      {record.title && (
        <h2 
          className="text-2xl font-bold leading-relaxed"
          style={{ color: 'var(--ink-strong)' }}
        >
          {record.title}
        </h2>
      )}
      <div 
        className="diary-content text-xl font-semibold leading-relaxed text-center"
        style={{ color: 'var(--ink-strong)' }}
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
      {record.tags && record.tags.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2 pt-6" style={{ borderTop: '1px solid var(--rule)' }}>
          {record.tags.map((tag, i) => {
            const color = getTagColor(tag)
            return (
              <span
                key={i}
                className="px-3 py-1.5 rounded-full text-sm font-medium"
                style={{
                  backgroundColor: color + '20',
                  color: color,
                  border: `1px solid ${color}30`,
                }}
              >
                #{tag}
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}

function MoodDetailContent({ record }) {
  const emotions = record.emotions || []

  return (
    <div className="w-full text-center space-y-8">
      {/* 情绪标签 - 居中放大 */}
      <div className="flex flex-wrap gap-4 justify-center">
        {emotions.map(name => {
          const emotion = EMOTIONS.find(e => e.name === name)
          return (
            <span
            key={name}
            className="px-10 py-5 rounded-full text-2xl font-bold flex items-center gap-4"
            style={{
              backgroundColor: emotion?.color || 'var(--accent)',
              color: '#333',
              boxShadow: `0 6px 12px ${emotion?.color}40`,
            }}
          >
            <Icon name={emotion?.iconName} size={36} color="#333" strokeWidth={1.5} />
            {name}
          </span>
          )
        })}
      </div>

      {/* 文字内容 - 居中加粗加大 */}
      {record.content && (
        <div
          className="diary-content text-3xl font-semibold leading-relaxed text-center"
          style={{ color: 'var(--ink-strong)' }}
          dangerouslySetInnerHTML={{ __html: record.content }}
        />
      )}
    </div>
  )
}

function MemoDetailContent({ record }) {
  const completed = record.completed

  return (
    <div className="w-full text-center space-y-8">
      {/* 备忘内容 - 居中加粗加大 */}
      <p 
        className="text-3xl font-semibold leading-relaxed"
        style={{ 
          color: completed ? 'var(--muted)' : 'var(--ink-strong)',
          textDecoration: completed ? 'line-through' : 'none',
        }}
      >
        {record.content}
      </p>

      {/* 状态标签 */}
      <span
        className="text-base font-medium px-6 py-2.5 rounded-full"
        style={{
          backgroundColor: completed ? '#10B98120' : 'var(--bg2)',
          color: completed ? '#10B981' : 'var(--muted)',
        }}
      >
        {completed ? '已完成' : '待完成'}
      </span>
    </div>
  )
}

function DiaryDetailContent({ record }) {
  const htmlContent = record.contentHTML || record.content || ''

  return (
    <div 
      className="prose prose-base max-w-none w-full space-y-6"
      style={{ color: 'var(--ink-strong)' }}
    >
      {record.title && (
        <h2 
          className="text-2xl font-bold leading-relaxed text-center"
          style={{ color: 'var(--ink-strong)' }}
        >
          {record.title}
        </h2>
      )}
      <div 
        className="diary-content text-xl font-semibold leading-relaxed"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    </div>
  )
}

export default TimelinePage

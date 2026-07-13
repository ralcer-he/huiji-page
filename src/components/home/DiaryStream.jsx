import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAllRecords, getCategories } from '../../db/database'
import DiaryCard from './DiaryCard'
import CategoryTabs from './CategoryTabs'
import EmptyHomeState from './EmptyHomeState'
import TopBar from '../layout/TopBar'
import Icon from '../ui/Icon'

function DiaryStream() {
  const [records, setRecords] = useState([])
  const [categories, setCategories] = useState([])
  const [activeCategory, setActiveCategory] = useState('all')
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [allRecords, cats] = await Promise.all([
        getAllRecords(),
        getCategories(),
      ])
      setRecords(allRecords)
      setCategories(cats)
    } catch (e) {
      console.error('加载日记流失败:', e)
    } finally {
      setLoading(false)
    }
  }

  const filteredRecords = records
    .filter(r => r.privacy !== 'hidden')
    .filter(r => activeCategory === 'all' || r.category === activeCategory || (!r.category && activeCategory === 'uncategorized'))

  const handleDeleted = (id) => {
    setRecords(prev => prev.filter(r => r.id !== id))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-pulse text-sm" style={{ color: 'var(--muted)' }}>加载中...</div>
      </div>
    )
  }

  return (
    <div>
      <TopBar
        title="日记流"
        rightAction={
          <button
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
            style={{ color: 'var(--muted)' }}
            onClick={() => navigate('/memory')}
          >
            <Icon name="search" size={18} strokeWidth={1.5} />
          </button>
        }
      />

      <div className="px-5 pt-4 pb-4">
        <CategoryTabs
          categories={categories}
          active={activeCategory}
          onChange={setActiveCategory}
        />
      </div>

      {filteredRecords.length === 0 ? (
        <div className="px-5">
          <EmptyHomeState />
        </div>
      ) : (
        <div className="px-5 space-y-3 pb-28">
          {[...filteredRecords].reverse().map(record => (
            <DiaryCard
              key={record.id}
              record={record}
              onClick={() => navigate(`/write?editId=${record.id}`)}
              onDeleted={handleDeleted}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default DiaryStream

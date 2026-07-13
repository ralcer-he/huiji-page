import { useNavigate } from 'react-router-dom'
import Icon from '../ui/Icon'

function EmptyHomeState() {
  const navigate = useNavigate()

  return (
    <div className="text-center py-16">
      <div className="w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'var(--accent3)' }}>
        <Icon name="file" size={32} color="var(--accent)" strokeWidth={1.5} />
      </div>
      <h2 className="text-[15px] font-medium mb-2" style={{ color: 'var(--ink)' }}>
        开始记录你的第一天
      </h2>
      <p className="text-[13px] mb-6 leading-[1.7]" style={{ color: 'var(--muted)' }}>
        记录心情、随笔、备忘和日记
      </p>
      <button
        className="px-6 py-2.5 rounded-full text-[13px] font-medium transition-all active:scale-95"
        style={{
          backgroundColor: 'var(--accent)',
          color: 'white',
          boxShadow: 'var(--shadow-sm)',
        }}
        onClick={() => navigate('/write')}
      >
        写下第一篇
      </button>
    </div>
  )
}

export default EmptyHomeState

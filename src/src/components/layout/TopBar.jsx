import { useNavigate } from 'react-router-dom'
import Icon from '../ui/Icon'

function TopBar({ title, showBack = false, rightAction = null }) {
  const navigate = useNavigate()

  return (
    <div
      className="sticky top-0 z-30 relative flex items-center justify-between px-5 h-14"
      style={{
        backgroundColor: 'var(--bg)',
        borderBottom: '1px solid transparent',
      }}
    >
      {/* 左侧 */}
      <div className="flex items-center gap-3 w-10">
        {showBack && (
          <button
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
            style={{ color: 'var(--ink)' }}
            onClick={() => navigate(-1)}
          >
            <Icon name="back" size={20} strokeWidth={1.5} />
          </button>
        )}
      </div>

      {/* 中间标题 */}
      <h1
        className="absolute left-1/2 -translate-x-1/2 text-[16px] font-semibold truncate max-w-[60%]"
        style={{ color: 'var(--ink-strong)' }}
      >
        {title}
      </h1>

      {/* 右侧 */}
      <div className="flex items-center gap-2 w-10 justify-end">
        {rightAction}
      </div>
    </div>
  )
}

export default TopBar

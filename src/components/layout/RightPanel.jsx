import { useLocation, useNavigate } from 'react-router-dom'
import HomeRightPanel from './HomeRightPanel'
import CalendarRightPanel from './CalendarRightPanel'

const PANEL_CONFIG = {
  '/': HomeRightPanel,
  '/calendar': CalendarRightPanel,
}

export default function RightPanel() {
  const location = useLocation()
  const navigate = useNavigate()

  const PanelContent = PANEL_CONFIG[location.pathname]
  if (!PanelContent) return null

  return (
    <aside className="hidden lg:block w-[280px] flex-shrink-0 border-l overflow-auto"
      style={{ borderColor: 'var(--rule)', backgroundColor: 'var(--bg2)' }}
    >
      <div className="px-5 py-4">
        <PanelContent onNavigate={navigate} />
      </div>
    </aside>
  )
}

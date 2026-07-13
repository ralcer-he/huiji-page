import { NavLink } from 'react-router-dom'
import Icon from '../ui/Icon'

function BottomNav() {
  const navItems = [
    {
      to: '/write',
      label: '编写',
      icon: 'edit',
    },
    {
      to: '/timeline',
      label: '回忆',
      icon: 'clock',
    },
    {
      to: '/calendar',
      label: '日历',
      icon: 'calendar',
    },
    {
      to: '/stats',
      label: '统计',
      icon: 'bar-chart',
    },
    {
      to: '/settings',
      label: '设置',
      icon: 'settings',
    },
  ]

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 safe-area-bottom"
      style={{
        backgroundColor: 'var(--bg)',
        borderTop: '1px solid var(--rule)',
        boxShadow: 'var(--shadow-md)',
      }}
    >
      <div className="max-w-lg mx-auto px-4 py-2">
        <div className="flex items-center justify-around">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to}>
              {({ isActive }) => (
                <div
                  className="relative flex flex-col items-center py-2 px-4 rounded-xl transition-all duration-200"
                  style={{
                    color: isActive ? 'var(--accent)' : 'var(--ink)',
                    backgroundColor: isActive ? 'var(--accent3)' : 'transparent',
                  }}
                >
                  <Icon
                    name={item.icon}
                    size={22}
                    color={isActive ? 'var(--accent)' : 'var(--ink)'}
                    strokeWidth={1.5}
                  />

                  {/* 标签 */}
                  <span
                    className="text-xs mt-1 font-medium"
                    style={{
                      fontWeight: isActive ? 600 : 500,
                    }}
                  >
                    {item.label}
                  </span>
                </div>
              )}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  )
}

export default BottomNav

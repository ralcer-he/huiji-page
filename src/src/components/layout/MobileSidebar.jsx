import { useState, useRef, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import Icon from '../ui/Icon'
import AvatarCropper from '../AvatarCropper'
import { getUserProfile, saveUserProfile } from '../../db/database'
import { compressImage } from '../../utils/imageHelper'

function MobileSidebar({ isOpen, onClose }) {
  const location = useLocation()
  const [avatar, setAvatar] = useState(null)
  const [nickname, setNickname] = useState('')
  const [showCropper, setShowCropper] = useState(false)
  const [cropImageSrc, setCropImageSrc] = useState('')
  const fileInputRef = useRef(null)

  useEffect(() => {
    const loadProfile = () => {
      getUserProfile().then(profile => {
        if (profile.avatar) {
          setAvatar(profile.avatar)
        }
        setNickname(profile.nickname || '')
      })
    }
    if (isOpen) {
      loadProfile()
    }
    const handleProfileUpdate = () => loadProfile()
    window.addEventListener('profile-updated', handleProfileUpdate)
    window.addEventListener('avatar-updated', handleProfileUpdate)
    return () => {
      window.removeEventListener('profile-updated', handleProfileUpdate)
      window.removeEventListener('avatar-updated', handleProfileUpdate)
    }
  }, [isOpen])

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return

    const reader = new FileReader()
    reader.onload = async (ev) => {
      const compressed = await compressImage(ev.target.result, 1024)
      setCropImageSrc(compressed)
      setShowCropper(true)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleCropConfirm = async (croppedImage) => {
    setAvatar(croppedImage)
    setShowCropper(false)
    await saveUserProfile({ avatar: croppedImage })
    window.dispatchEvent(new CustomEvent('avatar-updated', { detail: { avatar: croppedImage } }))
  }

  const handleCropCancel = () => {
    setShowCropper(false)
    setCropImageSrc('')
  }

  const navItems = [
    { to: '/write', label: '编写', icon: 'edit' },
    { to: '/timeline', label: '回忆', icon: 'clock' },
    { to: '/calendar', label: '日历', icon: 'calendar' },
    { to: '/stats', label: '统计', icon: 'bar-chart' },
    { to: '/xiaohui', label: '小慧', icon: 'xiaohui-girl' },
    { to: '/settings', label: '设置', icon: 'settings' },
  ]

  const handleNavClick = () => {
    onClose()
  }

  if (!isOpen) return null

  return (
    <>
      <div
        data-overlay="true"
        className="fixed inset-0 bg-black/30 z-40 animate-fade-in"
        onClick={onClose}
      />
      <aside
        data-overlay="true"
        className="fixed left-0 top-0 bottom-0 w-72 z-50 animate-slide-in-left"
        style={{ backgroundColor: 'var(--bg)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-full flex flex-col">
          <div className="flex-1 flex flex-col">
            <div className="h-[33%] flex flex-col items-center justify-center gap-2">
              <div
                className="w-28 h-28 rounded-full border-2 border-dashed flex items-center justify-center cursor-pointer overflow-hidden hover:opacity-90 transition-opacity"
                style={{
                  borderColor: avatar ? 'transparent' : 'var(--accent)',
                  backgroundColor: avatar ? 'var(--bg2)' : 'transparent',
                }}
                onClick={handleAvatarClick}
              >
                {avatar ? (
                  <img
                    src={avatar}
                    alt="avatar"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <Icon name="user" size={44} color="var(--accent)" strokeWidth={1.5} />
                )}
              </div>
              <div className="text-[15px] font-medium" style={{ color: 'var(--ink-strong)' }}>
                {nickname || '用户'}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
            </div>

            <nav className="flex-1 px-3">
              <div className="space-y-1">
                {navItems.map((item) => {
                  const isActive = location.pathname === item.to
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={handleNavClick}
                    >
                      <div
                        className="flex items-center gap-3 px-4 h-12 rounded-[8px] transition-all duration-200 cursor-pointer"
                        style={{
                          backgroundColor: isActive ? 'var(--accent-light)' : 'transparent',
                        }}
                      >
                        <div className="relative">
                          <Icon
                            name={item.icon}
                            size={20}
                            color={isActive ? 'var(--accent)' : 'var(--ink)'}
                            strokeWidth={1.5}
                          />
                        </div>
                        <span
                          className="text-[16px]"
                          style={{
                            color: isActive ? 'var(--accent)' : 'var(--ink)',
                            fontWeight: isActive ? 600 : 400,
                          }}
                        >
                          {item.label}
                        </span>
                      </div>
                    </NavLink>
                  )
                })}
              </div>
            </nav>
          </div>

          <div className="px-3 pb-6">
            <div className="mx-3 h-px" style={{ backgroundColor: 'var(--rule)' }} />
            <p
              className="text-center text-[11px] tracking-wider select-none mt-3"
              style={{ color: 'var(--muted)', opacity: 0.85 }}
            >
              慧记 v1.0.0
            </p>
          </div>
        </div>
      </aside>

    {showCropper && cropImageSrc && (
      <AvatarCropper
        imageSrc={cropImageSrc}
        onConfirm={handleCropConfirm}
        onCancel={handleCropCancel}
        cropSize={220}
      />
    )}
    </>
  )
}

export default MobileSidebar

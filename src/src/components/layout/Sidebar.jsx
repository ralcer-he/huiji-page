import { useState, useRef, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import Icon from '../ui/Icon'
import AvatarCropper from '../AvatarCropper'
import { getUserProfile, saveUserProfile } from '../../db/database'
import { compressImage } from '../../utils/imageHelper'

function Sidebar() {
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
    loadProfile()
    const handleProfileUpdate = () => loadProfile()
    window.addEventListener('profile-updated', handleProfileUpdate)
    window.addEventListener('avatar-updated', handleProfileUpdate)
    return () => {
      window.removeEventListener('profile-updated', handleProfileUpdate)
      window.removeEventListener('avatar-updated', handleProfileUpdate)
    }
  }, [])

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

  return (
    <>
    <aside
      className="w-60 h-full border-r flex-shrink-0 px-3 pb-3 flex flex-col"
      style={{
        borderColor: 'var(--rule)',
        backgroundColor: 'var(--bg)',
      }}
    >
      {/* 顶部用户头像区域 */}
      <div className="flex-shrink-0 flex flex-col items-center gap-2" style={{ paddingTop: '40px', paddingBottom: '30px' }}>
        <div
          className="w-20 h-20 rounded-full border-2 border-dashed flex items-center justify-center cursor-pointer overflow-hidden hover:opacity-90 transition-opacity"
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
            <Icon name="user" size={34} color="var(--accent)" strokeWidth={1.5} />
          )}
        </div>
        <div className="text-[13px] font-medium" style={{ color: 'var(--ink-strong)' }}>
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

      {/* 导航菜单 */}
      <nav className="flex-1 space-y-1 px-2">
        {navItems.map((item) => (
          <NavLink key={item.to} to={item.to}>
            {({ isActive }) => (
              <div
                className="flex items-center gap-3 px-4 h-11 rounded-xl transition-all duration-200 cursor-pointer hover:bg-[var(--bg2)]"
                style={{
                  backgroundColor: isActive ? 'var(--accent-light)' : 'transparent',
                }}
              >
                <Icon
                  name={item.icon}
                  size={20}
                  color={isActive ? 'var(--accent)' : 'var(--ink)'}
                  strokeWidth={1.5}
                />
                <span
                  className="text-[15px] transition-colors duration-200"
                  style={{
                    color: isActive ? 'var(--accent)' : 'var(--ink)',
                    fontWeight: isActive ? 600 : 400,
                  }}
                >
                  {item.label}
                </span>
              </div>
            )}
          </NavLink>
        ))}
      </nav>

      {/* 底部版本号水印 */}
      <div className="mt-auto flex-shrink-0">
        <div className="mx-4 mb-2 h-px" style={{ backgroundColor: 'var(--rule)' }} />
        <p
          className="text-center text-[11px] tracking-wider select-none"
          style={{ color: 'var(--muted)', opacity: 0.85 }}
        >
          慧记 v1.0.0
        </p>
      </div>
    </aside>

    {showCropper && cropImageSrc && (
      <AvatarCropper
        imageSrc={cropImageSrc}
        onConfirm={handleCropConfirm}
        onCancel={handleCropCancel}
        cropSize={160}
      />
    )}
    </>
  )
}

export default Sidebar

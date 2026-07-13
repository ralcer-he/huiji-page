import { useState, useEffect } from 'react'
import { getUserProfile, saveUserProfile } from '../../db/database'
import Collapsible from '../ui/Collapsible'

function ProfileSettingsPanel() {
  const [nickname, setNickname] = useState('')
  const [gender, setGender] = useState('')
  const [birthday, setBirthday] = useState('')
  const [mbti, setMbti] = useState('')
  const [hobbies, setHobbies] = useState('')
  const [bio, setBio] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    getUserProfile().then(profile => {
      setNickname(profile.nickname || '')
      setGender(profile.gender || '')
      setBirthday(profile.birthday || '')
      setMbti(profile.mbti || '')
      setHobbies(profile.hobbies || '')
      setBio(profile.bio || '')
      setLoaded(true)
    })
  }, [])

  const handleSave = async () => {
    await saveUserProfile({
      nickname: nickname.trim(),
      gender,
      birthday,
      mbti: mbti.trim().toUpperCase(),
      hobbies: hobbies.trim(),
      bio: bio.trim(),
    })
    window.dispatchEvent(new CustomEvent('profile-updated'))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const genderOptions = [
    { value: 'male', label: '男' },
    { value: 'female', label: '女' },
  ]

  if (!loaded) return null

  return (
    <div>
      <h3 className="text-sm font-medium px-5 pt-5 pb-3" style={{ color: 'var(--ink)' }}>个人信息</h3>

      <Collapsible
        title="编辑资料"
        iconName="user"
        hint={nickname ? nickname : '未填写'}
        defaultOpen={false}
      >
        <div className="space-y-3">
          {/* 昵称 */}
          <div
            className="flex items-center justify-between px-4 h-12 rounded-xl"
            style={{ backgroundColor: 'var(--bg)' }}
          >
            <span className="text-sm" style={{ color: 'var(--ink)' }}>昵称</span>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="给自己起个名字"
              maxLength={20}
              className="text-right text-sm outline-none flex-1 min-w-0 ml-4"
              style={{ backgroundColor: 'transparent', color: 'var(--ink)' }}
            />
          </div>

          {/* 性别 */}
          <div
            className="flex items-center justify-between px-4 h-12 rounded-xl"
            style={{ backgroundColor: 'var(--bg)' }}
          >
            <span className="text-sm" style={{ color: 'var(--ink)' }}>性别</span>
            <div className="flex gap-1.5">
              {genderOptions.map(opt => {
                const isFemale = opt.value === 'female'
                const isSelected = gender === opt.value
                return (
                  <button
                    key={opt.value}
                    onClick={() => setGender(gender === opt.value ? '' : opt.value)}
                    className="flex items-center justify-center w-10 h-9 rounded-lg text-sm font-medium transition-all duration-200"
                    style={{
                      backgroundColor: isSelected ? (isFemale ? '#FF69B4' : 'var(--accent)') : 'transparent',
                      color: isSelected ? '#fff' : 'var(--ink)',
                      border: '1px solid var(--rule)',
                    }}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* 生日 */}
          <div
            className="flex items-center justify-between px-4 h-12 rounded-xl"
            style={{ backgroundColor: 'var(--bg)' }}
          >
            <span className="text-sm" style={{ color: 'var(--ink)' }}>生日</span>
            <input
              type="date"
              value={birthday}
              onChange={(e) => setBirthday(e.target.value)}
              className="text-right text-sm outline-none flex-shrink-0 ml-4"
              style={{ backgroundColor: 'transparent', color: 'var(--ink)' }}
            />
          </div>

          {/* MBTI */}
          <div
            className="flex items-center justify-between px-4 h-12 rounded-xl"
            style={{ backgroundColor: 'var(--bg)' }}
          >
            <span className="text-sm" style={{ color: 'var(--ink)' }}>MBTI</span>
            <input
              type="text"
              value={mbti}
              onChange={(e) => setMbti(e.target.value)}
              placeholder="INTJ"
              maxLength={4}
              className="text-right text-sm outline-none w-20 uppercase flex-shrink-0 ml-4"
              style={{ backgroundColor: 'transparent', color: 'var(--ink)' }}
            />
          </div>

          {/* 兴趣爱好 */}
          <div
            className="flex items-center justify-between px-4 h-12 rounded-xl"
            style={{ backgroundColor: 'var(--bg)' }}
          >
            <span className="text-sm" style={{ color: 'var(--ink)' }}>兴趣爱好</span>
            <input
              type="text"
              value={hobbies}
              onChange={(e) => setHobbies(e.target.value)}
              placeholder="阅读、音乐..."
              maxLength={50}
              className="text-right text-sm outline-none flex-1 min-w-0 ml-4"
              style={{ backgroundColor: 'transparent', color: 'var(--ink)' }}
            />
          </div>

          {/* 个人简介 */}
          <div
            className="px-4 py-3 rounded-xl"
            style={{ backgroundColor: 'var(--bg)' }}
          >
            <div className="flex items-start justify-between">
              <span className="text-sm mt-1" style={{ color: 'var(--ink)' }}>个人简介</span>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="一句话介绍自己"
                maxLength={100}
                rows={2}
                className="text-right text-sm outline-none flex-1 min-w-0 ml-4 resize-none"
                style={{ backgroundColor: 'transparent', color: 'var(--ink)' }}
              />
            </div>
          </div>

          {/* 保存按钮 */}
          <button
            onClick={handleSave}
            className="w-full py-2.5 rounded-xl text-sm font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            style={{
              backgroundColor: saved ? '#4CAF50' : 'var(--accent)',
              color: '#fff',
            }}
          >
            {saved ? '已保存' : '保存'}
          </button>
        </div>
      </Collapsible>
    </div>
  )
}

export default ProfileSettingsPanel

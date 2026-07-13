export const PRESET_TAGS = [
  { name: '日常', color: '#FFA07A', icon: '🌟', iconName: 'tag-star' },
  { name: '工作', color: '#7EC8E3', icon: '💼', iconName: 'tag-briefcase' },
  { name: '学习', color: '#34D399', icon: '📚', iconName: 'tag-book' },
  { name: '生活', color: '#F472B6', icon: '🏠', iconName: 'tag-home' },
  { name: '心情', color: '#FBBF24', icon: '💭', iconName: 'tag-cloud' },
  { name: '旅行', color: '#818CF8', icon: '✈️', iconName: 'tag-plane' },
  { name: '美食', color: '#FB923C', icon: '🍜', iconName: 'tag-food' },
  { name: '运动', color: '#10B981', icon: '🏃', iconName: 'tag-run' },
  { name: '读书', color: '#A78BFA', icon: '📖', iconName: 'tag-book' },
  { name: '电影', color: '#EC4899', icon: '🎬', iconName: 'tag-film' },
  { name: '音乐', color: '#14B8A6', icon: '🎵', iconName: 'tag-music' },
  { name: '健康', color: '#22C55E', icon: '💪', iconName: 'tag-heart' },
  { name: '朋友', color: '#F59E0B', icon: '👥', iconName: 'tag-users' },
  { name: '家人', color: '#EF4444', icon: '👨‍👩‍👧', iconName: 'tag-family' },
  { name: '成长', color: '#6366F1', icon: '🌱', iconName: 'tag-sprout' },
  { name: '反思', color: '#64748B', icon: '🤔', iconName: 'tag-thinking' },
  { name: '灵感', color: '#F97316', icon: '💡', iconName: 'tag-lightbulb' },
  { name: '感恩', color: '#EAB308', icon: '🙏', iconName: 'tag-pray' },
  { name: '梦想', color: '#8B5CF6', icon: '🌈', iconName: 'tag-rainbow' },
  { name: '挑战', color: '#0EA5E9', icon: '🎯', iconName: 'tag-target' },
]

export const ACTIVITY_TAGS = [
  { name: '运动健身', color: '#10B981', icon: '🏃', iconName: 'tag-run' },
  { name: '阅读学习', color: '#6366F1', icon: '📚', iconName: 'tag-book' },
  { name: '工作事务', color: '#5DADE2', icon: '💼', iconName: 'tag-briefcase' },
  { name: '休闲娱乐', color: '#EC4899', icon: '🎮', iconName: 'tag-game' },
  { name: '社交聚会', color: '#F59E0B', icon: '🥂', iconName: 'tag-wine' },
  { name: '家庭时光', color: '#EF4444', icon: '👨‍👩‍👧', iconName: 'tag-family' },
  { name: '美食烹饪', color: '#FB923C', icon: '🍳', iconName: 'tag-cook' },
  { name: '外出散步', color: '#14B8A6', icon: '🚶', iconName: 'tag-walk' },
  { name: '冥想放松', color: '#8B5CF6', icon: '🧘', iconName: 'tag-meditate' },
  { name: '创意创作', color: '#F97316', icon: '🎨', iconName: 'tag-palette' },
  { name: '音乐聆听', color: '#06B6D4', icon: '🎵', iconName: 'tag-music' },
  { name: '影视观看', color: '#84CC16', icon: '🎬', iconName: 'tag-film' },
]

export const getTagColor = (tagName) => {
  const tag = PRESET_TAGS.find(t => t.name === tagName)
  if (tag) return tag.color
  let hash = 0
  for (let i = 0; i < tagName.length; i++) {
    hash = tagName.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = hash % 360
  return `hsl(${hue}, 70%, 65%)`
}

export const getTagIcon = (tagName) => {
  const tag = PRESET_TAGS.find(t => t.name === tagName)
  return tag?.icon || '🏷'
}

export const getTagIconName = (tagName) => {
  const tag = PRESET_TAGS.find(t => t.name === tagName)
  return tag?.iconName || 'tag'
}
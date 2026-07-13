export const RECORD_TYPES = [
  { id: 'note', label: '随笔', color: '#7EC8E3', iconName: 'note' },
  { id: 'mood', label: '心情', color: '#FBBF24', iconName: 'mood' },
  { id: 'memo', label: '备忘', color: '#34D399', iconName: 'memo' },
  { id: 'diary', label: '日记', color: '#A78BFA', iconName: 'diary' },
]

export const getRecordType = (typeId) => {
  return RECORD_TYPES.find(t => t.id === typeId) || RECORD_TYPES[0]
}

export const RECORD_TYPE_MAP = RECORD_TYPES.reduce((map, t) => {
  map[t.id] = t
  return map
}, {})

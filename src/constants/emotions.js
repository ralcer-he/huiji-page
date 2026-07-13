export const EMOTIONS = [
  { name: '开心', emoji: '😊', iconName: 'emotion-happy', color: '#F5D04E', category: 'positive' },
  { name: '平静', emoji: '😌', iconName: 'emotion-calm', color: '#7EC8E3', category: 'positive' },
  { name: '兴奋', emoji: '🤩', iconName: 'emotion-excited', color: '#F97316', category: 'positive' },
  { name: '感动', emoji: '🥺', iconName: 'emotion-touched', color: '#EC4899', category: 'positive' },
  { name: '疲惫', emoji: '😴', iconName: 'emotion-tired', color: '#8AAA90', category: 'neutral' },
  { name: '焦虑', emoji: '😰', iconName: 'emotion-anxious', color: '#8B5CF6', category: 'negative' },
  { name: '难过', emoji: '😢', iconName: 'emotion-sad', color: '#8898A8', category: 'negative' },
  { name: '愤怒', emoji: '😠', iconName: 'emotion-angry', color: '#EF4444', category: 'negative' },
];

export const getEmotionByName = (name) => {
  return EMOTIONS.find(e => e.name === name);
};

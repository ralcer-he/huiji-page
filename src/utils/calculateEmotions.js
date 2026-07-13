import { EMOTIONS, getEmotionByName } from '../constants/emotions';

export function calculateDailyEmotions(records) {
  if (!records || records.length === 0) {
    return {
      topEmotion: null,
      topPercentage: 0,
      emotions: [],
    };
  }

  const emotionCounts = {};
  let totalCount = 0;

  for (const record of records) {
    if (record.emotions && Array.isArray(record.emotions)) {
      for (const emotionName of record.emotions) {
        emotionCounts[emotionName] = (emotionCounts[emotionName] || 0) + 1;
        totalCount++;
      }
    }
  }

  if (totalCount === 0) {
    return {
      topEmotion: null,
      topPercentage: 0,
      emotions: [],
    };
  }

  const emotions = Object.entries(emotionCounts)
    .map(([name, count]) => {
      const emotionInfo = getEmotionByName(name);
      return {
        name,
        count,
        percentage: Math.round((count / totalCount) * 100),
        color: emotionInfo?.color || '#ccc',
        iconName: emotionInfo?.iconName || 'mood',
        emoji: emotionInfo?.emoji || '❓',
      };
    })
    .sort((a, b) => b.count - a.count);

  const topEmotion = emotions[0];

  return {
    topEmotion: {
      name: topEmotion.name,
      color: topEmotion.color,
      iconName: topEmotion.iconName,
      emoji: topEmotion.emoji,
    },
    topPercentage: topEmotion.percentage,
    emotions,
  };
}

export function getCalendarCellColor(dayRecords) {
  if (!dayRecords || dayRecords.length === 0) {
    return {
      color: 'transparent',
      opacity: 1,
      borderColor: 'var(--rule)',
    };
  }

  const { topEmotion, topPercentage } = calculateDailyEmotions(dayRecords);

  if (!topEmotion) {
    return {
      color: 'var(--bg2)',
      opacity: 0.8,
      borderColor: 'var(--rule)',
    };
  }

  const opacity = 0.4 + (topPercentage / 100) * 0.6;

  return {
    color: topEmotion.color,
    opacity,
    borderColor: topEmotion.color + '80',
  };
}

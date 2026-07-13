export const EMOTION_KEYWORDS = {
  '开心': ['开心', '高兴', '棒', '好', '太好了', '哈哈', '幸福', '满足', '快乐', '愉快'],
  '平静': ['平静', '放松', '安静', '宁静', '舒服', '安逸', '安心'],
  '焦虑': ['焦虑', '紧张', '不安', '担心', '慌', '压力', '烦躁', '着急'],
  '难过': ['难过', '伤心', '失落', '悲伤', '哭', '泪', '痛', '遗憾'],
  '愤怒': ['生气', '愤怒', '烦', '气死', '恨', '受够了', '无语'],
  '疲惫': ['累', '疲惫', '困', '乏', '疲倦', '没劲', '无力', '辛苦'],
  '兴奋': ['兴奋', '激动', '期待', '迫不及待', '太棒了', '冲'],
  '感动': ['感动', '温暖', '泪目', '心酸', '心疼', '谢谢'],
};

export function matchEmotionsByKeywords(text) {
  if (!text || typeof text !== 'string') {
    return [];
  }

  const matchedEmotions = [];
  const lowerText = text.toLowerCase();

  for (const [emotion, keywords] of Object.entries(EMOTION_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        if (!matchedEmotions.includes(emotion)) {
          matchedEmotions.push(emotion);
        }
        break;
      }
    }
  }

  return matchedEmotions;
}

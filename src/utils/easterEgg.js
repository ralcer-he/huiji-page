const EASTER_EGG_USERS = [
  {
    name: '何洋',
    nicknames: ['ralcer', '忆顾余咍', '阿洋', '洋洋'],
    gender: 'male',
    isDeveloper: true,
    greetings: [
      '好久不见。',
      '你来啦，今天过得怎么样？',
      '最近还好吗？',
      '嗯，看到你来了。',
      '又见面了。',
      '今天有什么想聊的？',
      '这段时间过得顺利吗？',
      '在忙什么呢？',
    ],
  },
  {
    name: '周文烯',
    nicknames: ['文烯', '烯烯', '烯宝', '小烯', 'wency', 'Wency'],
    gender: 'female',
    greetings: [
      '好久不见，文烯～',
      '文烯，今天过得怎么样呀？',
      '烯烯来啦～欢迎回来',
      '嗨，小烯，想我了吗？',
      '哇，是文烯！我猜你今天一定有好玩的事想告诉我',
      '烯烯你来啦，我刚好在想你呢，最近过得好不好？',
      '猜猜我是谁～好啦是我啦，小烯同学近来可好？',
      '你终于来看我了！快坐下，我们慢慢聊～',
    ],
  },
  {
    name: '许彤彤',
    nicknames: ['彤彤', '小彤', '彤宝', '彤彤酱', '🍋', '柠檬不秃头'],
    gender: 'female',
    greetings: [
      '好久不见，彤彤～',
      '彤彤，今天过得开心吗？',
      '小彤来啦，真高兴见到你',
      '嗨，彤宝，今天想聊点什么？',
      '彤彤！你来啦～最近有没有什么新鲜事要分享？',
      '呀，是彤彤酱！我等你好久啦，快来坐坐',
      '彤宝来了～今天心情怎么样，想和我说说吗？',
      '你出现啦！我刚刚还在翻你之前的记录呢，近来还好吗？',
    ],
  },
  {
    name: '陈美欣',
    nicknames: ['美欣', '欣欣', '欣宝', '小欣', '好运芝士'],
    gender: 'female',
    greetings: [
      '好久不见，美欣～',
      '美欣，最近好吗？',
      '欣欣，欢迎回来',
      '嗨，欣宝，今天过得怎么样？',
      '美欣来啦！最近有没有遇到什么开心的事呀？',
      '哇是欣欣！我刚好泡了杯茶，来聊聊吧',
      '好运芝士驾到～今天有没有给我带什么好消息？',
      '你终于来啦，我可想你了，快跟我说说最近怎么样',
    ],
  },
  {
    name: '代心怡',
    nicknames: ['心怡', '怡怡', '怡宝', '小怡'],
    gender: 'female',
    greetings: [
      '好久不见，心怡～',
      '心怡，今天心情怎么样？',
      '怡怡，真高兴你来了',
      '嗨，小怡，想聊点什么呢？',
      '心怡！你来了～最近有没有好好照顾自己呀？',
      '怡宝出现了！我刚刚还在想你最近忙什么呢',
      '小怡同学近来可好？我给你留了一个专属座位哦',
      '你终于来看我了！快跟我说说，最近都在忙些什么？',
    ],
  },
  {
    name: '朱昱丰',
    nicknames: ['昱丰', '丰丰', '小丰', '丰哥', 'Eyfon', 'eyfon'],
    gender: 'male',
    greetings: [
      '好久不见，昱丰～',
      '昱丰，最近忙什么呢？',
      '丰丰，欢迎回来',
      '嗨，小丰，今天过得怎么样？',
      '丰哥来了！最近有没有什么大动作要告诉我？',
      '昱丰！你来啦～最近忙不忙，有没有好好休息？',
      '小丰同学出现了，快坐下，我们聊聊近况',
      '终于等到你了！我刚好学了个新技能，要展示给你看～',
    ],
  },
]

function matchEasterEggUser(profile) {
  if (!profile) return null

  const nickname = (profile.nickname || '').trim().toLowerCase()
  const gender = profile.gender || ''
  const birthday = profile.birthday || ''
  const mbti = (profile.mbti || '').trim().toUpperCase()
  const bio = (profile.bio || '').toLowerCase()
  const hobbies = (profile.hobbies || '').toLowerCase()

  for (const user of EASTER_EGG_USERS) {
    let score = 0

    if (nickname === user.name.toLowerCase()) {
      score += 100
    }

    for (const nick of user.nicknames) {
      if (nickname === nick.toLowerCase()) {
        score += 80
      }
      if (nickname.includes(nick.toLowerCase()) && nick.length >= 2) {
        score += 40
      }
    }

    if (gender && gender === user.gender) {
      score += 10
    }

    if (bio.includes(user.name.toLowerCase()) || hobbies.includes(user.name.toLowerCase())) {
      score += 50
    }

    for (const nick of user.nicknames) {
      if (bio.includes(nick.toLowerCase()) || hobbies.includes(nick.toLowerCase())) {
        score += 30
      }
    }

    if (score >= 50) {
      return { user, score }
    }
  }

  return null
}

function getEasterEggGreeting(userInfo) {
  if (!userInfo) return ''
  const { user } = userInfo
  const greetings = user.greetings
  const index = Math.floor(Math.random() * greetings.length)
  return greetings[index]
}

export { EASTER_EGG_USERS, matchEasterEggUser, getEasterEggGreeting }

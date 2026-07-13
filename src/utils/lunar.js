// 农历转换工具 - 基于标准天文数据的公历转农历算法
// 数据表为 1900-2100 年的公共领域天文数据

const LUNAR_INFO = [
  0x04bd8,0x04ae0,0x0a570,0x054d5,0x0d260,0x0d950,0x16554,0x056a0,0x09ad0,0x055d2,
  0x04ae0,0x0a5b6,0x0a4d0,0x0d250,0x1d255,0x0b540,0x0d6a0,0x0ada2,0x095b0,0x14977,
  0x04970,0x0a4b0,0x0b4b5,0x06a50,0x06d40,0x1ab54,0x02b60,0x09570,0x052f2,0x04970,
  0x06566,0x0d4a0,0x0ea50,0x06e95,0x05ad0,0x02b60,0x186e3,0x092e0,0x1c8d7,0x0c950,
  0x0d4a0,0x1d8a6,0x0b550,0x056a0,0x1a5b4,0x025d0,0x092d0,0x0d2b2,0x0a950,0x0b557,
  0x06ca0,0x0b550,0x15355,0x04da0,0x0a5b0,0x14573,0x052b0,0x0a9a8,0x0e950,0x06aa0,
  0x0aea6,0x0ab50,0x04b60,0x0aae4,0x0a570,0x05260,0x0f263,0x0d950,0x05b57,0x056a0,
  0x096d0,0x04dd5,0x04ad0,0x0a4d0,0x0d4d4,0x0d250,0x0d558,0x0b540,0x0b6a0,0x195a6,
  0x095b0,0x049b0,0x0a974,0x0a4b0,0x0b27a,0x06a50,0x06d40,0x0af46,0x0ab60,0x09570,
  0x04af5,0x04970,0x064b0,0x074a3,0x0ea50,0x06b58,0x055c0,0x0ab60,0x096d5,0x092e0,
  0x0c960,0x0d954,0x0d4a0,0x0da50,0x07552,0x056a0,0x0abb7,0x025d0,0x092d0,0x0cab5,
  0x0a950,0x0b4a0,0x0baa4,0x0ad50,0x055d9,0x04ba0,0x0a5b0,0x15176,0x052b0,0x0a930,
  0x07954,0x06aa0,0x0ad50,0x05b52,0x04b60,0x0a6e6,0x0a4e0,0x0d260,0x0ea65,0x0d530,
  0x05aa0,0x076a3,0x096d0,0x04afb,0x04ad0,0x0a4d0,0x1d0b6,0x0d250,0x0d520,0x0dd45,
  0x0b5a0,0x056d0,0x055b2,0x049b0,0x0a577,0x0a4b0,0x0aa50,0x1b255,0x06d20,0x0ada0,
  0x14b63,0x09370,0x049f8,0x04970,0x064b0,0x168a6,0x0ea50,0x06b20,0x1a6c4,0x0aae0,
  0x0a2e0,0x0d2e3,0x0c960,0x0d557,0x0d4a0,0x0da50,0x05d55,0x056a0,0x0a6d0,0x055d4,
  0x052d0,0x0a9b8,0x0a950,0x0b4a0,0x0b6a6,0x0ad50,0x055a0,0x0aba4,0x0a5b0,0x052b0,
  0x0b273,0x06930,0x07337,0x06aa0,0x0ad50,0x14b55,0x04b60,0x0a570,0x054e4,0x0d160,
  0x0e968,0x0d520,0x0daa0,0x16aa6,0x056d0,0x04ae0,0x0a9d4,0x0a2d0,0x0d150,0x0f252,
  0x0d520,
]

const LUNAR_MONTHS = ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '冬', '腊']
const LUNAR_DAYS = [
  '初一','初二','初三','初四','初五','初六','初七','初八','初九','初十',
  '十一','十二','十三','十四','十五','十六','十七','十八','十九','二十',
  '廿一','廿二','廿三','廿四','廿五','廿六','廿七','廿八','廿九','三十',
]
const TIAN_GAN = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸']
const DI_ZHI = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥']
const ZODIAC = ['鼠','牛','虎','兔','龙','蛇','马','羊','猴','鸡','狗','猪']

// 农历某年总天数
function lunarYearDays(year) {
  let sum = 348
  for (let i = 0x8000; i > 0x8; i >>= 1) {
    sum += (LUNAR_INFO[year - 1900] & i) ? 1 : 0
  }
  return sum + leapDays(year)
}

// 闰月天数
function leapDays(year) {
  if (leapMonth(year)) {
    return (LUNAR_INFO[year - 1900] & 0x10000) ? 30 : 29
  }
  return 0
}

// 闰月月份
function leapMonth(year) {
  return LUNAR_INFO[year - 1900] & 0xf
}

// 某月天数
function monthDays(year, month) {
  return (LUNAR_INFO[year - 1900] & (0x10000 >> month)) ? 30 : 29
}

// 公历转农历
export function solarToLunar(year, month, day) {
  const baseDate = new Date(1900, 0, 31)
  const objDate = new Date(year, month - 1, day)
  let offset = Math.floor((objDate - baseDate) / 86400000)

  let temp = 0
  let lunarYear, lunarMonth, lunarDay, isLeap = false

  for (lunarYear = 1900; lunarYear < 2101 && offset > 0; lunarYear++) {
    temp = lunarYearDays(lunarYear)
    offset -= temp
  }
  if (offset < 0) {
    offset += temp
    lunarYear--
  }

  const leap = leapMonth(lunarYear)
  isLeap = false

  for (lunarMonth = 1; lunarMonth < 13 && offset >= 0; lunarMonth++) {
    if (leap > 0 && lunarMonth === leap + 1 && !isLeap) {
      --lunarMonth
      isLeap = true
      temp = leapDays(lunarYear)
    } else {
      temp = monthDays(lunarYear, lunarMonth)
    }

    if (isLeap && lunarMonth === leap + 1) isLeap = false

    offset -= temp
  }

  if (offset === 0 && leap > 0 && lunarMonth === leap + 1) {
    if (isLeap) {
      isLeap = false
    } else {
      isLeap = true
      --lunarMonth
    }
  }

  if (offset < 0) {
    offset += temp
    --lunarMonth
  }

  lunarDay = offset + 1

  return {
    year: lunarYear,
    month: lunarMonth,
    day: lunarDay,
    isLeap,
    monthName: (isLeap ? '闰' : '') + LUNAR_MONTHS[lunarMonth - 1],
    dayName: LUNAR_DAYS[lunarDay - 1],
    ganzhi: getGanZhi(lunarYear),
    zodiac: ZODIAC[(lunarYear - 4) % 12],
  }
}

// 天干地支
function getGanZhi(year) {
  const offset = year - 1900 + 36
  return TIAN_GAN[offset % 10] + DI_ZHI[offset % 12]
}

// 农历节日
const LUNAR_FESTIVALS = {
  '1-1': '春节',
  '1-15': '元宵节',
  '5-5': '端午节',
  '7-7': '七夕',
  '7-15': '中元节',
  '8-15': '中秋节',
  '9-9': '重阳节',
  '12-8': '腊八节',
  '12-23': '小年',
}

// 公历节日
const SOLAR_FESTIVALS = {
  '1-1': '元旦',
  '2-14': '情人节',
  '3-8': '妇女节',
  '3-12': '植树节',
  '4-1': '愚人节',
  '5-1': '劳动节',
  '5-4': '青年节',
  '6-1': '儿童节',
  '7-1': '建党节',
  '8-1': '建军节',
  '9-10': '教师节',
  '10-1': '国庆节',
  '12-25': '圣诞节',
}

// 获取某日的节日信息
export function getFestival(year, month, day) {
  const solarKey = `${month}-${day}`
  const solarFestival = SOLAR_FESTIVALS[solarKey]
  if (solarFestival) return solarFestival

  const lunar = solarToLunar(year, month, day)
  const lunarKey = `${lunar.month}-${lunar.day}`
  const lunarFestival = LUNAR_FESTIVALS[lunarKey]
  if (lunarFestival) return lunarFestival

  // 除夕：农历腊月最后一天
  if (lunar.month === 12) {
    const nextDay = new Date(year, month - 1, day + 1)
    const nextLunar = solarToLunar(nextDay.getFullYear(), nextDay.getMonth() + 1, nextDay.getDate())
    if (nextLunar.month === 1 && nextLunar.day === 1) return '除夕'
  }

  return null
}

// 获取某日的农历显示文本（简短）
export function getLunarLabel(year, month, day) {
  const festival = getFestival(year, month, day)
  if (festival) return festival

  const lunar = solarToLunar(year, month, day)
  // 初一显示月份
  if (lunar.day === 1) {
    return lunar.monthName + '月'
  }
  return lunar.dayName
}

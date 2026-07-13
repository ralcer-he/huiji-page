// 数据层边界测试：聚焦数据安全相关的高风险路径
// 覆盖：导入冲突策略、级联删除、日期边界查询、记忆评分算法
import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  db,
  saveRecord,
  getRecordsByDate,
  getRecordsByDateRange,
  importRecords,
  importData,
  exportAllData,
  deleteChatConversation,
  createChatConversation,
  addChatMessage,
  getChatMessages,
  addMemoryEvent,
  searchMemoryEvents,
  markMemoryAccessed,
} from '../database'

// 每个测试前清空所有表，避免相互污染
beforeEach(async () => {
  await db.records.clear()
  await db.settings.clear()
  await db.chatConversations.clear()
  await db.chatMessages.clear()
  await db.memoryEvents.clear()
  await db.letters.clear()
})

// ============ 导入冲突策略 ============
// 风险：选错策略会覆盖或丢失用户真实日记
describe('importRecords 冲突策略', () => {
  it('skip 策略：同日期已有记录时跳过，不覆盖', async () => {
    // 预置一条 7 月 10 日的记录
    await saveRecord({
      id: 'existing_1',
      type: 'diary',
      content: '原有的日记',
      createdAt: '2026-07-10T10:00:00.000Z',
    })

    // 导入同一天的新记录
    const result = await importRecords(
      [
        {
          id: 'incoming_1',
          type: 'diary',
          content: '新导入的日记',
          createdAt: '2026-07-10T15:00:00.000Z',
        },
      ],
      { conflictStrategy: 'skip' }
    )

    expect(result.success).toBe(0)
    expect(result.skipped).toBe(1)
    expect(result.failed).toBe(0)

    // 原记录未被覆盖
    const all = await db.records.toArray()
    expect(all).toHaveLength(1)
    expect(all[0].content).toBe('原有的日记')
  })

  it('overwrite 策略：同日期已有记录时删除旧的再写入', async () => {
    await saveRecord({
      id: 'existing_1',
      type: 'diary',
      content: '原有的日记',
      createdAt: '2026-07-10T10:00:00.000Z',
    })

    const result = await importRecords(
      [
        {
          id: 'incoming_1',
          type: 'diary',
          content: '新导入的日记',
          createdAt: '2026-07-10T15:00:00.000Z',
        },
      ],
      { conflictStrategy: 'overwrite' }
    )

    expect(result.success).toBe(1)
    expect(result.skipped).toBe(0)

    // 旧记录被删除，新记录写入
    const all = await db.records.toArray()
    expect(all).toHaveLength(1)
    expect(all[0].content).toBe('新导入的日记')
  })

  it('不同日期的记录互不干扰', async () => {
    await saveRecord({
      id: 'existing_1',
      type: 'diary',
      content: '7月9日的日记',
      createdAt: '2026-07-09T10:00:00.000Z',
    })

    const result = await importRecords(
      [
        {
          id: 'incoming_1',
          type: 'diary',
          content: '7月10日的日记',
          createdAt: '2026-07-10T15:00:00.000Z',
        },
      ],
      { conflictStrategy: 'skip' }
    )

    expect(result.success).toBe(1)
    expect(result.skipped).toBe(0)
    const all = await db.records.toArray()
    expect(all).toHaveLength(2)
  })

  it('非数组入参抛错', async () => {
    await expect(importRecords(null)).rejects.toThrow('导入数据必须是数组')
    await expect(importRecords({})).rejects.toThrow('导入数据必须是数组')
  })

  it('默认策略为 skip', async () => {
    await saveRecord({
      id: 'existing_1',
      type: 'diary',
      content: '原有的',
      createdAt: '2026-07-10T10:00:00.000Z',
    })

    const result = await importRecords([
      {
        id: 'incoming_1',
        type: 'diary',
        content: '新的',
        createdAt: '2026-07-10T15:00:00.000Z',
      },
    ])
    // 不传 options 时默认 skip
    expect(result.skipped).toBe(1)
  })
})

// ============ 导入导出往返 ============
// 风险：导出后导入数据丢失或损坏
describe('exportAllData + importData 往返', () => {
  it('导出后再导入，数据完整保留', async () => {
    await saveRecord({
      id: 'r1',
      type: 'diary',
      content: '测试日记',
      emotions: ['开心'],
      createdAt: '2026-07-10T10:00:00.000Z',
    })
    await saveRecord({
      id: 'r2',
      type: 'memo',
      content: '测试备忘',
      createdAt: '2026-07-10T11:00:00.000Z',
    })

    const exported = await exportAllData()
    expect(exported.records).toHaveLength(2)
    expect(exported.version).toBe(2)

    // 清空后重新导入
    await db.records.clear()
    await importData(exported)

    const all = await db.records.toArray()
    expect(all).toHaveLength(2)
    expect(all.some(r => r.id === 'r1')).toBe(true)
    expect(all.some(r => r.id === 'r2')).toBe(true)
  })

  it('importData 对无效格式抛错', async () => {
    await expect(importData(null)).rejects.toThrow('无效的导入数据格式')
    await expect(importData('字符串')).rejects.toThrow('无效的导入数据格式')
  })

  it('importData 空数据不报错', async () => {
    await importData({})
    await importData({ records: [], settings: [] })
  })
})

// ============ 级联删除 ============
// 风险：删会话时消息没删干净会留下孤儿数据
describe('deleteChatConversation 级联删除', () => {
  it('删除会话时同时删除其所有消息', async () => {
    const conv = await createChatConversation('assistant', '测试会话')
    await addChatMessage(conv.id, { role: 'user', content: '你好' })
    await addChatMessage(conv.id, { role: 'assistant', content: '你好呀' })
    await addChatMessage(conv.id, { role: 'user', content: '今天天气' })

    // 删除前：1 会话 + 3 消息
    expect(await db.chatConversations.count()).toBe(1)
    expect(await db.chatMessages.count()).toBe(3)

    await deleteChatConversation(conv.id)

    // 删除后：会话和消息都清空
    expect(await db.chatConversations.count()).toBe(0)
    expect(await db.chatMessages.count()).toBe(0)
  })

  it('删除一个会话不影响其他会话及其消息', async () => {
    const conv1 = await createChatConversation('assistant', '会话1')
    const conv2 = await createChatConversation('assistant', '会话2')
    await addChatMessage(conv1.id, { role: 'user', content: 'A1' })
    await addChatMessage(conv2.id, { role: 'user', content: 'B1' })
    await addChatMessage(conv2.id, { role: 'user', content: 'B2' })

    await deleteChatConversation(conv1.id)

    expect(await db.chatConversations.count()).toBe(1)
    expect(await db.chatMessages.count()).toBe(2)
    const remaining = await getChatMessages(conv2.id)
    expect(remaining).toHaveLength(2)
    // 不检查顺序（同毫秒创建时顺序不稳定），只检查内容集合
    expect(remaining.map(m => m.content).sort()).toEqual(['B1', 'B2'])
  })

  it('删除不存在的会话不报错', async () => {
    await expect(deleteChatConversation('不存在的id')).resolves.not.toThrow()
  })
})

// ============ 日期边界查询 ============
// 风险：跨天/跨月查询出错导致日历显示错乱
describe('getRecordsByDate 边界条件', () => {
  it('只返回当天 0:00-23:59:59 的记录', async () => {
    // getRecordsByDate 内部用 setHours(0,0,0,0) 和 setHours(23,59,59,999) 构造本地时间再转 ISO
    // 所以预置数据时也要用本地时间构造，避免 UTC 偏移导致边界错乱
    // 构造 2026-07-10 当天的记录（用本地时间中午，确保落在当天的查询范围内）
    const noonLocal = new Date(2026, 6, 10, 12, 0, 0, 0)
    const prevDayNoon = new Date(2026, 6, 9, 12, 0, 0, 0)
    const nextDayNoon = new Date(2026, 6, 11, 12, 0, 0, 0)

    await saveRecord({
      id: 'r1',
      type: 'diary',
      content: '前一天',
      createdAt: prevDayNoon.toISOString(),
    })
    await saveRecord({
      id: 'r2',
      type: 'diary',
      content: '当天',
      createdAt: noonLocal.toISOString(),
    })
    await saveRecord({
      id: 'r3',
      type: 'diary',
      content: '第二天',
      createdAt: nextDayNoon.toISOString(),
    })

    const records = await getRecordsByDate(new Date(2026, 6, 10, 12, 0, 0, 0))
    const ids = records.map(r => r.id)
    expect(ids).toContain('r2')
    expect(ids).not.toContain('r1')
    expect(ids).not.toContain('r3')
  })

  it('无记录时返回空数组', async () => {
    const records = await getRecordsByDate(new Date('2026-07-10T12:00:00.000Z'))
    expect(records).toEqual([])
  })

  it('返回的 createdAt 是 Date 对象而非字符串', async () => {
    await saveRecord({
      id: 'r1',
      type: 'diary',
      content: '测试',
      createdAt: '2026-07-10T10:00:00.000Z',
    })
    const records = await getRecordsByDate(new Date('2026-07-10T12:00:00.000Z'))
    expect(records.length).toBeGreaterThan(0)
    expect(records[0].createdAt).toBeInstanceOf(Date)
  })
})

describe('getRecordsByDateRange 区间查询', () => {
  it('返回起止日期范围内的记录', async () => {
    await saveRecord({
      id: 'r1',
      type: 'diary',
      content: '7月9日',
      createdAt: '2026-07-09T10:00:00.000Z',
    })
    await saveRecord({
      id: 'r2',
      type: 'diary',
      content: '7月10日',
      createdAt: '2026-07-10T10:00:00.000Z',
    })
    await saveRecord({
      id: 'r3',
      type: 'diary',
      content: '7月15日',
      createdAt: '2026-07-15T10:00:00.000Z',
    })

    const records = await getRecordsByDateRange(
      new Date('2026-07-10T00:00:00.000Z'),
      new Date('2026-07-12T00:00:00.000Z')
    )
    const ids = records.map(r => r.id)
    expect(ids).toContain('r2')
    expect(ids).not.toContain('r1')
    expect(ids).not.toContain('r3')
  })
})

// ============ 记忆评分算法 ============
// 风险：评分算法出错会导致小慧检索到无关记忆，影响对话质量
describe('searchMemoryEvents 评分算法', () => {
  it('无匹配时返回空数组', async () => {
    await addMemoryEvent({
      type: 'chat',
      content: '今天聊了天气',
      keywords: ['天气', '下雨'],
    })
    const results = await searchMemoryEvents(['完全不相关的关键词'])
    expect(results).toEqual([])
  })

  it('精确关键词匹配得分高于子串匹配', async () => {
    await addMemoryEvent({
      type: 'chat',
      content: '内容A',
      keywords: ['咖啡'], // 精确匹配
    })
    await addMemoryEvent({
      type: 'chat',
      content: '内容B',
      keywords: ['咖啡馆'], // 子串匹配
    })

    const results = await searchMemoryEvents(['咖啡'], 5)
    expect(results.length).toBe(2)
    // 精确匹配（3 分）应排在子串匹配（2 分）前面
    expect(results[0].keywords).toContain('咖啡')
    expect(results[0]._score).toBeGreaterThan(results[1]._score)
  })

  it('内容包含关键词也会加分', async () => {
    await addMemoryEvent({
      type: 'chat',
      content: '今天喝了咖啡，心情不错',
      keywords: [], // keywords 为空，只靠内容匹配
    })

    const results = await searchMemoryEvents(['咖啡'], 5)
    expect(results).toHaveLength(1)
    expect(results[0]._score).toBeGreaterThan(0)
  })

  it('accessCount 高的事件得分降低（衰减）', async () => {
    await addMemoryEvent({
      type: 'chat',
      content: '内容',
      keywords: ['音乐'],
      emotionalWeight: 3,
    })
    const event2 = await addMemoryEvent({
      type: 'chat',
      content: '内容',
      keywords: ['音乐'],
      emotionalWeight: 3,
    })
    // 第二个事件被访问多次
    await markMemoryAccessed(event2.id)
    await markMemoryAccessed(event2.id)
    await markMemoryAccessed(event2.id)

    const results = await searchMemoryEvents(['音乐'], 5)
    expect(results).toHaveLength(2)
    // 未被访问的事件得分更高
    const untouched = results.find(r => r.id !== event2.id)
    const accessed = results.find(r => r.id === event2.id)
    expect(untouched._score).toBeGreaterThan(accessed._score)
  })

  it('limit 参数生效', async () => {
    for (let i = 0; i < 10; i++) {
      await addMemoryEvent({
        type: 'chat',
        content: `内容${i}`,
        keywords: ['测试'],
      })
    }
    const results = await searchMemoryEvents(['测试'], 3)
    expect(results).toHaveLength(3)
  })
})

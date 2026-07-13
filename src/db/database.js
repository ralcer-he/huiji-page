import Dexie from 'dexie';

export const db = new Dexie('huiji');

db.version(3).stores({
  records: 'id, type, createdAt, *emotions, *tags',
  settings: 'key',
  chatConversations: 'id, mode, createdAt, updatedAt',
  chatMessages: 'id, conversationId, role, createdAt',
  userProfile: 'key',
  memoryEvents: 'id, type, createdAt, *keywords',
  xiaohuiDiary: 'id, createdAt, trigger',
  letters: 'id, type, direction, status, createdAt, scheduledAt, relatedLetterId',
});

db.version(2).stores({
  records: 'id, type, createdAt, *emotions, *tags',
  settings: 'key',
  chatConversations: 'id, mode, createdAt, updatedAt',
  chatMessages: 'id, conversationId, role, createdAt',
});

db.version(1).stores({
  records: 'id, type, createdAt, *emotions, *tags',
  settings: 'key',
});

export const saveRecord = async (record) => {
  const now = new Date().toISOString();
  const recordToSave = {
    ...record,
    updatedAt: now,
  };
  if (!recordToSave.createdAt) {
    recordToSave.createdAt = now;
  }
  await db.records.put(recordToSave);
  return recordToSave;
};

export const getRecordById = async (id) => {
  const record = await db.records.get(id);
  if (record && record.createdAt) {
    record.createdAt = new Date(record.createdAt);
  }
  if (record && record.updatedAt) {
    record.updatedAt = new Date(record.updatedAt);
  }
  return record;
};

export const deleteRecord = async (id) => {
  await db.records.delete(id);
};

export const getRecordsByDate = async (date) => {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const records = await db.records
    .where('createdAt')
    .between(startOfDay.toISOString(), endOfDay.toISOString())
    .reverse()
    .sortBy('createdAt');

  return records.map(r => ({
    ...r,
    createdAt: new Date(r.createdAt),
    updatedAt: r.updatedAt ? new Date(r.updatedAt) : undefined,
  }));
};

export const getRecordsByType = async (type) => {
  const records = await db.records
    .where('type')
    .equals(type)
    .reverse()
    .sortBy('createdAt');

  return records.map(r => ({
    ...r,
    createdAt: new Date(r.createdAt),
    updatedAt: r.updatedAt ? new Date(r.updatedAt) : undefined,
  }));
};

export const getAllRecords = async () => {
  const records = await db.records
    .orderBy('createdAt')
    .reverse()
    .toArray();

  return records.map(r => ({
    ...r,
    createdAt: new Date(r.createdAt),
    updatedAt: r.updatedAt ? new Date(r.updatedAt) : undefined,
  }));
};

export const searchRecords = async (keyword, emotion) => {
  let records = await getAllRecords();

  if (keyword && keyword.trim()) {
    const kw = keyword.toLowerCase();
    records = records.filter(r =>
      (r.content && r.content.toLowerCase().includes(kw)) ||
      (r.title && r.title.toLowerCase().includes(kw)) ||
      (r.tags && r.tags.some(t => t.toLowerCase().includes(kw)))
    );
  }

  if (emotion && emotion.trim()) {
    records = records.filter(r =>
      r.emotions && r.emotions.includes(emotion)
    );
  }

  return records;
};

export const getRecordsByDateRange = async (startDate, endDate) => {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  const records = await db.records
    .where('createdAt')
    .between(start.toISOString(), end.toISOString())
    .reverse()
    .sortBy('createdAt');

  return records.map(r => ({
    ...r,
    createdAt: new Date(r.createdAt),
    updatedAt: r.updatedAt ? new Date(r.updatedAt) : undefined,
  }));
};

export const exportAllData = async () => {
  const records = await db.records.toArray();
  const settings = await db.settings.toArray();
  const chatConversations = await db.chatConversations.toArray();
  const chatMessages = await db.chatMessages.toArray();
  const userProfile = await db.userProfile.toArray();
  const memoryEvents = await db.memoryEvents.toArray();
  const xiaohuiDiary = await db.xiaohuiDiary.toArray();
  const letters = await db.letters.toArray();
  return {
    records,
    settings,
    chatConversations,
    chatMessages,
    userProfile,
    memoryEvents,
    xiaohuiDiary,
    letters,
    exportedAt: new Date().toISOString(),
    version: 2,
  };
};

export const importData = async (data) => {
  if (!data || typeof data !== 'object') {
    throw new Error('无效的导入数据格式');
  }

  const tables = [
    { key: 'records', table: db.records },
    { key: 'settings', table: db.settings },
    { key: 'chatConversations', table: db.chatConversations },
    { key: 'chatMessages', table: db.chatMessages },
    { key: 'userProfile', table: db.userProfile },
    { key: 'memoryEvents', table: db.memoryEvents },
    { key: 'xiaohuiDiary', table: db.xiaohuiDiary },
    { key: 'letters', table: db.letters },
  ];

  await db.transaction('rw', tables.map(t => t.table), async () => {
    for (const { key, table } of tables) {
      if (data[key] && Array.isArray(data[key])) {
        for (const item of data[key]) {
          await table.put(item);
        }
      }
    }
  });
};

export const importRecords = async (records, options = {}) => {
  const {
    conflictStrategy = 'skip',
  } = options;

  if (!Array.isArray(records)) {
    throw new Error('导入数据必须是数组');
  }

  let success = 0;
  let skipped = 0;
  let failed = 0;

  const getDateStr = (record) => {
    const date = record.createdAt instanceof Date
      ? record.createdAt
      : new Date(record.createdAt);
    return date.toISOString().split('T')[0];
  };

  const existingRecords = await db.records.toArray();
  const existingByDate = {};
  existingRecords.forEach(r => {
    const dateStr = getDateStr(r);
    if (!existingByDate[dateStr]) {
      existingByDate[dateStr] = [];
    }
    existingByDate[dateStr].push(r);
  });

  await db.transaction('rw', db.records, async () => {
    for (const record of records) {
      try {
        const dateStr = getDateStr(record);
        const hasExisting = existingByDate[dateStr]?.length > 0;

        if (hasExisting) {
          if (conflictStrategy === 'skip') {
            skipped++;
            continue;
          }
          if (conflictStrategy === 'overwrite') {
            for (const existing of existingByDate[dateStr]) {
              await db.records.delete(existing.id);
            }
          }
        }

        await db.records.put(record);
        success++;

        if (!existingByDate[dateStr]) {
          existingByDate[dateStr] = [];
        }
        existingByDate[dateStr].push(record);
      } catch (e) {
        console.error('导入单条记录失败:', e);
        failed++;
      }
    }
  });

  return { success, skipped, failed, total: records.length };
};

export const clearAllData = async () => {
  const tableNames = [
    'records',
    'settings',
    'chatConversations',
    'chatMessages',
    'userProfile',
    'memoryEvents',
    'xiaohuiDiary',
    'letters',
  ];

  try {
    await db.transaction('rw', tableNames.map(name => db[name]), async () => {
      for (const name of tableNames) {
        try {
          await db[name].clear();
        } catch (e) {
          console.error(`清空 ${name} 失败:`, e);
        }
      }
    });
  } catch (e) {
    console.error('事务清空失败，逐表回退:', e);
    for (const name of tableNames) {
      try {
        await db[name].clear();
      } catch (e2) {
        console.error(`清空 ${name} 也失败:`, e2);
      }
    }
  }

  try {
    localStorage.clear();
  } catch (e) { console.error('清空 localStorage 失败:', e); }

  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.clear();
    }
  } catch (e) { console.error('清空 sessionStorage 失败:', e); }
};

export const cleanupLegacyData = async () => {
  try {
    const CLEAN_VERSION = 'legacyDataCleaned_v1067';
    const cleanedMarker = await getSetting(CLEAN_VERSION);
    if (!cleanedMarker) {
      const allConversations = await db.chatConversations.toArray();
      const validModes = ['chat', 'fab_assistant'];

      const legacyConvs = allConversations.filter(c => !validModes.includes(c.mode));
      if (legacyConvs.length > 0) {
        console.log(`清理 ${legacyConvs.length} 个旧版本对话`);
        for (const conv of legacyConvs) {
          await db.chatMessages.where('conversationId').equals(conv.id).delete();
          await db.chatConversations.delete(conv.id);
        }
      }

      const remaining = await db.chatConversations.toArray();
      
      for (const mode of validModes) {
        const modeConvs = remaining
          .filter(c => c.mode === mode)
          .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

        if (modeConvs.length > 1) {
          const modeConvDetails = [];
          for (const conv of modeConvs) {
            const msgs = await db.chatMessages.where('conversationId').equals(conv.id).toArray();
            const userMsgCount = msgs.filter(m => m.role === 'user').length;
            modeConvDetails.push({ conv, userMsgCount, totalMsgCount: msgs.length });
          }

          const withUserMsgs = modeConvDetails.filter(c => c.userMsgCount > 0);
          const toKeep = withUserMsgs.length > 0
            ? withUserMsgs[0].conv.id
            : modeConvDetails[0].conv.id;

          const toDelete = modeConvDetails.filter(c => c.conv.id !== toKeep);
          console.log(`清理模式 ${mode}: 删除 ${toDelete.length} 个多余对话，保留 ${toKeep}`);
          for (const item of toDelete) {
            await db.chatMessages.where('conversationId').equals(item.conv.id).delete();
            await db.chatConversations.delete(item.conv.id);
          }
        }
      }

      await saveSetting(CLEAN_VERSION, '1');
    }
  } catch (e) {
    console.error('清理旧数据失败:', e);
  }
};

export const getSetting = async (key) => {
  const setting = await db.settings.get(key);
  return setting ? setting.value : undefined;
};

export const saveSetting = async (key, value) => {
  await db.settings.put({ key, value });
};

export const deleteSetting = async (key) => {
  await db.settings.delete(key);
};

export const getDailyMemos = async () => {
  const setting = await db.settings.get('dailyMemos');
  return setting ? setting.value : [];
};

export const saveDailyMemos = async (memos) => {
  await db.settings.put({ key: 'dailyMemos', value: memos });
};

// ========== 对话历史相关 ==========

export const createChatConversation = async (mode = 'assistant', title = '') => {
  const now = new Date().toISOString();
  const id = `chat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const conversation = {
    id,
    mode,
    title: title || '新对话',
    createdAt: now,
    updatedAt: now,
    messageCount: 0,
  };
  await db.chatConversations.put(conversation);
  return conversation;
};

export const getOrCreateChatConversation = async (mode = 'chat') => {
  const existing = await db.chatConversations
    .where('mode').equals(mode)
    .reverse()
    .sortBy('updatedAt');
  
  if (existing && existing.length > 0) {
    return existing[0];
  }
  
  return await createChatConversation(mode);
};

export const getChatConversations = async (mode = null, limit = 50) => {
  let all;
  if (mode) {
    all = await db.chatConversations.where('mode').equals(mode).toArray();
  } else {
    all = await db.chatConversations.toArray();
  }
  all.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  return all.slice(0, limit);
};

export const getChatConversation = async (id) => {
  return await db.chatConversations.get(id);
};

export const updateChatConversation = async (id, updates) => {
  const conversation = await db.chatConversations.get(id);
  if (!conversation) return null;
  const updated = {
    ...conversation,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  await db.chatConversations.put(updated);
  return updated;
};

export const deleteChatConversation = async (id) => {
  await db.transaction('rw', db.chatConversations, db.chatMessages, async () => {
    await db.chatMessages.where('conversationId').equals(id).delete();
    await db.chatConversations.delete(id);
  });
};

export const addChatMessage = async (conversationId, message) => {
  const now = new Date().toISOString();
  const msg = {
    id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    conversationId,
    ...message,
    createdAt: now,
  };
  await db.chatMessages.put(msg);
  await db.chatConversations.update(conversationId, { 
    updatedAt: now,
    messageCount: (await db.chatMessages.where('conversationId').equals(conversationId).count())
  });
  return msg;
};

export const getChatMessages = async (conversationId) => {
  const messages = await db.chatMessages
    .where('conversationId')
    .equals(conversationId)
    .sortBy('createdAt');
  return messages;
};

// ========== 用户画像相关 ==========

export const getUserProfile = async () => {
  const profile = await db.userProfile.get('main')
  return profile || {
    key: 'main',
    preferences: { music: [], anime: [], topics: [], communicationStyle: '' },
    personality: { optimism: 0.5, expressiveness: 0.5, emotionalTendency: 'neutral' },
    milestones: [],
    updatedAt: new Date().toISOString(),
  }
}

export const saveUserProfile = async (updates) => {
  const current = await getUserProfile()
  const updated = {
    ...current,
    ...updates,
    key: 'main',
    updatedAt: new Date().toISOString(),
  }
  await db.userProfile.put(updated)
  return updated
}

// ========== 记忆事件相关 ==========

export const addMemoryEvent = async (event) => {
  const id = `mem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const record = {
    id,
    emotionalWeight: 3,
    accessCount: 0,
    lastAccessedAt: null,
    createdAt: new Date().toISOString(),
    ...event,
  }
  await db.memoryEvents.put(record)
  return record
}

export const searchMemoryEvents = async (queryKeywords, limit = 5) => {
  const allEvents = await db.memoryEvents.orderBy('createdAt').reverse().toArray()

  const scored = allEvents.map(event => {
    let kwScore = 0
    for (const kw of queryKeywords) {
      // 精确匹配关键词
      if (event.keywords?.includes(kw)) {
        kwScore += 3
      } else if (event.keywords?.some(k => k.includes(kw) || kw.includes(k))) {
        // 子串双向匹配（粗粒度关键词与细粒度关键词互通）
        kwScore += 2
      }
      // 内容包含关键词
      if (event.content?.includes(kw)) kwScore += 2
    }
    // 只有关键词有匹配时，emotionalWeight 才作为加权，避免无关记忆被返回
    let score = kwScore
    if (kwScore > 0) {
      score += (event.emotionalWeight || 3) * 0.5
    }
    if (event.accessCount > 0) score -= event.accessCount * 0.3
    return { ...event, _score: score }
  })

  return scored
    .filter(e => e._score > 0)
    .sort((a, b) => b._score - a._score)
    .slice(0, limit)
}

export const markMemoryAccessed = async (id) => {
  const event = await db.memoryEvents.get(id)
  if (event) {
    await db.memoryEvents.update(id, {
      accessCount: (event.accessCount || 0) + 1,
      lastAccessedAt: new Date().toISOString(),
    })
  }
}

export const getRecentMemoryEvents = async (limit = 10) => {
  return await db.memoryEvents
    .orderBy('createdAt')
    .reverse()
    .limit(limit)
    .toArray()
}

// ========== 小慧日记相关 ==========

export const addXiaohuiDiary = async (entry) => {
  const id = `diary_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const record = {
    id,
    createdAt: new Date().toISOString(),
    ...entry,
  }
  await db.xiaohuiDiary.put(record)
  return record
}

export const getXiaohuiDiaries = async (limit = 50) => {
  return await db.xiaohuiDiary
    .orderBy('createdAt')
    .reverse()
    .limit(limit)
    .toArray()
}

export const getXiaohuiDiariesByTrigger = async (trigger) => {
  return await db.xiaohuiDiary
    .where('trigger')
    .equals(trigger)
    .reverse()
    .sortBy('createdAt')
}

// ========== 书信相关 ==========

export const addLetter = async (letter) => {
  const id = `letter_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const record = {
    id,
    type: 'user_to_xiaohui',
    direction: 'outbox',
    status: 'sent',
    subject: '',
    content: '',
    createdAt: new Date().toISOString(),
    scheduledAt: null,
    relatedLetterId: null,
    trigger: null,
    metadata: {},
    ...letter,
  }
  await db.letters.put(record)
  return record
}

export const getLetters = async (filters = {}, limit = 50) => {
  let query = db.letters.orderBy('createdAt').reverse()
  if (filters.type) {
    query = query.filter(l => l.type === filters.type)
  }
  if (filters.direction) {
    query = query.filter(l => l.direction === filters.direction)
  }
  if (filters.status) {
    query = query.filter(l => l.status === filters.status)
  }
  const results = await query.limit(limit).toArray()
  return results
}

export const getLetterById = async (id) => {
  return await db.letters.get(id)
}

export const updateLetter = async (id, updates) => {
  const letter = await db.letters.get(id)
  if (!letter) return null
  const updated = { ...letter, ...updates }
  await db.letters.put(updated)
  return updated
}

export const markLetterRead = async (id) => {
  return updateLetter(id, { status: 'read' })
}

export const deleteLetter = async (id) => {
  await db.letters.delete(id)
}

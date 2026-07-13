import { useState, useEffect } from 'react'
import { getSetting } from '../db/database'
import { DEFAULT_WORDCLOUD_THRESHOLDS, DEFAULT_WRITE_PAGE_TYPES, DEFAULT_CALENDAR_MODE, DEFAULT_DOMINANT_EMOTION_PERIOD } from '../constants/defaults'

export function useWordCloudThresholds() {
  const [thresholds, setThresholds] = useState(DEFAULT_WORDCLOUD_THRESHOLDS)

  useEffect(() => {
    const load = async () => {
      const saved = await getSetting('wordCloudThresholds')
      if (saved) {
        setThresholds({ ...DEFAULT_WORDCLOUD_THRESHOLDS, ...saved })
      }
    }
    load()

    const handleChange = (e) => {
      if (e.detail) setThresholds(e.detail)
    }
    window.addEventListener('wordcloud-threshold-changed', handleChange)
    return () => window.removeEventListener('wordcloud-threshold-changed', handleChange)
  }, [])

  return thresholds
}

export function useWritePageTypes() {
  const [types, setTypes] = useState(DEFAULT_WRITE_PAGE_TYPES)

  useEffect(() => {
    const load = async () => {
      const saved = await getSetting('writePageTypes')
      if (saved && Array.isArray(saved) && saved.length > 0) {
        const validIds = ['note', 'mood', 'memo', 'diary']
        const filtered = saved.filter(id => validIds.includes(id))
        if (filtered.length > 0) {
          setTypes(filtered)
        }
      }
    }
    load()

    const handleChange = (e) => {
      if (Array.isArray(e.detail) && e.detail.length > 0) {
        setTypes(e.detail)
      }
    }
    window.addEventListener('writepage-types-changed', handleChange)
    return () => window.removeEventListener('writepage-types-changed', handleChange)
  }, [])

  return types
}

export function useCalendarMode() {
  const [mode, setMode] = useState(DEFAULT_CALENDAR_MODE)

  useEffect(() => {
    const load = async () => {
      const saved = await getSetting('calendarMode')
      if (saved === 'simple' || saved === 'detailed') {
        setMode(saved)
      }
    }
    load()

    const handleChange = (e) => {
      if (e.detail) setMode(e.detail)
    }
    window.addEventListener('calendar-mode-changed', handleChange)
    return () => window.removeEventListener('calendar-mode-changed', handleChange)
  }, [])

  return mode
}

export function useDominantEmotionPeriod() {
  const [period, setPeriod] = useState(DEFAULT_DOMINANT_EMOTION_PERIOD)

  useEffect(() => {
    const load = async () => {
      const saved = await getSetting('dominantEmotionPeriod')
      if (['week', 'month', 'year', 'all'].includes(saved)) {
        setPeriod(saved)
      }
    }
    load()

    const handleChange = (e) => {
      if (e.detail) setPeriod(e.detail)
    }
    window.addEventListener('dominant-emotion-period-changed', handleChange)
    return () => window.removeEventListener('dominant-emotion-period-changed', handleChange)
  }, [])

  return period
}

import { Capacitor } from '@capacitor/core'

export function isMobileDevice() {
  if (typeof window === 'undefined') return false

  if (Capacitor.isNativePlatform()) {
    return true
  }

  const ua = navigator.userAgent || navigator.vendor || window.opera || ''

  const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile/i

  if (mobileRegex.test(ua)) {
    return true
  }

  if ('ontouchstart' in window && window.innerWidth < 1024) {
    return true
  }

  return false
}

export function isCapacitorApp() {
  return !!(window.Capacitor || window.webkit?.messageHandlers?.bridge)
}

export function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream
}

export function isAndroid() {
  return /android/i.test(navigator.userAgent)
}

export function getAssetUrl(path) {
  if (!path) return path
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path
  }
  const base = import.meta.env.BASE_URL || '/'
  if (path.startsWith('/')) {
    return base + path.slice(1)
  }
  return base + path
}

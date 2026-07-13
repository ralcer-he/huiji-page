import { useState, useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { Keyboard } from '@capacitor/keyboard'

export function useKeyboardHeight() {
  const [keyboardHeight, setKeyboardHeight] = useState(0)
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false)

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    let willShowListener, willHideListener, didShowListener, didHideListener

    const handleShow = (info) => {
      const height = info?.keyboardHeight || 0
      setKeyboardHeight(height)
      setIsKeyboardVisible(true)
    }

    const handleHide = () => {
      setKeyboardHeight(0)
      setIsKeyboardVisible(false)
    }

    Keyboard.addListener('keyboardWillShow', handleShow).then(h => { willShowListener = h })
    Keyboard.addListener('keyboardDidShow', handleShow).then(h => { didShowListener = h })
    Keyboard.addListener('keyboardWillHide', handleHide).then(h => { willHideListener = h })
    Keyboard.addListener('keyboardDidHide', handleHide).then(h => { didHideListener = h })

    return () => {
      willShowListener?.remove()
      willHideListener?.remove()
      didShowListener?.remove()
      didHideListener?.remove()
    }
  }, [])

  return { keyboardHeight, isKeyboardVisible }
}

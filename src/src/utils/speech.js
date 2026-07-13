export function isSpeechSupported() {
  return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window
}

/**
 * 请求麦克风权限（Capacitor Android WebView 中 Web Speech API 不会自动弹出权限请求）
 * 通过 getUserMedia 触发系统权限弹窗，成功后释放流并返回 true
 */
export async function requestMicPermission() {
  try {
    if (!navigator.mediaDevices?.getUserMedia) return true
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    stream.getTracks().forEach(t => t.stop())
    return true
  } catch (e) {
    console.error('麦克风权限请求失败:', e)
    return false
  }
}

export function createSpeechRecognizer(onResult, onError, onEnd) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
  
  if (!SpeechRecognition) {
    return null
  }

  const recognizer = new SpeechRecognition()
  
  recognizer.lang = 'zh-CN'
  recognizer.continuous = true
  recognizer.interimResults = true
  recognizer.maxAlternatives = 1

  recognizer.onresult = (event) => {
    let finalTranscript = ''
    let interimTranscript = ''
    
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript
      if (event.results[i].isFinal) {
        finalTranscript += transcript
      } else {
        interimTranscript += transcript
      }
    }
    
    if (onResult) {
      onResult(finalTranscript, interimTranscript)
    }
  }

  recognizer.onerror = (event) => {
    console.error('语音识别错误:', event.error)
    if (onError) {
      onError(event.error)
    }
  }

  recognizer.onend = () => {
    if (onEnd) {
      onEnd()
    }
  }

  return recognizer
}
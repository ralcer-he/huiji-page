/**
 * 跨平台文件保存/分享工具。
 * - Capacitor 原生环境：写入缓存目录后调用 Share 插件
 * - Web / PWA 环境：Blob + <a> download 降级
 */
import { Capacitor } from '@capacitor/core'

/**
 * 保存文件内容到设备。
 *
 * @param {string} content    - 文件内容（字符串）
 * @param {string} fileName   - 文件名，如 'backup.json'
 * @param {string} mimeType   - MIME 类型，如 'application/json'
 * @param {object} [opts]
 * @param {string} [opts.title] - 分享对话框标题（仅原生环境）
 */
export async function saveOrShareFile(content, fileName, mimeType, opts = {}) {
  if (Capacitor.isNativePlatform()) {
    try {
      const { Filesystem, Directory } = await import('@capacitor/filesystem')
      // 写入缓存目录
      const path = fileName
      await Filesystem.writeFile({
        path,
        data: typeof content === 'string'
          ? btoa(unescape(encodeURIComponent(content)))
          : content,
        directory: Directory.Cache,
        encoding: 'base64',
      })

      const { Share } = await import('@capacitor/share')
      const { uri } = await Filesystem.getUri({
        directory: Directory.Cache,
        path,
      })
      await Share.share({
        title: opts.title || fileName,
        url: uri,
        dialogTitle: opts.title || '保存文件',
      })
      return
    } catch (err) {
      // Share 被取消或失败时静默降级到 Web 方式
      console.warn('Capacitor 分享失败，降级到浏览器下载:', err)
    }
  }

  // Web / PWA 降级：Blob + <a> download
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * 保存 Base64 data URL 到设备（用于图片下载）。
 *
 * @param {string} dataUrl    - base64 data URL，如 'data:image/png;base64,...'
 * @param {string} fileName   - 文件名
 * @param {object} [opts]
 */
export async function saveOrShareDataUrl(dataUrl, fileName, opts = {}) {
  if (Capacitor.isNativePlatform()) {
    try {
      const { Filesystem, Directory } = await import('@capacitor/filesystem')
      // 提取纯 base64 部分
      const base64 = dataUrl.split(',')[1] || dataUrl
      await Filesystem.writeFile({
        path: fileName,
        data: base64,
        directory: Directory.Cache,
        encoding: 'base64',
      })
      const { Share } = await import('@capacitor/share')
      const { uri } = await Filesystem.getUri({
        directory: Directory.Cache,
        path: fileName,
      })
      await Share.share({
        title: opts.title || fileName,
        url: uri,
        dialogTitle: opts.title || '保存图片',
      })
      return
    } catch (err) {
      console.warn('Capacitor 分享失败，降级到浏览器下载:', err)
    }
  }

  // Web 降级
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

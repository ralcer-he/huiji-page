/**
 * 客户端图片压缩：将图片缩放到指定最大边长以内，并转为 JPEG 格式以减小体积。
 * 返回压缩后的 base64 data URL。
 *
 * @param {string} dataUrl - 原始图片的 base64 data URL
 * @param {number} maxSide - 最长边像素上限（默认 2048）
 * @param {number} quality - JPEG 压缩质量（0-1，默认 0.85）
 * @returns {Promise<string>} 压缩后的 data URL
 */
export function compressImage(dataUrl, maxSide = 2048, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      let { width, height } = img
      // 等比缩放
      if (width > maxSide || height > maxSide) {
        if (width > height) {
          height = Math.round((height / width) * maxSide)
          width = maxSide
        } else {
          width = Math.round((width / height) * maxSide)
          height = maxSide
        }
      }
      // 如果尺寸没变化且原始就是 JPEG，直接返回
      if (width === img.naturalWidth && height === img.naturalHeight) {
        resolve(dataUrl)
        return
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, width, height)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.onerror = () => reject(new Error('图片加载失败'))
    img.src = dataUrl
  })
}

import Image from '@tiptap/extension-image'

/**
 * 可编辑图片扩展
 *
 * 在 TipTap 默认 Image 基础上增加三个 data-* 属性，用于支持"点击图片再次编辑"：
 * - data-source: 'upload' | 'drawing'，标识图片来源
 * - data-original: 上传图片的原始 base64（用作编辑时的不可擦背景层）
 *                  对于绘画作品，此属性为空
 * - data-drawing: 绘画层 base64（透明背景的笔迹图）
 *                 对于上传图片，初始为空；用户在上面做笔记后会有内容
 *                 对于绘画作品，这是绘画笔迹本身（不含白底）
 *
 * 编辑时的载入策略：
 * - 上传图片：initialImage = data-original，initialDrawing = data-drawing
 * - 绘画作品：initialImage = null（画板内部白底），initialDrawing = data-drawing
 * - 旧图片（无 data-* 属性）：视为上传图片，original = src，drawing = null
 */
export const EditableImage = Image.extend({
  addOptions() {
    return {
      ...this.parent?.(),
      allowBase64: true,
    }
  },
  addAttributes() {
    return {
      ...this.parent?.(),
      'data-source': {
        default: 'upload',
        parseHTML: (element) => element.getAttribute('data-source') || 'upload',
        renderHTML: (attributes) => {
          if (!attributes['data-source']) return {}
          return { 'data-source': attributes['data-source'] }
        },
      },
      'data-original': {
        default: null,
        parseHTML: (element) => element.getAttribute('data-original') || null,
        renderHTML: (attributes) => {
          if (!attributes['data-original']) return {}
          return { 'data-original': attributes['data-original'] }
        },
      },
      'data-drawing': {
        default: null,
        parseHTML: (element) => element.getAttribute('data-drawing') || null,
        renderHTML: (attributes) => {
          if (!attributes['data-drawing']) return {}
          return { 'data-drawing': attributes['data-drawing'] }
        },
      },
    }
  },
})

export default EditableImage

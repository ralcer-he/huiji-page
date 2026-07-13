import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Icon from '../ui/Icon'

// 预设颜色（12种常用颜色）
const PRESET_COLORS = [
  '#1a1a2e', // 黑色
  '#6b7280', // 灰色
  '#92400e', // 棕色
  '#ef4444', // 红色
  '#f59e0b', // 橙色
  '#fbbf24', // 黄色
  '#22c55e', // 绿色
  '#3b82f6', // 蓝色
  '#8b5cf6', // 紫色
  '#ec4899', // 粉色
  '#ffffff', // 白色
  '#5DADE2', // 天蓝色
]

// 笔刷类型定义
const BRUSH_TYPES = [
  { id: 'pencil', name: '铅笔', icon: 'edit-3' },
  { id: 'pen', name: '钢笔', icon: 'pen' },
  { id: 'brush', name: '毛笔', icon: 'brush' },
  { id: 'watercolor', name: '水彩', icon: 'droplet' },
  { id: 'crayon', name: '蜡笔', icon: 'highlighter' },
  { id: 'spray', name: '喷漆', icon: 'spray' },
  { id: 'bucket', name: '油漆桶', icon: 'bucket' },
]

const BRUSH_SIZES = [2, 4, 8, 12]

// localStorage key for custom colors
const CUSTOM_COLORS_KEY = 'huiji-drawing-custom-colors'

// 颜色辅助函数
const hexToRgb = (hex) => {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return [r, g, b]
}

const colorsEqual = (r1, g1, b1, a1, r2, g2, b2, a2, tolerance = 0) => {
  return (
    Math.abs(r1 - r2) <= tolerance &&
    Math.abs(g1 - g2) <= tolerance &&
    Math.abs(b1 - b2) <= tolerance &&
    Math.abs(a1 - a2) <= tolerance
  )
}

// 扫描线 Flood Fill 算法（含形态学膨胀 + 8邻域抗锯齿）
const floodFill = (ctx, x, y, fillColor, tolerance = 80) => {
  const canvas = ctx.canvas
  const w = canvas.width
  const h = canvas.height
  x = Math.floor(x)
  y = Math.floor(y)
  if (x < 0 || x >= w || y < 0 || y >= h) return

  const imageData = ctx.getImageData(0, 0, w, h)
  const d = imageData.data
  const startIdx = (y * w + x) * 4
  const sr = d[startIdx], sg = d[startIdx + 1], sb = d[startIdx + 2], sa = d[startIdx + 3]

  const [fr, fg, fb] = hexToRgb(fillColor)

  if (colorsEqual(sr, sg, sb, sa, fr, fg, fb, 255, tolerance)) return

  // mask: 0=未填充 1=已填充区域
  const mask = new Uint8Array(w * h)

  const match = (px, py) => {
    if (px < 0 || px >= w || py < 0 || py >= h) return false
    const idx = py * w + px
    if (mask[idx]) return false // 已处理过，防止重复入栈
    const i = idx * 4
    return colorsEqual(d[i], d[i + 1], d[i + 2], d[i + 3], sr, sg, sb, sa, tolerance)
  }

  const stack = [x, y]

  while (stack.length) {
    const cy = stack.pop()
    const cx = stack.pop()

    let y1 = cy
    while (y1 >= 0 && match(cx, y1)) y1--
    y1++

    let left = false, right = false
    while (y1 < h && match(cx, y1)) {
      mask[y1 * w + cx] = 1

      if (!left && cx > 0 && match(cx - 1, y1)) {
        stack.push(cx - 1, y1)
        left = true
      } else if (left && cx > 0 && !match(cx - 1, y1)) {
        left = false
      }

      if (!right && cx < w - 1 && match(cx + 1, y1)) {
        stack.push(cx + 1, y1)
        right = true
      } else if (right && cx < w - 1 && !match(cx + 1, y1)) {
        right = false
      }
      y1++
    }
  }

  // 形态学膨胀（1次）：填补边缘小缺口
  const dilated = new Uint8Array(w * h)
  for (let py = 1; py < h - 1; py++) {
    for (let px = 1; px < w - 1; px++) {
      const idx = py * w + px
      if (mask[idx]) {
        dilated[idx] = 1
        continue
      }
      // 8邻域检查
      if (
        mask[idx - w - 1] || mask[idx - w] || mask[idx - w + 1] ||
        mask[idx - 1] || mask[idx + 1] ||
        mask[idx + w - 1] || mask[idx + w] || mask[idx + w + 1]
      ) {
        dilated[idx] = 1
      }
    }
  }

  // 膨胀后再做一次收缩方向的抗锯齿：基于到原mask的距离计算alpha
  const temp = new Uint8ClampedArray(d)
  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const idx = py * w + px
      if (mask[idx]) {
        // 原填充区域：完全覆盖
        const i = idx * 4
        temp[i] = fr
        temp[i + 1] = fg
        temp[i + 2] = fb
        temp[i + 3] = 255
      } else if (dilated[idx]) {
        // 膨胀区域：计算与原边界的距离，做平滑过渡
        // 查找最近的原mask像素距离（简化：检查4邻域中有多少原mask像素）
        let count = 0
        if (py > 0 && mask[idx - w]) count++
        if (py < h - 1 && mask[idx + w]) count++
        if (px > 0 && mask[idx - 1]) count++
        if (px < w - 1 && mask[idx + 1]) count++
        // 8邻域角点权重稍低
        let diagCount = 0
        if (py > 0 && px > 0 && mask[idx - w - 1]) diagCount++
        if (py > 0 && px < w - 1 && mask[idx - w + 1]) diagCount++
        if (py < h - 1 && px > 0 && mask[idx + w - 1]) diagCount++
        if (py < h - 1 && px < w - 1 && mask[idx + w + 1]) diagCount++
        const alpha = Math.min(1, (count * 0.25 + diagCount * 0.15))
        const i = idx * 4
        const r = d[i], g = d[i + 1], b = d[i + 2]
        temp[i] = Math.round(r * (1 - alpha) + fr * alpha)
        temp[i + 1] = Math.round(g * (1 - alpha) + fg * alpha)
        temp[i + 2] = Math.round(b * (1 - alpha) + fb * alpha)
        temp[i + 3] = 255
      }
    }
  }

  // 写回
  for (let i = 0; i < d.length; i++) d[i] = temp[i]
  ctx.putImageData(imageData, 0, 0)
}

// 基于种子生成确定性伪随机数（用于重绘时保持蜡笔/喷漆效果一致）
const createRng = (seed) => {
  let s = seed || 1
  return () => {
    s = (s * 16807 + 0) % 2147483647
    return (s - 1) / 2147483646
  }
}

// 将 SVG 转为 base64 data URL（比 %xx 编码更稳定，浏览器兼容性更好）
const svgToBase64DataUrl = (svgString) => {
  // 浏览器环境用 btoa，Node 环境兜底（实际运行时都在浏览器）
  if (typeof btoa === 'function') {
    return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)))
  }
  return 'data:image/svg+xml,' + encodeURIComponent(svgString)
}

// 基于 ICON_PATHS 生成统一的光标 SVG（确保工具栏按钮和光标图标一致）
const makeCursorSvg = (pathD, strokeColor = '#5DADE2', strokeWidth = 2) => {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">${pathD}</svg>`
}

// 铅笔光标 - 热点在笔尖 (3, 22)
const PENCIL_CURSOR_SVG = makeCursorSvg(
  '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/>'
)

// 钢笔光标 - 热点在笔尖 (3, 22)
const PEN_CURSOR_SVG = makeCursorSvg(
  '<path d="M15.232 5.232l3.536 3.536"/><path d="M13.196 3.196a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L13.196 3.196z"/>'
)

// 毛笔光标 - 热点在笔锋 (3, 22)
const BRUSH_CURSOR_SVG = makeCursorSvg(
  '<path d="M20 4l2 2-10 10-4-4L20 4z"/><path d="M13 11L7 17l-2 4 4-2 6-8z"/>'
)

// 水彩光标（水滴）- 热点在底部 (12, 22)
const WATERCOLOR_CURSOR_SVG = makeCursorSvg(
  '<path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>'
)

// 蜡笔光标（荧光笔）- 热点在笔尖 (3, 22)
const CRAYON_CURSOR_SVG = makeCursorSvg(
  '<path d="M9 11l-6 6v3h9l3-3"/><path d="M16 5l4 4"/><path d="M5 16l8-8 4 4-8 8z"/>'
)

// 喷漆光标（喷漆瓶）- 热点在喷嘴中心 (12, 2)
const SPRAY_CURSOR_SVG = makeCursorSvg(
  '<path d="M10 3h4v3h-4V3z"/><path d="M8 6h8l2 3v11l-10 2V9l2-3z"/><path d="M9 9v11"/><path d="M15 9v11"/><path d="M18 11h2"/><path d="M20 12l1 1"/><path d="M21 13l-1 1"/><path d="M20 15l-2-1"/>'
)

// 油漆桶光标 - 热点在桶口中心 (12, 2)
const BUCKET_CURSOR_SVG = makeCursorSvg(
  '<path d="M4 9h16l-1.5 12h-13L4 9z"/><path d="M6 9a6 6 0 0 1 12 0"/>'
)

// 橡皮光标 - 热点在橡皮底部中心 (12, 16)
const ERASER_CURSOR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#FFA07A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5.5 17.5l8-8 4 4-8 8h-4v-4z"/><path d="M13.5 9.5l4-4a1.414 1.414 0 012 0l2 2a1.414 1.414 0 010 2l-4 4"/></svg>`

// 删线光标（垃圾桶）- 热点在桶口 (12, 5)
const DELETE_CURSOR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M15 7V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3"/><path d="M4 7h16"/></svg>`

let _cursorCache = {}

// 根据笔刷类型获取光标
const getCursorForBrush = (brushType) => {
  const key = `brush-${brushType}`
  if (!_cursorCache[key]) {
    const svgMap = {
      pencil: PENCIL_CURSOR_SVG,
      pen: PEN_CURSOR_SVG,
      brush: BRUSH_CURSOR_SVG,
      watercolor: WATERCOLOR_CURSOR_SVG,
      crayon: CRAYON_CURSOR_SVG,
      spray: SPRAY_CURSOR_SVG,
      bucket: BUCKET_CURSOR_SVG,
    }
    const hotspotMap = {
      pencil: '3 22',
      pen: '3 22',
      brush: '3 22',
      watercolor: '12 22',
      crayon: '3 22',
      spray: '12 2',
      bucket: '12 2',
    }
    const svg = svgMap[brushType] || PENCIL_CURSOR_SVG
    const hotspot = hotspotMap[brushType] || '3 22'
    _cursorCache[key] = `url("${svgToBase64DataUrl(svg)}") ${hotspot}, crosshair`
  }
  return _cursorCache[key]
}

const getEraserCursor = () => {
  if (!_cursorCache['eraser']) _cursorCache['eraser'] = `url("${svgToBase64DataUrl(ERASER_CURSOR_SVG)}") 12 16, cell`
  return _cursorCache['eraser']
}

const getDeleteCursor = () => {
  if (!_cursorCache['delete']) _cursorCache['delete'] = `url("${svgToBase64DataUrl(DELETE_CURSOR_SVG)}") 12 5, pointer`
  return _cursorCache['delete']
}

/**
 * 画板组件
 */
export default function DrawingBoard({ onSave, onCancel, initialImage, initialDrawing }) {
  const bgCanvasRef = useRef(null)
  const drawCanvasRef = useRef(null)
  const initialDrawingImgRef = useRef(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [color, setColor] = useState(PRESET_COLORS[0])
  const [brushSize, setBrushSize] = useState(BRUSH_SIZES[1])
  const [brushType, setBrushType] = useState('pencil') // pencil | pen | brush | watercolor | crayon | spray | bucket
  const [toolMode, setToolMode] = useState('draw') // draw | eraser | delete
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 })
  const [lastTime, setLastTime] = useState(0)
  const [hasContent, setHasContent] = useState(false)
  const [bgReady, setBgReady] = useState(false)
  const [customColors, setCustomColors] = useState([])
  const [showColorPicker, setShowColorPicker] = useState(false)
  const colorPickerRef = useRef(null)
  const longPressTimerRef = useRef(null)
  const velocityRef = useRef({ lastTime: 0, lastPos: { x: 0, y: 0 } })

  // 路径数组：每条线独立存储，支持"删除线条"识别
  // 每条路径：{ id, points: [{x,y}], color, size, brushType, velocities?: [{v}] }
  const [strokes, setStrokes] = useState([])
  const currentStrokeRef = useRef(null)
  const strokesRef = useRef([])

  // 撤销/重做
  const undoStackRef = useRef([])
  const redoStackRef = useRef([])
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  const pushUndo = (prevStrokes) => {
    undoStackRef.current.push(JSON.parse(JSON.stringify(prevStrokes)))
    redoStackRef.current = []
    setCanUndo(true)
    setCanRedo(false)
    if (undoStackRef.current.length > 50) undoStackRef.current.shift()
  }

  const handleUndo = () => {
    if (undoStackRef.current.length === 0) return
    const prev = undoStackRef.current.pop()
    redoStackRef.current.push(JSON.parse(JSON.stringify(strokesRef.current)))
    strokesRef.current = prev
    setStrokes(prev)
    redrawStrokes(prev)
    setCanUndo(undoStackRef.current.length > 0)
    setCanRedo(true)
    setHasContent(prev.length > 0 || !!initialImage || !!initialDrawing)
  }

  const handleRedo = () => {
    if (redoStackRef.current.length === 0) return
    const next = redoStackRef.current.pop()
    undoStackRef.current.push(JSON.parse(JSON.stringify(strokesRef.current)))
    strokesRef.current = next
    setStrokes(next)
    redrawStrokes(next)
    setCanRedo(redoStackRef.current.length > 0)
    setCanUndo(true)
    setHasContent(next.length > 0 || !!initialImage || !!initialDrawing)
  }

  // 加载自定义颜色
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CUSTOM_COLORS_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length <= 3) {
          setCustomColors(parsed)
        }
      }
    } catch (e) {
      console.warn('加载自定义颜色失败', e)
    }
  }, [])

  // 保存自定义颜色
  const saveCustomColor = (newColor) => {
    const updated = [...customColors, newColor].slice(-3)
    setCustomColors(updated)
    localStorage.setItem(CUSTOM_COLORS_KEY, JSON.stringify(updated))
    setColor(newColor)
  }

  // 删除自定义颜色
  const deleteCustomColor = (c) => {
    const updated = customColors.filter(cc => cc !== c)
    setCustomColors(updated)
    localStorage.setItem(CUSTOM_COLORS_KEY, JSON.stringify(updated))
    if (color === c) setColor(PRESET_COLORS[0])
  }

  // 长按删除自定义颜色
  const startLongPress = (c) => {
    if (toolMode !== 'draw') return
    longPressTimerRef.current = setTimeout(() => {
      if (window.confirm(`要删除自定义颜色 ${c} 吗？`)) {
        deleteCustomColor(c)
      }
    }, 600)
  }

  const cancelLongPress = () => {
    clearTimeout(longPressTimerRef.current)
  }

  const isEditMode = !!(initialImage || initialDrawing)
  const editMode = initialImage ? 'annotate' : (initialDrawing ? 'drawing' : null)

  // 根据笔刷类型绘制单条线
  const drawStrokeByType = (ctx, stroke) => {
    if (!stroke.points || stroke.points.length < 1) return
    const { brushType = 'pencil', color, size, points, velocities } = stroke

    ctx.globalCompositeOperation = 'source-over'

    switch (brushType) {
      case 'pencil':
        // 铅笔：锐利边缘，轻微抖动（模拟铅笔质感）
        ctx.strokeStyle = color
        ctx.lineWidth = size * 1.2
        ctx.lineCap = 'square'
        ctx.lineJoin = 'miter'
        for (let i = 0; i < points.length; i++) {
          const jitterX = (Math.random() - 0.5) * size * 0.4
          const jitterY = (Math.random() - 0.5) * size * 0.4
          if (i === 0) {
            ctx.beginPath()
            ctx.moveTo(points[0].x + jitterX, points[0].y + jitterY)
          } else {
            ctx.lineTo(points[i].x + jitterX, points[i].y + jitterY)
          }
        }
        if (points.length === 1) {
          ctx.fillRect(points[0].x - size * 0.6, points[0].y - size * 0.6, size * 1.2, size * 1.2)
        } else ctx.stroke()
        break

      case 'pen':
        // 钢笔：流畅线条，细且平滑，轻微圆润
        ctx.strokeStyle = color
        ctx.lineWidth = size * 0.6
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.shadowColor = color
        ctx.shadowBlur = size * 0.5
        ctx.beginPath()
        ctx.moveTo(points[0].x, points[0].y)
        for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y)
        if (points.length === 1) {
          ctx.arc(points[0].x, points[0].y, size * 0.3, 0, Math.PI * 2)
          ctx.fillStyle = color
          ctx.fill()
        } else ctx.stroke()
        ctx.shadowBlur = 0
        break

      case 'brush':
        // 氛笔：根据速度变化粗细
        ctx.strokeStyle = color
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        for (let i = 0; i < points.length; i++) {
          const v = velocities?.[i] || 1
          const lw = size * (1.5 - Math.min(v, 1) * 0.8) // 速度快变细
          ctx.lineWidth = lw
          if (i === 0) {
            ctx.beginPath()
            ctx.moveTo(points[0].x, points[0].y)
          } else {
            ctx.lineTo(points[i].x, points[i].y)
            ctx.stroke()
            ctx.beginPath()
            ctx.moveTo(points[i].x, points[i].y)
          }
        }
        if (points.length === 1) {
          ctx.arc(points[0].x, points[0].y, size / 2, 0, Math.PI * 2)
          ctx.fillStyle = color
          ctx.fill()
        }
        break

      case 'watercolor':
        // 水彩：沿路径密集绘制半透明柔和圆点，消除圆点/折线感
        ctx.fillStyle = color
        const wcStep = Math.max(1, size * 0.4)
        for (let i = 0; i < points.length - 1; i++) {
          const p1 = points[i]
          const p2 = points[i + 1]
          const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y)
          const steps = Math.max(1, Math.floor(dist / wcStep))
          for (let s = 0; s <= steps; s++) {
            const t = s / steps
            const x = p1.x + (p2.x - p1.x) * t
            const y = p1.y + (p2.y - p1.y) * t
            ctx.globalAlpha = 0.06
            ctx.beginPath()
            ctx.arc(x, y, size * 1.2, 0, Math.PI * 2)
            ctx.fill()
            ctx.globalAlpha = 0.12
            ctx.beginPath()
            ctx.arc(x, y, size * 0.6, 0, Math.PI * 2)
            ctx.fill()
          }
        }
        if (points.length === 1) {
          ctx.globalAlpha = 0.15
          ctx.beginPath()
          ctx.arc(points[0].x, points[0].y, size * 1.5, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.globalAlpha = 1
        break

      case 'crayon':
        // 蜡笔：多层抖动 + 噪点颗粒，模拟蜡笔粗糙粉末感
        // 使用基于 stroke id 的确定性随机，保证重绘结果一致
        const rngC = createRng(Math.floor(stroke.id || 1))
        ctx.globalAlpha = 0.85
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        for (let pass = 0; pass < 3; pass++) {
          ctx.strokeStyle = color
          ctx.lineWidth = size * 0.9
          ctx.beginPath()
          for (let i = 0; i < points.length; i++) {
            const jitterX = (rngC() - 0.5) * size * 1.5
            const jitterY = (rngC() - 0.5) * size * 1.5
            if (i === 0) {
              ctx.moveTo(points[0].x + jitterX, points[0].y + jitterY)
            } else {
              ctx.lineTo(points[i].x + jitterX, points[i].y + jitterY)
            }
          }
          if (points.length > 1) ctx.stroke()
        }
        // 添加噪点颗粒
        ctx.fillStyle = color
        for (let i = 0; i < points.length; i += 1) {
          for (let k = 0; k < 4; k++) {
            const ox = (rngC() - 0.5) * size * 2.5
            const oy = (rngC() - 0.5) * size * 2.5
            const ds = rngC() * size * 0.3 + 0.5
            ctx.beginPath()
            ctx.arc(points[i].x + ox, points[i].y + oy, ds, 0, Math.PI * 2)
            ctx.fill()
          }
        }
        ctx.globalAlpha = 1
        if (points.length === 1) {
          ctx.fillStyle = color
          ctx.fillRect(points[0].x - size, points[0].y - size, size * 2, size * 2)
        }
        break

      case 'spray':
        // 喷漆：多点散布（使用确定性随机）
        const rngS = createRng(Math.floor(stroke.id || 1))
        ctx.fillStyle = color
        for (let i = 0; i < points.length; i++) {
          const p = points[i]
          const count = 8 + Math.floor(rngS() * 4)
          for (let j = 0; j < count; j++) {
            const angle = rngS() * Math.PI * 2
            const radius = rngS() * size * 2
            const dotSize = rngS() * size * 0.3 + 1
            ctx.beginPath()
            ctx.arc(p.x + Math.cos(angle) * radius, p.y + Math.sin(angle) * radius, dotSize, 0, Math.PI * 2)
            ctx.fill()
          }
        }
        break

      case 'bucket':
        // 油漆桶：重绘时重新执行 flood fill
        if (points.length > 0) {
          floodFill(ctx, points[0].x, points[0].y, color)
        }
        break

      default:
        ctx.strokeStyle = color
        ctx.lineWidth = size
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.beginPath()
        ctx.moveTo(points[0].x, points[0].y)
        for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y)
        ctx.stroke()
    }
  }

  // 重绘所有路径（含初始绘画层）
  const redrawStrokes = (strokeList) => {
    const canvas = drawCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    // 先绘制已有绘画层（基底）
    if (initialDrawingImgRef.current) {
      ctx.drawImage(initialDrawingImgRef.current, 0, 0, canvas.width, canvas.height)
    }
    for (const stroke of strokeList) {
      drawStrokeByType(ctx, stroke)
    }
  }

  // 初始化画布
  useEffect(() => {
    const bgCanvas = bgCanvasRef.current
    const drawCanvas = drawCanvasRef.current
    if (!bgCanvas || !drawCanvas) return

    const rect = bgCanvas.parentElement.getBoundingClientRect()
    const maxW = window.innerWidth < 768 ? window.innerWidth - 32 : 800
    const w = Math.min(Math.floor(rect.width), maxW)
    const h = Math.floor(w * 0.75) // 4:3 比例

    bgCanvas.width = w
    bgCanvas.height = h
    drawCanvas.width = w
    drawCanvas.height = h

    const drawCtx = drawCanvas.getContext('2d')
    drawCtx.lineCap = 'round'
    drawCtx.lineJoin = 'round'

    let pending = 0
    let drawingLoaded = false

    // 加载背景图（如果有）
    if (initialImage) {
      pending++
      const img = new Image()
      img.onload = () => {
        const bgCtx = bgCanvas.getContext('2d')
        drawImageCover(bgCtx, img, w, h)
        setBgReady(true)
        pending--
        if (pending === 0 && drawingLoaded) setHasContent(true)
      }
      img.onerror = () => {
        setBgReady(true)
        pending--
      }
      img.src = initialImage
    } else {
      setBgReady(true)
    }

    // 加载已有绘画层（如果有）——转为路径数组
    if (initialDrawing) {
      pending++
      const img = new Image()
      img.onload = () => {
        drawCtx.drawImage(img, 0, 0, w, h)
        initialDrawingImgRef.current = img
        // 历史绘画以位图形式存在，无法拆分为单条线，
        // 放入一个"合成历史"路径中标记为整体，
        // 为了支持删除线条，我们将其视为一条"背景线"，
        // 但更简单的方式：不放入 strokes 数组，直接保留在 canvas 上作为基底
        // 橡皮擦用 destination-out 可以擦它，
        // "删除线条"功能对历史位图无效（提示用户）
        drawingLoaded = true
        pending--
        if (pending === 0) setHasContent(true)
      }
      img.src = initialDrawing
    } else {
      drawingLoaded = true
    }
  }, [])

  const getPos = (e) => {
    const canvas = drawCanvasRef.current
    const rect = canvas.getBoundingClientRect()
    if (e.touches) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      }
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
  }

  const startDrawing = (e) => {
    e.preventDefault()
    const pos = getPos(e)
    const now = Date.now()

    if (toolMode === 'delete') {
      const hit = findStrokeAt(pos.x, pos.y)
      if (hit >= 0) {
        pushUndo(strokes)
        const newStrokes = strokes.filter((_, i) => i !== hit)
        setStrokes(newStrokes)
        strokesRef.current = newStrokes
        redrawStrokes(newStrokes)
        if (newStrokes.length === 0 && !initialImage && !initialDrawing) setHasContent(false)
      }
      return
    }

    // 油漆桶：点击即填充，不进入绘制状态
    if (toolMode === 'draw' && brushType === 'bucket') {
      const canvas = drawCanvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      floodFill(ctx, pos.x, pos.y, color)
      const bucketStroke = {
        id: Date.now() + Math.random(),
        points: [{ ...pos }],
        color,
        size: 0,
        brushType: 'bucket',
        velocities: [0],
      }
      pushUndo(strokes)
      const newStrokes = [...strokes, bucketStroke]
      setStrokes(newStrokes)
      strokesRef.current = newStrokes
      setHasContent(true)
      return
    }

    setIsDrawing(true)
    setLastPos(pos)
    setLastTime(now)
    velocityRef.current = { lastTime: now, lastPos: pos }
    setHasContent(true)

    if (toolMode === 'draw') {
      const newStroke = {
        id: Date.now() + Math.random(),
        points: [{ ...pos }],
        color,
        size: brushSize,
        brushType,
        velocities: [0],
      }
      currentStrokeRef.current = newStroke
    } else if (toolMode === 'eraser') {
      currentStrokeRef.current = {
        id: Date.now() + Math.random(),
        points: [{ ...pos }],
        type: 'erase',
        size: brushSize * 2.5,
      }
    }
  }

  const draw = (e) => {
    if (!isDrawing) return
    e.preventDefault()

    const canvas = drawCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const pos = getPos(e)
    const now = Date.now()

    // 计算速度（用于毛笔）
    const dt = now - velocityRef.current.lastTime
    const dx = pos.x - velocityRef.current.lastPos.x
    const dy = pos.y - velocityRef.current.lastPos.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    const velocity = dt > 0 ? dist / dt : 0 // pixels per ms

    if (toolMode === 'draw') {
      // 实时绘制（优化性能：只绘制最新段落）
      ctx.globalCompositeOperation = 'source-over'

      // 根据笔刷类型实时绘制
      if (brushType === 'watercolor') {
        // 水彩：密集圆点叠加，实时跟随画笔
        const dist = Math.hypot(pos.x - lastPos.x, pos.y - lastPos.y)
        const step = Math.max(1, brushSize * 0.4)
        const steps = Math.max(1, Math.floor(dist / step))
        ctx.fillStyle = color
        for (let s = 0; s <= steps; s++) {
          const t = s / steps
          const x = lastPos.x + (pos.x - lastPos.x) * t
          const y = lastPos.y + (pos.y - lastPos.y) * t
          ctx.globalAlpha = 0.06
          ctx.beginPath()
          ctx.arc(x, y, brushSize * 1.2, 0, Math.PI * 2)
          ctx.fill()
          ctx.globalAlpha = 0.12
          ctx.beginPath()
          ctx.arc(x, y, brushSize * 0.6, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.globalAlpha = 1
      } else if (brushType === 'spray') {
        ctx.fillStyle = color
        const count = 8 + Math.floor(Math.random() * 4)
        for (let j = 0; j < count; j++) {
          const angle = Math.random() * Math.PI * 2
          const radius = Math.random() * brushSize * 2
          const dotSize = Math.random() * brushSize * 0.3 + 1
          ctx.beginPath()
          ctx.arc(pos.x + Math.cos(angle) * radius, pos.y + Math.sin(angle) * radius, dotSize, 0, Math.PI * 2)
          ctx.fill()
        }
      } else if (brushType === 'crayon') {
        // 蜡笔：多层抖动线条 + 噪点
        ctx.globalAlpha = 0.85
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        for (let pass = 0; pass < 3; pass++) {
          ctx.strokeStyle = color
          ctx.lineWidth = brushSize * 0.9
          ctx.beginPath()
          const sx = lastPos.x + (Math.random() - 0.5) * brushSize * 1.5
          const sy = lastPos.y + (Math.random() - 0.5) * brushSize * 1.5
          const ex = pos.x + (Math.random() - 0.5) * brushSize * 1.5
          const ey = pos.y + (Math.random() - 0.5) * brushSize * 1.5
          ctx.moveTo(sx, sy)
          ctx.lineTo(ex, ey)
          ctx.stroke()
        }
        ctx.fillStyle = color
        for (let k = 0; k < 4; k++) {
          const ox = (Math.random() - 0.5) * brushSize * 2.5
          const oy = (Math.random() - 0.5) * brushSize * 2.5
          const ds = Math.random() * brushSize * 0.3 + 0.5
          ctx.beginPath()
          ctx.arc(pos.x + ox, pos.y + oy, ds, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.globalAlpha = 1
      } else if (brushType === 'brush') {
        // 毛笔：动态线宽
        const lw = brushSize * (1.5 - Math.min(velocity, 1) * 0.8)
        ctx.strokeStyle = color
        ctx.lineWidth = lw
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
      } else if (brushType === 'pencil') {
        // 铅笔：锐利边缘，轻微抖动
        ctx.strokeStyle = color
        ctx.lineWidth = brushSize * 1.2
        ctx.lineCap = 'square'
        ctx.lineJoin = 'miter'
      } else if (brushType === 'pen') {
        // 钢笔：细且平滑，轻微阴影
        ctx.strokeStyle = color
        ctx.lineWidth = brushSize * 0.6
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.shadowColor = color
        ctx.shadowBlur = brushSize * 0.5
      }

      if (brushType !== 'spray' && brushType !== 'watercolor' && brushType !== 'crayon') {
        ctx.beginPath()
        const startX = brushType === 'pencil' ? lastPos.x + (Math.random() - 0.5) * brushSize * 0.4 : lastPos.x
        const startY = brushType === 'pencil' ? lastPos.y + (Math.random() - 0.5) * brushSize * 0.4 : lastPos.y
        const endX = brushType === 'pencil' ? pos.x + (Math.random() - 0.5) * brushSize * 0.4 : pos.x
        const endY = brushType === 'pencil' ? pos.y + (Math.random() - 0.5) * brushSize * 0.4 : pos.y
        ctx.moveTo(startX, startY)
        ctx.lineTo(endX, endY)
        ctx.stroke()
        if (brushType === 'pen') ctx.shadowBlur = 0
      }

      // 追加到当前路径
      if (currentStrokeRef.current) {
        currentStrokeRef.current.points.push({ ...pos })
        currentStrokeRef.current.velocities.push(velocity)
      }
    } else if (toolMode === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out'
      ctx.strokeStyle = 'rgba(0,0,0,1)'
      ctx.lineWidth = brushSize * 2.5
      ctx.beginPath()
      ctx.moveTo(lastPos.x, lastPos.y)
      ctx.lineTo(pos.x, pos.y)
      ctx.stroke()
      if (currentStrokeRef.current) currentStrokeRef.current.points.push({ ...pos })
    }

    setLastPos(pos)
    velocityRef.current = { lastTime: now, lastPos: pos }
  }

  const stopDrawing = () => {
    if (!isDrawing) return
    setIsDrawing(false)

    if (toolMode === 'draw' && currentStrokeRef.current) {
      pushUndo(strokes)
      const newStrokes = [...strokes, currentStrokeRef.current]
      setStrokes(newStrokes)
      strokesRef.current = newStrokes
    } else if (toolMode === 'eraser' && currentStrokeRef.current) {
      pushUndo(strokes)
      const newStrokes = [...strokes, currentStrokeRef.current]
      setStrokes(newStrokes)
      strokesRef.current = newStrokes
    }
    currentStrokeRef.current = null
  }

  // 查找点击位置附近的线条（点到折线距离）
  const findStrokeAt = (x, y) => {
    const threshold = 8 // 点击容差像素
    let bestIndex = -1
    let bestDist = Infinity
    for (let i = strokes.length - 1; i >= 0; i--) {
      const stroke = strokes[i]
      if (!stroke.points || stroke.points.length === 0) continue
      if (stroke.brushType === 'bucket') continue // 油漆桶填充不支持点选删除
      const dist = pointToStrokeDistance(x, y, stroke)
      const hitRadius = Math.max(stroke.size / 2, threshold)
      if (dist <= hitRadius && dist < bestDist) {
        bestDist = dist
        bestIndex = i
      }
    }
    return bestIndex
  }

  // 点到折线的最短距离
  const pointToStrokeDistance = (px, py, stroke) => {
    let minDist = Infinity
    const pts = stroke.points
    if (pts.length === 1) {
      const dx = px - pts[0].x
      const dy = py - pts[0].y
      return Math.sqrt(dx * dx + dy * dy)
    }
    for (let i = 0; i < pts.length - 1; i++) {
      const dist = pointToSegmentDistance(px, py, pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y)
      if (dist < minDist) minDist = dist
    }
    return minDist
  }

  // 点到线段距离
  const pointToSegmentDistance = (px, py, x1, y1, x2, y2) => {
    const dx = x2 - x1
    const dy = y2 - y1
    const lenSq = dx * dx + dy * dy
    if (lenSq === 0) {
      const ddx = px - x1
      const ddy = py - y1
      return Math.sqrt(ddx * ddx + ddy * ddy)
    }
    let t = ((px - x1) * dx + (py - y1) * dy) / lenSq
    t = Math.max(0, Math.min(1, t))
    const cx = x1 + t * dx
    const cy = y1 + t * dy
    const ddx = px - cx
    const ddy = py - cy
    return Math.sqrt(ddx * ddx + ddy * ddy)
  }

  const handleClear = () => {
    if (strokes.length === 0) return
    pushUndo(strokes)
    const canvas = drawCanvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setStrokes([])
    strokesRef.current = []
    setHasContent(isEditMode && initialImage ? true : false)
  }

  const handleSave = () => {
    const bgCanvas = bgCanvasRef.current
    const drawCanvas = drawCanvasRef.current
    if (!bgCanvas || !drawCanvas) return

    const w = bgCanvas.width
    const h = bgCanvas.height

    // 合并两层输出
    const merged = document.createElement('canvas')
    merged.width = w
    merged.height = h
    const mctx = merged.getContext('2d')

    if (initialImage && bgReady) {
      // 编辑模式 + 有背景：绘制背景层
      mctx.drawImage(bgCanvas, 0, 0)
    } else {
      // 全新画板：白底
      mctx.fillStyle = '#ffffff'
      mctx.fillRect(0, 0, w, h)
    }

    // 叠加绘画层
    mctx.drawImage(drawCanvas, 0, 0)

    const mergedDataUrl = merged.toDataURL('image/jpeg', 0.92)
    const drawingDataUrl = drawCanvas.toDataURL('image/png')

    // 释放临时画布内存
    merged.width = 0
    merged.height = 0

    // 统一返回结构化数据，调用方按需取用
    // - merged: 用于显示的最终图（含白底/背景）
    // - drawing: 仅绘画层（透明背景），用于后续编辑时载入
    // - original: 透传原背景图（仅编辑模式有值）
    onSave({
      merged: mergedDataUrl,
      drawing: drawingDataUrl,
      original: initialImage || null,
    })
  }

  const saveDisabled = !hasContent

  // 模式标题与提示
  const modeTitle = editMode === 'drawing'
    ? '编辑绘画作品'
    : editMode === 'annotate'
      ? '图片标注'
      : '画板'
  const modeHint = editMode === 'drawing'
    ? '画笔 / 橡皮 / 删线：橡皮擦可擦除所有笔迹，删线工具点一下删除整条线'
    : editMode === 'annotate'
      ? '原图受保护，橡皮仅擦笔记，删线工具点一下删除整条标注线'
      : null

  const content = (
    <div className="fixed inset-0 z-50 flex flex-col animate-fade-in" style={{ backgroundColor: 'var(--bg)' }}>
      {/* 头部 */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: 'var(--rule)' }}
      >
        <button
          onClick={onCancel}
          className="p-2 rounded-xl transition-all duration-200 flex items-center justify-center min-w-[44px] min-h-[44px]"
          style={{
            color: 'var(--ink)',
          }}
          title="返回"
        >
          <Icon name="arrow-left" size={22} color="var(--ink)" strokeWidth={2.5} />
        </button>
        <h3 className="font-medium" style={{ color: 'var(--ink)' }}>
          {modeTitle}
        </h3>
        <button
          onClick={handleSave}
          disabled={saveDisabled}
          className="px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 disabled:opacity-50 flex items-center gap-1.5"
          style={{
            backgroundColor: 'var(--accent)',
            color: 'white',
          }}
          title={isEditMode ? '保存' : '插入'}
        >
          <Icon name={isEditMode ? 'check' : 'plus'} size={18} color="white" strokeWidth={2} />
          <span className="hidden md:inline">{isEditMode ? '保存' : '插入'}</span>
        </button>
      </div>

      {/* 模式提示条 */}
      {modeHint && (
        <div
          className="px-4 py-2 text-xs text-center"
          style={{
            backgroundColor: editMode === 'annotate' ? 'rgba(93, 173, 226, 0.08)' : 'rgba(255, 160, 122, 0.08)',
            color: editMode === 'annotate' ? 'var(--accent)' : '#FFA07A',
          }}
        >
          {modeHint}
        </div>
      )}

      {/* 工具栏 */}
      <div
        className="px-4 py-3 border-b space-y-3"
        style={{ borderColor: 'var(--rule)' }}
      >
        {/* 第一行：笔刷类型选择 */}
        <div className="flex items-center gap-1 p-1 rounded-lg" style={{ backgroundColor: 'var(--bg2)' }}>
          {BRUSH_TYPES.map(bt => (
            <button
              key={bt.id}
              onClick={() => { setBrushType(bt.id); setToolMode('draw'); }}
              className="px-2 py-1.5 rounded-md text-xs font-medium transition-colors duration-200 flex items-center gap-1"
              style={{
                backgroundColor: brushType === bt.id && toolMode === 'draw' ? 'var(--accent)' : 'transparent',
                color: brushType === bt.id && toolMode === 'draw' ? 'white' : 'var(--muted)',
              }}
              title={bt.name}
            >
              <Icon name={bt.icon} size={14} color={brushType === bt.id && toolMode === 'draw' ? 'white' : 'var(--muted)'} strokeWidth={1.5} />
              {bt.name}
            </button>
          ))}
          {/* 橡皮和删线按钮 */}
          <div className="ml-2 flex items-center gap-1">
            <button
              onClick={() => setToolMode('eraser')}
              className="px-2 py-1.5 rounded-md text-xs font-medium transition-colors duration-200 flex items-center gap-1"
              style={{
                backgroundColor: toolMode === 'eraser' ? 'var(--accent)' : 'transparent',
                color: toolMode === 'eraser' ? 'white' : 'var(--muted)',
              }}
              title="橡皮擦"
            >
              <Icon name="eraser" size={14} color={toolMode === 'eraser' ? 'white' : 'var(--muted)'} strokeWidth={1.5} />
              橡皮
            </button>
            <button
              onClick={() => setToolMode('delete')}
              className="px-2 py-1.5 rounded-md text-xs font-medium transition-colors duration-200 flex items-center gap-1"
              style={{
                backgroundColor: toolMode === 'delete' ? 'var(--accent)' : 'transparent',
                color: toolMode === 'delete' ? 'white' : 'var(--muted)',
              }}
              title="删除整条线"
            >
              <Icon name="trash" size={14} color={toolMode === 'delete' ? 'white' : 'var(--muted)'} strokeWidth={1.5} />
              删线
            </button>
          </div>
        </div>

        {/* 第二行：颜色选择（预设 + 自定义） */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* 预设颜色 */}
          {PRESET_COLORS.map(c => (
            <button
              key={c}
              onClick={() => { if (toolMode === 'draw') setColor(c); }}
              className={`w-6 h-6 rounded-full transition-all duration-200 flex-shrink-0 ${c === '#ffffff' ? 'border' : ''}`}
              style={{
                backgroundColor: c,
                border: color === c && toolMode === 'draw' ? '2.5px solid var(--accent)' : (c === '#ffffff' ? '1.5px solid var(--rule)' : 'none'),
                opacity: toolMode === 'draw' ? 1 : 0.4,
                cursor: toolMode === 'draw' ? 'pointer' : 'not-allowed',
                boxShadow: color === c && toolMode === 'draw' ? '0 0 6px var(--accent)' : 'none',
              }}
            />
          ))}
          {/* 自定义颜色 */}
          {customColors.map(c => (
            <button
              key={c}
              onClick={() => { if (toolMode === 'draw') setColor(c); }}
              onMouseDown={() => startLongPress(c)}
              onMouseUp={cancelLongPress}
              onMouseLeave={cancelLongPress}
              onTouchStart={() => startLongPress(c)}
              onTouchEnd={cancelLongPress}
              className="w-6 h-6 rounded-full transition-all duration-200 flex-shrink-0"
              style={{
                backgroundColor: c,
                border: color === c && toolMode === 'draw' ? '2.5px solid var(--accent)' : (c === '#ffffff' ? '1.5px solid var(--rule)' : '1.5px solid transparent'),
                opacity: toolMode === 'draw' ? 1 : 0.4,
                cursor: toolMode === 'draw' ? 'pointer' : 'not-allowed',
                boxShadow: color === c && toolMode === 'draw' ? '0 0 6px var(--accent)' : 'none',
              }}
            />
          ))}
          {/* 添加自定义颜色按钮 */}
          {toolMode === 'draw' && (
            <button
              onClick={() => setShowColorPicker(true)}
              className="w-6 h-6 rounded-full transition-all duration-200 flex items-center justify-center flex-shrink-0"
              style={{
                backgroundColor: 'var(--bg2)',
                border: '1.5px solid var(--rule)',
                color: 'var(--muted)',
              }}
              title="自定义颜色"
            >
              <Icon name="plus" size={12} color="var(--muted)" strokeWidth={2} />
            </button>
          )}
          {/* 颜色选择器弹窗 */}
          {showColorPicker && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center animate-fade-in" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} onClick={() => setShowColorPicker(false)}>
              <div className="p-5 rounded-2xl w-[280px] max-w-[90vw]" style={{ backgroundColor: 'var(--bg)' }} onClick={e => e.stopPropagation()}>
                <p className="text-sm font-medium mb-4 text-center" style={{ color: 'var(--ink)' }}>选择自定义颜色</p>
                <div className="flex justify-center mb-4">
                  <button
                    onClick={() => colorPickerRef.current?.click()}
                    className="w-24 h-24 rounded-2xl border-2 transition-transform active:scale-95 flex items-center justify-center"
                    style={{
                      backgroundColor: color,
                      borderColor: 'var(--rule)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    }}
                  >
                    <Icon name="droplet" size={28} color={color === '#ffffff' ? 'var(--muted)' : '#ffffff'} strokeWidth={2} />
                  </button>
                  <input
                    ref={colorPickerRef}
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="opacity-0 absolute w-0 h-0 pointer-events-none"
                  />
                </div>
                <p className="text-xs text-center mb-4" style={{ color: 'var(--muted)' }}>点击色块打开系统颜色选择器</p>
                <div className="flex gap-3">
                  <button onClick={() => setShowColorPicker(false)} className="flex-1 py-2 rounded-xl text-sm" style={{ backgroundColor: 'var(--bg2)', color: 'var(--muted)' }}>取消</button>
                  <button onClick={() => {
                    saveCustomColor(color)
                    setShowColorPicker(false)
                  }} className="flex-1 py-2 rounded-xl text-sm font-medium" style={{ backgroundColor: 'var(--accent)', color: 'white' }}>确定</button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 第三行：画笔大小 + 撤销/重做 + 清除按钮 */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: 'var(--muted)' }}>大小</span>
            {BRUSH_SIZES.map(size => (
              <button
                key={size}
                onClick={() => setBrushSize(size)}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200"
                style={{
                  backgroundColor: brushSize === size ? 'var(--accent)' : 'var(--bg2)',
                  color: brushSize === size ? 'white' : 'var(--muted)',
                }}
              >
                <div
                  className="rounded-full bg-current"
                  style={{
                    width: toolMode === 'eraser' ? size * 1.5 : size * 2,
                    height: toolMode === 'eraser' ? size * 1.5 : size * 2,
                  }}
                />
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleUndo}
              disabled={!canUndo}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200"
              style={{
                backgroundColor: 'var(--bg2)',
                color: canUndo ? 'var(--muted)' : 'var(--rule)',
                opacity: canUndo ? 1 : 0.4,
                cursor: canUndo ? 'pointer' : 'not-allowed',
              }}
              title="撤销"
            >
              <Icon name="undo-2" size={16} color="currentColor" strokeWidth={2} />
            </button>
            <button
              onClick={handleRedo}
              disabled={!canRedo}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200"
              style={{
                backgroundColor: 'var(--bg2)',
                color: canRedo ? 'var(--muted)' : 'var(--rule)',
                opacity: canRedo ? 1 : 0.4,
                cursor: canRedo ? 'pointer' : 'not-allowed',
              }}
              title="重做"
            >
              <Icon name="redo-2" size={16} color="currentColor" strokeWidth={2} />
            </button>
            <button
              onClick={handleClear}
              className="px-3 py-1.5 rounded-lg text-xs transition-all duration-200 ml-1"
              style={{
                backgroundColor: 'var(--bg2)',
                color: 'var(--muted)',
              }}
            >
              {editMode === 'annotate' ? '清空笔记' : '清除全部'}
            </button>
          </div>
        </div>
      </div>

      {/* 画布：双层叠加 */}
      <div className="flex-1 p-3 md:p-6 overflow-auto">
        <div
          className="w-full max-w-[560px] md:max-w-none mx-auto aspect-[4/3] rounded-2xl overflow-hidden relative border"
          style={{
            backgroundColor: '#ffffff',
            borderColor: 'var(--rule)',
            borderWidth: '1.5px',
          }}
        >
          {/* 背景层（不可擦，仅显示与合成用） */}
          <canvas
            ref={bgCanvasRef}
            className="absolute inset-0 pointer-events-none"
          />
          {/* 绘画层（可画可擦） */}
          <canvas
            ref={drawCanvasRef}
            className="absolute inset-0 touch-none"
            style={{
              cursor: toolMode === 'eraser'
                ? getEraserCursor()
                : toolMode === 'delete'
                  ? getDeleteCursor()
                  : getCursorForBrush(brushType),
            }}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
        </div>
      </div>
    </div>
  )

  if (typeof document === 'undefined') return null
  return createPortal(content, document.body)
}

/**
 * 按比例填充（cover 模式）：等比缩放并裁剪以填满目标区域
 */
function drawImageCover(ctx, img, dw, dh) {
  const iw = img.width
  const ih = img.height
  const ratio = Math.max(dw / iw, dh / ih)
  const sw = dw / ratio
  const sh = dh / ratio
  const sx = (iw - sw) / 2
  const sy = (ih - sh) / 2
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, dw, dh)
}

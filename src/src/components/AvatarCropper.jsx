import { useState, useRef, useEffect, useCallback } from 'react'

function AvatarCropper({ imageSrc, onConfirm, onCancel, cropSize = 200 }) {
  const containerRef = useRef(null)
  const imgRef = useRef(null)
  const [imgLoaded, setImgLoaded] = useState(false)
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragStart = useRef({ x: 0, y: 0, posX: 0, posY: 0 })
  const minScale = useRef(1)

  const handleImageLoad = useCallback(() => {
    if (!imgRef.current || !containerRef.current) return
    const img = imgRef.current
    const container = containerRef.current
    const cw = container.offsetWidth
    const ch = container.offsetHeight

    const imgRatio = img.naturalWidth / img.naturalHeight
    const containerRatio = cw / ch

    let fitScale
    if (imgRatio > containerRatio) {
      fitScale = ch / img.naturalHeight
    } else {
      fitScale = cw / img.naturalWidth
    }

    const cropMinScale = cropSize / Math.min(img.naturalWidth, img.naturalHeight)
    const initialScale = cropMinScale * 1.3
    minScale.current = cropMinScale
    setScale(initialScale)
    setPosition({ x: 0, y: 0 })
    setImgLoaded(true)
  }, [cropSize])

  const handleWheel = useCallback((e) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    setScale(prev => {
      const next = Math.max(minScale.current, Math.min(prev * (1 + delta), prev * 3))
      return next
    })
  }, [])

  const handleMouseDown = useCallback((e) => {
    e.preventDefault()
    setIsDragging(true)
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    dragStart.current = {
      x: clientX,
      y: clientY,
      posX: position.x,
      posY: position.y,
    }
  }, [position])

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return
    e.preventDefault()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    const dx = clientX - dragStart.current.x
    const dy = clientY - dragStart.current.y
    setPosition({
      x: dragStart.current.posX + dx,
      y: dragStart.current.posY + dy,
    })
  }, [isDragging])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      window.addEventListener('touchmove', handleMouseMove, { passive: false })
      window.addEventListener('touchend', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
        window.removeEventListener('touchmove', handleMouseMove)
        window.removeEventListener('touchend', handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  const handleConfirm = useCallback(() => {
    if (!imgRef.current) return
    const img = imgRef.current

    const canvas = document.createElement('canvas')
    const outputSize = 400
    canvas.width = outputSize
    canvas.height = outputSize
    const ctx = canvas.getContext('2d')

    if (!containerRef.current) return
    const container = containerRef.current
    const cw = container.offsetWidth
    const ch = container.offsetHeight

    const drawW = img.naturalWidth * scale
    const drawH = img.naturalHeight * scale

    const offsetX = (cw - drawW) / 2 + position.x
    const offsetY = (ch - drawH) / 2 + position.y

    const cropX = (cw - cropSize) / 2
    const cropY = (ch - cropSize) / 2

    const srcX = (cropX - offsetX) / scale
    const srcY = (cropY - offsetY) / scale
    const srcSize = cropSize / scale

    ctx.drawImage(
      img,
      Math.max(0, srcX),
      Math.max(0, srcY),
      Math.min(srcSize, img.naturalWidth - Math.max(0, srcX)),
      Math.min(srcSize, img.naturalHeight - Math.max(0, srcY)),
      Math.max(0, -srcX) * (outputSize / srcSize),
      Math.max(0, -srcY) * (outputSize / srcSize),
      Math.min(srcSize, img.naturalWidth - Math.max(0, srcX)) * (outputSize / srcSize),
      Math.min(srcSize, img.naturalHeight - Math.max(0, srcY)) * (outputSize / srcSize),
    )

    const avatarData = canvas.toDataURL('image/png')
    onConfirm(avatarData)
  }, [scale, position, cropSize, onConfirm])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}
      onClick={onCancel}
    >
      <div
        className="flex flex-col"
        style={{ width: '100%', maxWidth: '420px', padding: '0 20px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center mb-4">
          <p className="text-white text-[16px] font-medium">调整头像</p>
          <p className="text-white/60 text-[12px] mt-1">拖拽移动，滚轮缩放</p>
        </div>

        <div
          ref={containerRef}
          className="relative overflow-hidden cursor-grab active:cursor-grabbing"
          style={{
            width: '100%',
            aspectRatio: '1 / 1',
            borderRadius: '16px',
            backgroundColor: '#000',
          }}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onTouchStart={handleMouseDown}
        >
          {imageSrc && (
            <img
              ref={imgRef}
              src={imageSrc}
              alt="avatar"
              onLoad={handleImageLoad}
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px)) scale(${scale})`,
                maxWidth: 'none',
                userSelect: 'none',
                pointerEvents: 'none',
              }}
              draggable={false}
            />
          )}

          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
              clipPath: `circle(${cropSize / 2}px at center)`,
            }}
          />
          <div
            className="absolute pointer-events-none"
            style={{
              width: cropSize,
              height: cropSize,
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              borderRadius: '50%',
              border: '2px solid rgba(255,255,255,0.8)',
            }}
          />
        </div>

        <div className="flex gap-3 mt-5">
          <button
            onClick={onCancel}
            className="flex-1 h-11 rounded-full text-[14px] font-medium transition-all duration-200"
            style={{
              backgroundColor: 'rgba(255,255,255,0.15)',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.2)',
            }}
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={!imgLoaded}
            className="flex-1 h-11 rounded-full text-[14px] font-medium transition-all duration-200"
            style={{
              backgroundColor: 'var(--accent)',
              color: '#fff',
              opacity: imgLoaded ? 1 : 0.5,
            }}
          >
            确定
          </button>
        </div>
      </div>
    </div>
  )
}

export default AvatarCropper

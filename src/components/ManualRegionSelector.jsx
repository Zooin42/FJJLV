import { useState, useRef, useEffect } from 'react'
import './ManualRegionSelector.css'
import { extractSimpleSilhouette } from '../utils/silhouetteExtractor'

/**
 * ManualRegionSelector - 手动绘制矩形选择区域
 * 用户在 PDF 页面上拖动鼠标绘制矩形框
 */
function ManualRegionSelector({ pdfCanvas, pageWidth, pageHeight, onRegionSelect, onCancel }) {
  const [isDragging, setIsDragging] = useState(false)
  const [startPoint, setStartPoint] = useState(null)
  const [currentPoint, setCurrentPoint] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const overlayRef = useRef(null)

  // ESC 键取消选择
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isProcessing) {
        if (import.meta.env.DEV) {
          console.log('[ManualRegionSelector] ESC pressed - cancelling')
        }
        onCancel()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isProcessing, onCancel])

  // 计算当前绘制的矩形
  const getRect = () => {
    if (!startPoint || !currentPoint) return null
    
    const x = Math.min(startPoint.x, currentPoint.x)
    const y = Math.min(startPoint.y, currentPoint.y)
    const width = Math.abs(currentPoint.x - startPoint.x)
    const height = Math.abs(currentPoint.y - startPoint.y)
    
    return { x, y, width, height }
  }

  const handlePointerDown = (e) => {
    const rect = overlayRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    setStartPoint({ x, y })
    setCurrentPoint({ x, y })
    setIsDragging(true)
    
    if (import.meta.env.DEV) {
      console.log('[ManualRegionSelector] Start drawing at:', { x, y })
    }
  }

  const handlePointerMove = (e) => {
    if (!isDragging) return
    
    const rect = overlayRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    setCurrentPoint({ x, y })
  }

  const handlePointerUp = async () => {
    if (!isDragging) return
    
    const region = getRect()
    
    // 验证区域大小（至少 30×30px）
    if (!region || region.width < 30 || region.height < 30) {
      if (import.meta.env.DEV) {
        console.log('[ManualRegionSelector] Region too small, ignoring')
      }
      setIsDragging(false)
      setStartPoint(null)
      setCurrentPoint(null)
      return
    }
    
    setIsDragging(false)
    setIsProcessing(true)
    
    if (import.meta.env.DEV) {
      console.log('[ManualRegionSelector] Region selected (DOM coords):', region)
      console.log('[ManualRegionSelector] Canvas size:', {
        width: pdfCanvas.width,
        height: pdfCanvas.height
      })
      console.log('[ManualRegionSelector] Overlay size (pageWidth/Height):', {
        width: pageWidth,
        height: pageHeight
      })
    }
    
    // 计算坐标转换比例：canvas实际像素 / overlay显示像素
    const scaleX = pdfCanvas.width / pageWidth
    const scaleY = pdfCanvas.height / pageHeight
    
    // 将DOM坐标转换为canvas坐标
    const canvasRegion = {
      x: region.x * scaleX,
      y: region.y * scaleY,
      width: region.width * scaleX,
      height: region.height * scaleY
    }
    
    if (import.meta.env.DEV) {
      console.log('[ManualRegionSelector] Region converted to canvas coords:', canvasRegion)
      console.log('[ManualRegionSelector] Scale factors:', { scaleX, scaleY })
    }
    
    // 提取轮廓（使用canvas坐标）
    try {
      const silhouette = await extractSimpleSilhouette(pdfCanvas, canvasRegion, {
        threshold: 128,
        invert: false,  // 不反转：黑色轮廓+白色背景，适合在浅色卡片上显示
        maxWidth: 150,
        maxHeight: 150
      })
      
      if (import.meta.env.DEV) {
        console.log('[ManualRegionSelector] Silhouette extracted:', {
          width: silhouette.width,
          height: silhouette.height
        })
      }
      
      // 返回DOM坐标的region（用于显示），但silhouette已用canvas坐标提取
      onRegionSelect({ region, silhouette })
    } catch (error) {
      console.error('[ManualRegionSelector] Failed to extract silhouette:', error)
      // 即使失败也返回区域
      onRegionSelect({ region, silhouette: null })
    } finally {
      setIsProcessing(false)
    }
  }

  const rect = getRect()

  return (
    <div 
      ref={overlayRef}
      className="manual-region-selector"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{
        width: `${pageWidth}px`,
        height: `${pageHeight}px`,
        cursor: isDragging ? 'crosshair' : 'crosshair'
      }}
    >
      {/* 顶部提示栏 */}
      <div className="selector-header">
        <div className="header-content">
          <span className="header-title">
            {isProcessing ? '✨ 提取轮廓中...' : '🖱️ 拖动鼠标绘制矩形区域（ESC 取消）'}
          </span>
          <button 
            className="cancel-btn" 
            onClick={onCancel}
            disabled={isProcessing}
            title="取消选择（ESC）"
          >
            ✕ 取消
          </button>
        </div>
      </div>

      {/* 处理中的 spinner */}
      {isProcessing && (
        <div className="processing-indicator">
          <div className="spinner"></div>
          <p>提取形状轮廓...</p>
        </div>
      )}

      {/* 绘制中的矩形框 */}
      {rect && isDragging && (
        <div
          className="selection-rect"
          style={{
            left: `${rect.x}px`,
            top: `${rect.y}px`,
            width: `${rect.width}px`,
            height: `${rect.height}px`
          }}
        >
          <div className="rect-label">
            {Math.round(rect.width)} × {Math.round(rect.height)}
          </div>
        </div>
      )}
    </div>
  )
}

export default ManualRegionSelector

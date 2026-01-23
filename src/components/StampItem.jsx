import { useRef, useState } from 'react'
import './StampItem.css'
import { getStickerById } from '../assets/rhythmStickers'

/**
 * StampItem - 单个标记的可视化组件（卡片式，完整信息展示）
 */
function StampItem({ stamp, stageWidth, stageHeight, onPositionChange, onStampUpdate, onDelete, disabled = false }) {
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef({ x: 0, y: 0, stampX: 0, stampY: 0 })
  
  // 从 payload 读取折叠状态，默认展开
  const isCollapsed = stamp.payload?.uiCollapsed === true
  
  const left = stamp.x * stageWidth
  const top = stamp.y * stageHeight

  // 切换折叠/展开状态
  const handleToggleCollapse = (e) => {
    e.stopPropagation() // 防止触发拖动
    
    const newCollapsed = !isCollapsed
    
    if (import.meta.env.DEV) {
      console.log(`[Toggle Collapse] ${stamp.id}: ${isCollapsed} → ${newCollapsed}`)
    }
    
    // 更新 payload
    if (onStampUpdate) {
      onStampUpdate(stamp.id, {
        payload: {
          ...stamp.payload,
          uiCollapsed: newCollapsed
        }
      })
    }
  }

  // 删除标记
  const handleDelete = (e) => {
    e.stopPropagation() // 防止触发拖动
    
    if (import.meta.env.DEV) {
      console.log(`[Delete Stamp] ${stamp.id} (type: ${stamp.type})`)
    }
    
    // 轻量确认：使用简单的 confirm
    if (window.confirm('确定删除这个标记吗？')) {
      if (onDelete) {
        onDelete(stamp.id)
      }
    }
  }

  // 根据类型显示不同的内容
  const getTypeDisplay = (stamp) => {
    switch (stamp.type) {
      case 'rhythm': {
        // 获取完整的贴纸信息
        const sticker = stamp.payload?.stickerId 
          ? getStickerById(stamp.payload.stickerId)
          : null
        
        return { 
          typeLabel: 'Rhythm',
          color: '#f59e0b',
          borderColor: '#fbbf24',
          icon: '♪',
          steps: stamp.payload?.steps,
          repeats: stamp.payload?.repeats,
          stickerLabel: sticker?.label || '未知样式',
          stickerVisual: sticker?.visual || '♪'
        }
      }
      case 'form': {
        const hasSilhouette = !!(
          stamp.payload?.silhouette?.silhouetteImage?.normalizedDataUrl
        )
        
        return { 
          typeLabel: 'Form',
          color: '#3b82f6',
          borderColor: '#60a5fa',
          icon: '□',
          promptText: stamp.payload?.promptText || '提示问题',
          note: stamp.payload?.note,
          silhouetteDataUrl: stamp.payload?.silhouette?.silhouetteImage?.normalizedDataUrl,
          silhouetteWidth: 160,  // 固定尺寸
          silhouetteHeight: 160,  // 固定尺寸
          hasSilhouette,
          hasDetails: !!stamp.payload?.promptText
        }
      }
      case 'tactile': {
        const gesture = stamp.payload?.gestureEmoji || '✋'
        const feel = stamp.payload?.feelEmoji || ''
        
        // 获取 gesture 标签（首字母大写）
        let gestureLabel = ''
        if (stamp.payload?.gestureId) {
          gestureLabel = stamp.payload.gestureId.charAt(0).toUpperCase() + stamp.payload.gestureId.slice(1)
        }
        
        // 构建完整标签：例如 "Press + Spiky"
        let fullLabel = gestureLabel
        if (stamp.payload?.feelLabel) {
          fullLabel += (fullLabel ? ' + ' : '') + stamp.payload.feelLabel
        }
        
        return { 
          typeLabel: 'Touch',  // 使用 "Touch" 作为标题
          color: '#8b5cf6',
          borderColor: '#a78bfa',
          icon: '✋',
          gestureEmoji: gesture,
          gestureLabel: gestureLabel,  // 单独的 gesture 标签
          feelEmoji: feel,
          feelLabel: stamp.payload?.feelLabel || '',
          displayLabel: fullLabel || 'Touch',
          hasDetails: !!(stamp.payload?.gestureEmoji || stamp.payload?.feelEmoji)
        }
      }
      case 'generic':
      default:
        return { 
          typeLabel: 'Generic',
          color: '#10b981',
          borderColor: '#34d399',
          icon: '●'
        }
    }
  }

  const typeInfo = getTypeDisplay(stamp)

  const handlePointerDown = (e) => {
    if (disabled) return // 禁用拖拽（如选择区域模式）
    
    e.preventDefault()
    e.stopPropagation()
    
    setIsDragging(true)
    
    // 记录拖拽起始位置
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      stampX: left,
      stampY: top
    }
    
    // 添加全局事件监听
    document.addEventListener('pointermove', handlePointerMove)
    document.addEventListener('pointerup', handlePointerUp)
  }
  
  const handlePointerMove = (e) => {
    const deltaX = e.clientX - dragStartRef.current.x
    const deltaY = e.clientY - dragStartRef.current.y
    
    // 计算新的像素位置
    let newLeft = dragStartRef.current.stampX + deltaX
    let newTop = dragStartRef.current.stampY + deltaY
    
    // 限制在舞台边界内（使用实际卡片尺寸）
    // 卡片最小 180px 宽，估计高度 70-90px
    const estimatedCardWidth = 200
    const estimatedCardHeight = 80
    
    // 确保卡片完全在可视区域内
    newLeft = Math.max(0, Math.min(stageWidth - estimatedCardWidth, newLeft))
    newTop = Math.max(0, Math.min(stageHeight - estimatedCardHeight, newTop))
    
    // 转换为归一化坐标（0-1）
    const normalizedX = Math.max(0, Math.min(1, newLeft / stageWidth))
    const normalizedY = Math.max(0, Math.min(1, newTop / stageHeight))
    
    // 立即更新位置
    onPositionChange(stamp.id, normalizedX, normalizedY)
  }
  
  const handlePointerUp = () => {
    setIsDragging(false)
    
    // 移除全局事件监听
    document.removeEventListener('pointermove', handlePointerMove)
    document.removeEventListener('pointerup', handlePointerUp)
    
    // 边缘吸附：如果接近边缘，微调位置
    const currentX = stamp.x
    const currentY = stamp.y
    let snappedX = currentX
    let snappedY = currentY
    
    // 水平吸附
    if (currentX < 0.08) {
      snappedX = 0.05 // 左边距
    } else if (currentX > 0.92) {
      snappedX = 0.95 // 右边距
    }
    
    // 垂直吸附（可选）
    if (currentY < 0.08) {
      snappedY = 0.05 // 顶部边距
    } else if (currentY > 0.92) {
      snappedY = 0.95 // 底部边距
    }
    
    // 如果发生了吸附，更新位置
    if (snappedX !== currentX || snappedY !== currentY) {
      if (import.meta.env.DEV) {
        console.log(`[Edge Snap] ${currentX.toFixed(3)},${currentY.toFixed(3)} → ${snappedX.toFixed(3)},${snappedY.toFixed(3)}`)
      }
      onPositionChange(stamp.id, snappedX, snappedY)
    }
  }

  return (
    <div
      className={`stamp-card ${isDragging ? 'dragging' : ''} ${isCollapsed ? 'collapsed' : 'expanded'} ${disabled ? 'disabled' : ''} stamp-type-${stamp.type}`}
      style={{
        left: `${left}px`,
        top: `${top}px`,
        borderColor: typeInfo.borderColor,
        ...(stamp.type === 'form' && typeInfo.hasSilhouette && {
          width: '180px',  // 固定宽度以容纳 160px 轮廓
          minWidth: '180px',
          maxWidth: '180px'
        }),
        ...(disabled && {
          pointerEvents: 'none',
          opacity: 0.4,
          cursor: 'default'
        })
      }}
      onPointerDown={handlePointerDown}
    >
      {isCollapsed ? (
        // 折叠视图：紧凑芯片
        <div className="stamp-chip">
          <span className="chip-icon">{typeInfo.icon}</span>
          <span className="chip-label">{typeInfo.typeLabel}</span>
          <button 
            className="chip-toggle"
            onClick={handleToggleCollapse}
            title="展开"
          >
            ▼
          </button>
        </div>
      ) : (
        // 展开视图：完整卡片
        <>
          {/* 卡片头部：类型和图标 */}
          <div className="stamp-card-header" style={{ backgroundColor: typeInfo.color }}>
            <span className="stamp-type-icon">{typeInfo.icon}</span>
            <span className="stamp-type-label">{typeInfo.typeLabel}</span>
            <button 
              className="header-delete"
              onClick={handleDelete}
              title="删除标记"
            >
              ×
            </button>
            <button 
              className="header-toggle"
              onClick={handleToggleCollapse}
              title="折叠"
            >
              ▲
            </button>
          </div>

          {/* 卡片内容 */}
          <div className="stamp-card-body">
            {stamp.type === 'rhythm' && typeInfo.steps && typeInfo.repeats ? (
              <>
                <div className="stamp-meta">
                  <span className="meta-item">步数: {typeInfo.steps}</span>
                  <span className="meta-divider">•</span>
                  <span className="meta-item">重复: {typeInfo.repeats}</span>
                </div>
                <div className="stamp-sticker-info">
                  <div className="sticker-label">{typeInfo.stickerLabel}</div>
                  <div className="sticker-visual">{typeInfo.stickerVisual}</div>
                </div>
              </>
            ) : stamp.type === 'form' && typeInfo.hasDetails ? (
              <>
                {/* 显示标准化轮廓（如果存在） */}
                {typeInfo.hasSilhouette && typeInfo.silhouetteDataUrl && (
                  <div className="form-silhouette-container">
                    <img 
                      src={typeInfo.silhouetteDataUrl}
                      alt="Form silhouette"
                      className="form-silhouette-image"
                      style={{
                        width: `${typeInfo.silhouetteWidth}px`,
                        height: `${typeInfo.silhouetteHeight}px`
                      }}
                    />
                  </div>
                )}
                <div className="form-prompt">{typeInfo.promptText}</div>
                {typeInfo.note && (
                  <div className="form-note">
                    <span className="note-label">笔记:</span>
                    <span className="note-content"> {typeInfo.note}</span>
                  </div>
                )}
              </>
            ) : stamp.type === 'tactile' && typeInfo.hasDetails ? (
              <>
                <div className="tactile-gesture-display">
                  <span className="gesture-emoji-large">{typeInfo.gestureEmoji}</span>
                  {typeInfo.feelEmoji && (
                    <>
                      <span className="tactile-plus">+</span>
                      <span className="feel-emoji-large">{typeInfo.feelEmoji}</span>
                    </>
                  )}
                </div>
                <div className="tactile-labels">
                  {typeInfo.gestureLabel && (
                    <div className="gesture-name">{typeInfo.gestureLabel}</div>
                  )}
                  {typeInfo.feelLabel && (
                    <div className="feel-name">{typeInfo.feelLabel}</div>
                  )}
                </div>
              </>
            ) : (
              <div className="stamp-generic-info">
                <span>第 {stamp.page} 页</span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default StampItem

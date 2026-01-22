import { useState, useRef } from 'react'
import './DebugPanel.css'

/**
 * DebugPanel - 开发者调试面板（仅在开发模式显示）
 */
function DebugPanel({ pdfId, currentPage, zoom, fitScale, finalScale, stampsByPage }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [position, setPosition] = useState({ x: 12, y: null })
  const [isDragging, setIsDragging] = useState(false)
  const [stampsInspection, setStampsInspection] = useState(null)
  const [readerStateInspection, setReaderStateInspection] = useState(null)
  const dragStartRef = useRef({ x: 0, y: 0, startX: 0, startY: 0 })

  // 计算当前页和总标记数
  const currentPageStamps = stampsByPage[currentPage]?.length || 0
  const totalStamps = Object.values(stampsByPage).reduce(
    (total, stamps) => total + stamps.length,
    0
  )

  // localStorage 键名
  const readerStateKey = `ltp_mvp::${pdfId}::reader_state`
  const stampsKey = `ltp_mvp::${pdfId}::stamps`
  const onboardingKey = `ltp_mvp::${pdfId}::onboarding_seen`

  const handleDumpLocalStorage = () => {
    console.group('📦 localStorage Dump for pdfId:', pdfId)
    
    try {
      const readerState = localStorage.getItem(readerStateKey)
      console.log('reader_state:', readerState ? JSON.parse(readerState) : null)
    } catch (e) {
      console.error('Error parsing reader_state:', e)
    }

    try {
      const stamps = localStorage.getItem(stampsKey)
      console.log('stamps:', stamps ? JSON.parse(stamps) : null)
    } catch (e) {
      console.error('Error parsing stamps:', e)
    }

    try {
      const onboarding = localStorage.getItem(onboardingKey)
      console.log('onboarding_seen:', onboarding)
    } catch (e) {
      console.error('Error reading onboarding_seen:', e)
    }

    console.groupEnd()
  }

  const handleInspectStamps = () => {
    const stampsKey = `ltp_mvp::${pdfId}::stamps`
    try {
      const rawData = localStorage.getItem(stampsKey)
      if (rawData) {
        const parsed = JSON.parse(rawData)
        setStampsInspection(JSON.stringify(parsed, null, 2))
      } else {
        setStampsInspection('(empty - no stamps data)')
      }
    } catch (e) {
      setStampsInspection(`Error: ${e.message}`)
    }
  }

  const handleInspectReaderState = () => {
    try {
      const rawData = localStorage.getItem(readerStateKey)
      if (rawData) {
        const parsed = JSON.parse(rawData)
        setReaderStateInspection(JSON.stringify(parsed, null, 2))
      } else {
        setReaderStateInspection('(empty - no reader_state data)')
      }
    } catch (e) {
      setReaderStateInspection(`Error: ${e.message}`)
    }
  }

  const handlePointerDown = (e) => {
    setIsDragging(true)
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      startX: position.x,
      startY: position.y || (window.innerHeight - 400)
    }
    
    document.addEventListener('pointermove', handlePointerMove)
    document.addEventListener('pointerup', handlePointerUp)
  }

  const handlePointerMove = (e) => {
    const deltaX = e.clientX - dragStartRef.current.x
    const deltaY = e.clientY - dragStartRef.current.y
    
    let newX = dragStartRef.current.startX + deltaX
    let newY = dragStartRef.current.startY + deltaY
    
    // 限制在视口内
    const maxX = window.innerWidth - 320 - 12
    const maxY = window.innerHeight - 60
    
    newX = Math.max(12, Math.min(maxX, newX))
    newY = Math.max(12, Math.min(maxY, newY))
    
    setPosition({ x: newX, y: newY })
  }

  const handlePointerUp = () => {
    setIsDragging(false)
    document.removeEventListener('pointermove', handlePointerMove)
    document.removeEventListener('pointerup', handlePointerUp)
  }

  const togglePanel = () => {
    setIsExpanded(!isExpanded)
  }

  if (!isExpanded) {
    return (
      <button className="debug-pill" onClick={togglePanel}>
        🔧 Debug
      </button>
    )
  }

  const panelStyle = {
    left: `${position.x}px`
  }
  
  if (position.y !== null) {
    panelStyle.top = `${position.y}px`
    panelStyle.bottom = 'auto'
  }

  return (
    <div 
      className={`debug-panel ${isDragging ? 'dragging' : ''}`}
      style={panelStyle}
    >
      <div 
        className="debug-header" 
        onPointerDown={handlePointerDown}
      >
        <span className="debug-title">🔧 Debug Panel</span>
        <button className="debug-close" onClick={togglePanel} title="关闭">
          ✕
        </button>
      </div>
      
      <div className="debug-content-wrapper">
        <div className="debug-content">
          <div className="debug-section">
            <h4>状态信息</h4>
            <div className="debug-item">
              <span className="debug-label">PDF ID:</span>
              <code className="debug-value">{pdfId}</code>
            </div>
            <div className="debug-item">
              <span className="debug-label">当前页:</span>
              <code className="debug-value">{currentPage}</code>
            </div>
            <div className="debug-item">
              <span className="debug-label">用户缩放:</span>
              <code className="debug-value">{(zoom * 100).toFixed(0)}%</code>
            </div>
            {fitScale !== undefined && (
              <div className="debug-item">
                <span className="debug-label">Fit Scale:</span>
                <code className="debug-value">{fitScale.toFixed(3)}</code>
              </div>
            )}
            {finalScale !== undefined && (
              <div className="debug-item">
                <span className="debug-label">最终缩放:</span>
                <code className="debug-value">{finalScale.toFixed(3)} ({(finalScale * 100).toFixed(0)}%)</code>
              </div>
            )}
          </div>

          <div className="debug-section">
            <h4>标记统计</h4>
            <div className="debug-item">
              <span className="debug-label">当前页标记:</span>
              <code className="debug-value">{currentPageStamps}</code>
            </div>
            <div className="debug-item">
              <span className="debug-label">总标记数:</span>
              <code className="debug-value">{totalStamps}</code>
            </div>
          </div>

          <div className="debug-section">
            <h4>localStorage 键</h4>
            <code className="debug-key">{readerStateKey}</code>
            <code className="debug-key">{stampsKey}</code>
            <code className="debug-key">{onboardingKey}</code>
          </div>

          <button className="debug-dump-button" onClick={handleDumpLocalStorage}>
            Dump localStorage for this pdfId
          </button>

          <button className="debug-dump-button" onClick={handleInspectStamps} style={{ marginTop: '8px' }}>
            Inspect stamps storage
          </button>

          <button className="debug-dump-button" onClick={handleInspectReaderState} style={{ marginTop: '8px' }}>
            Inspect reader state
          </button>

          {stampsInspection && (
            <div className="debug-section">
              <h4>Stamps JSON</h4>
              <pre className="debug-json">{stampsInspection}</pre>
            </div>
          )}

          {readerStateInspection && (
            <div className="debug-section">
              <h4>Reader State JSON</h4>
              <pre className="debug-json">{readerStateInspection}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default DebugPanel

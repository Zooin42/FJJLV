import { useState, useRef } from 'react'
import './DebugPanel.css'

/**
 * DebugPanel - 开发者调试面板（仅在开发模式显示）
 */
function DebugPanel({ pdfId, currentPage, numPages, zoom, fitScale, finalScale, stampsByPage, containerSize, renderedPageSize, onAddStamp }) {
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

  const handleResetOnboarding = () => {
    if (window.confirm('重置引导标记？下次打开此 PDF 将再次显示引导。')) {
      localStorage.removeItem(onboardingKey)
      console.log('[Debug] Onboarding flag reset for:', pdfId)
      alert('引导标记已重置。刷新页面以查看效果。')
    }
  }

  const handleClearAllData = () => {
    const keys = Object.keys(localStorage).filter(key => key.startsWith('ltp_mvp::'))
    
    if (keys.length === 0) {
      alert('没有找到 PDF 数据')
      return
    }

    const message = `确定要清除所有 PDF 数据吗？\n\n将删除 ${keys.length} 个 localStorage 键，包括：\n- 所有 PDF 的标记\n- 所有阅读状态\n- 所有引导标记\n\n此操作不可撤销！`
    
    if (window.confirm(message)) {
      console.group('🗑️ Clearing All PDF Data')
      keys.forEach(key => {
        console.log('删除:', key)
        localStorage.removeItem(key)
      })
      console.groupEnd()
      alert(`✅ 已清除 ${keys.length} 个数据项。刷新页面以重置应用。`)
      // 刷新页面
      window.location.reload()
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
          {/* Reader Diagnostics Section */}
          <div className="debug-section">
            <h4>📄 Reader Diagnostics</h4>
            <div className="debug-item">
              <span className="debug-label">PDF ID:</span>
              <code className="debug-value debug-value-small">{pdfId}</code>
            </div>
            <div className="debug-item">
              <span className="debug-label">Page:</span>
              <code className="debug-value">{currentPage}{numPages ? ` / ${numPages}` : ''}</code>
            </div>
            <div className="debug-item">
              <span className="debug-label">User Zoom:</span>
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
                <span className="debug-label">Final Scale:</span>
                <code className="debug-value">{finalScale.toFixed(3)} ({(finalScale * 100).toFixed(0)}%)</code>
              </div>
            )}
            {containerSize && (
              <div className="debug-item">
                <span className="debug-label">Container:</span>
                <code className="debug-value">{containerSize.width}×{containerSize.height}px</code>
              </div>
            )}
            {renderedPageSize && renderedPageSize.width > 0 && (
              <div className="debug-item">
                <span className="debug-label">Rendered:</span>
                <code className="debug-value">{Math.round(renderedPageSize.width)}×{Math.round(renderedPageSize.height)}px</code>
              </div>
            )}
            <div className="debug-item">
              <span className="debug-label">Viewport:</span>
              <code className="debug-value">{window.innerWidth}×{window.innerHeight}px</code>
            </div>
            <div className="debug-item">
              <span className="debug-label">DPR:</span>
              <code className="debug-value">{window.devicePixelRatio.toFixed(2)}</code>
            </div>
          </div>

          {/* Stamp State Section */}
          <div className="debug-section">
            <h4>🏷️ Stamp State</h4>
            <div className="debug-item">
              <span className="debug-label">Current Page:</span>
              <code className="debug-value">{currentPageStamps} stamps</code>
            </div>
            <div className="debug-item">
              <span className="debug-label">Total:</span>
              <code className="debug-value">{totalStamps} stamps</code>
            </div>
            <div className="debug-item">
              <span className="debug-label">Pages:</span>
              <code className="debug-value">{Object.keys(stampsByPage).length} pages</code>
            </div>
          </div>

          {/* Storage Keys Section */}
          <div className="debug-section">
            <h4>🔑 localStorage Keys</h4>
            <code className="debug-key">{readerStateKey}</code>
            <code className="debug-key">{stampsKey}</code>
            <code className="debug-key">{onboardingKey}</code>
          </div>

          {/* Actions Section */}
          <div className="debug-section">
            <h4>⚡ Actions</h4>
            {onAddStamp && (
              <button className="debug-action-button debug-action-primary" onClick={onAddStamp}>
                ＋ Add Generic Stamp
              </button>
            )}
            <button className="debug-action-button" onClick={handleDumpLocalStorage}>
              📦 Dump to Console
            </button>
            <button className="debug-action-button" onClick={handleInspectStamps}>
              🏷️ Inspect Stamps
            </button>
            <button className="debug-action-button" onClick={handleInspectReaderState}>
              📄 Inspect Reader State
            </button>
            <button className="debug-action-button debug-action-warning" onClick={handleResetOnboarding}>
              🔄 Reset Onboarding
            </button>
            <button className="debug-action-button debug-action-danger" onClick={handleClearAllData}>
              🗑️ Clear All PDF Data
            </button>
          </div>

          {/* Inspection Results */}
          {stampsInspection && (
            <div className="debug-section">
              <h4>🏷️ Stamps JSON</h4>
              <pre className="debug-json">{stampsInspection}</pre>
            </div>
          )}

          {readerStateInspection && (
            <div className="debug-section">
              <h4>📄 Reader State JSON</h4>
              <pre className="debug-json">{readerStateInspection}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default DebugPanel

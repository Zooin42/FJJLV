import { useState, useEffect } from 'react'
import './StampPanel.css'
import { getRhythmStickers } from '../assets/rhythmStickers'
import { normalizeSilhouetteToStamp } from '../utils/silhouetteNormalizer'

/**
 * Form 提示模板（随机选择）
 */
const FORM_PROMPTS = [
  { promptId: 'form_looks_like', promptText: 'This looks like…' },
  { promptId: 'form_reminds', promptText: 'What does this remind you of?' },
  { promptId: 'form_feels_like', promptText: 'It feels like…' }
]

/**
 * Tactile 手势选项
 */
const TACTILE_GESTURES = [
  { gestureId: 'tap', emoji: '👆', label: 'Tap' },
  { gestureId: 'press', emoji: '👇', label: 'Press' },
  { gestureId: 'pinch', emoji: '🤏', label: 'Pinch' },
  { gestureId: 'thumbs', emoji: '👍', label: 'Thumb press' },
  { gestureId: 'grab', emoji: '✊', label: 'Grip' },
  { gestureId: 'twoHands', emoji: '👐', label: 'Two hands' }
]

/**
 * Tactile Feel 修饰符选项（可选）
 */
const TACTILE_FEELS = [
  { feelId: 'spiky', emoji: '🌵', label: 'Spiky' },
  { feelId: 'soft', emoji: '☁️', label: 'Soft' },
  { feelId: 'clicky', emoji: '🧱', label: 'Clicky' },
  { feelId: 'smooth', emoji: '🧼', label: 'Smooth' },
  { feelId: 'tight', emoji: '🔒', label: 'Tight' },
  { feelId: 'loose', emoji: '🎈', label: 'Loose' }
]

/**
 * StampPanel - 标记面板
 * 根据 activePanel 显示不同的内容
 */
function StampPanel({ 
  activePanel, 
  onClose, 
  onAddRhythmStamp, 
  onAddFormStamp, 
  onAddTactileStamp, 
  currentPage, 
  pdfId,
  onStartRegionSelection,
  selectedRegion,
  isSelectingRegion
}) {
  // Rhythm Panel 状态
  const [steps, setSteps] = useState(2)
  const [repeats, setRepeats] = useState(2)
  const [selectedSticker, setSelectedSticker] = useState(null)
  
  // Rhythm 提示状态（每个 PDF 独立）
  const [showRhythmHint, setShowRhythmHint] = useState(false)

  // Form Panel 状态
  const [selectedPrompt, setSelectedPrompt] = useState(null)
  const [formNote, setFormNote] = useState('')

  // Tactile Panel 状态
  const [selectedGesture, setSelectedGesture] = useState(null)
  const [selectedFeel, setSelectedFeel] = useState(null)  // 可选 feel

  // 加载 Rhythm 提示状态
  useEffect(() => {
    if (activePanel === 'rhythm' && pdfId) {
      const hintKey = `ltp_mvp::${pdfId}::rhythm_hint_dismissed`
      const dismissed = localStorage.getItem(hintKey)
      setShowRhythmHint(!dismissed)
    }
  }, [activePanel, pdfId])

  // Form Panel 初始化：当选择区域时随机选择提示
  useEffect(() => {
    if (activePanel === 'form') {
      // 如果有选中的区域，自动随机选择提示
      if (selectedRegion) {
        const randomIndex = Math.floor(Math.random() * FORM_PROMPTS.length)
        setSelectedPrompt(FORM_PROMPTS[randomIndex].promptId)
        
        if (import.meta.env.DEV) {
          console.log('[FormPanel] Auto-selected random prompt:', FORM_PROMPTS[randomIndex].promptText)
        }
      } else {
        setSelectedPrompt(FORM_PROMPTS[0].promptId)
      }
      setFormNote('')
    }
  }, [activePanel, selectedRegion])

  // Tactile Panel 初始化：自动选择第一个手势，清空 feel
  useEffect(() => {
    if (activePanel === 'tactile') {
      setSelectedGesture(TACTILE_GESTURES[0].gestureId)
      setSelectedFeel(null)  // 重置 feel 选择
    }
  }, [activePanel])

  // Form Panel 初始化：自动开始区域选择
  useEffect(() => {
    if (activePanel === 'form' && !isSelectingRegion && !selectedRegion) {
      if (import.meta.env.DEV) {
        console.log('[FormPanel] Auto-starting region selection (fresh)')
      }
      onStartRegionSelection?.()
    }
  }, [activePanel, isSelectingRegion, selectedRegion, onStartRegionSelection])

  // 关闭 Rhythm 提示
  const dismissRhythmHint = () => {
    if (pdfId) {
      const hintKey = `ltp_mvp::${pdfId}::rhythm_hint_dismissed`
      localStorage.setItem(hintKey, '1')
      setShowRhythmHint(false)
      
      if (import.meta.env.DEV) {
        console.log('✓ Rhythm hint dismissed for pdfId:', pdfId)
      }
    }
  }

  // Form Panel 放置处理
  const handlePlaceFormStamp = async () => {
    if (!selectedPrompt) return
    
    const prompt = FORM_PROMPTS.find(p => p.promptId === selectedPrompt)
    if (!prompt) return

    // 构建 bbox 和轮廓数据
    let bbox = null
    let silhouetteData = null
    
    if (selectedRegion) {
      bbox = {
        x: selectedRegion.region.x,
        y: selectedRegion.region.y,
        w: selectedRegion.region.width,
        h: selectedRegion.region.height
      }
      
      // 标准化轮廓到固定大小
      if (selectedRegion.silhouette) {
        try {
          const normalizedDataUrl = await normalizeSilhouetteToStamp(
            selectedRegion.silhouette.dataUrl,
            selectedRegion.silhouette.width,
            selectedRegion.silhouette.height,
            {
              stampWidth: 160,
              stampHeight: 160,
              backgroundColor: 'rgba(59, 130, 246, 0.15)', // 蓝色半透明
              silhouetteColor: 'rgba(30, 41, 59, 0.8)',    // 深灰
              padding: 10
            }
          )
          
          silhouetteData = {
            dataUrl: selectedRegion.silhouette.dataUrl,      // 原始轮廓
            width: selectedRegion.silhouette.width,
            height: selectedRegion.silhouette.height,
            normalizedDataUrl,                               // 标准化轮廓
            normalizedWidth: 160,
            normalizedHeight: 160
          }
        } catch (error) {
          console.error('[FormPanel] Silhouette normalization failed:', error)
          // 回退：使用原始轮廓
          silhouetteData = {
            dataUrl: selectedRegion.silhouette.dataUrl,
            width: selectedRegion.silhouette.width,
            height: selectedRegion.silhouette.height
          }
        }
      }
    }

    if (import.meta.env.DEV) {
      console.log('[FormPanel] Placing form stamp:', {
        promptId: selectedPrompt,
        promptText: prompt.promptText,
        note: formNote || '(no note)',
        hasRegion: !!bbox,
        hasSilhouette: !!silhouetteData,
        hasNormalizedSilhouette: !!(silhouetteData?.normalizedDataUrl)
      })
    }

    onAddFormStamp?.(selectedPrompt, prompt.promptText, formNote || undefined, bbox, silhouetteData)
    onClose()
  }

  // Tactile Panel 放置处理
  const handlePlaceTactileStamp = () => {
    if (!selectedGesture) return
    
    const gesture = TACTILE_GESTURES.find(g => g.gestureId === selectedGesture)
    if (!gesture) return

    // 获取 feel（如果选择了）
    let feelData = null
    if (selectedFeel) {
      const feel = TACTILE_FEELS.find(f => f.feelId === selectedFeel)
      if (feel) {
        feelData = {
          feelId: feel.feelId,
          feelEmoji: feel.emoji,
          feelLabel: feel.label
        }
      }
    }

    if (import.meta.env.DEV) {
      console.log('[TactilePanel] Placing tactile stamp:', {
        gestureId: selectedGesture,
        emoji: gesture.emoji,
        label: gesture.label,
        feel: feelData || '(no feel)'
      })
    }

    onAddTactileStamp?.(
      selectedGesture, 
      gesture.emoji,
      feelData?.feelId,
      feelData?.feelEmoji,
      feelData?.feelLabel
    )
    onClose()
  }

  if (activePanel === 'none') {
    return null
  }

  // 当正在选择区域时，隐藏面板让用户可以在PDF上绘制
  if (isSelectingRegion) {
    return null
  }

  // 步数调整函数
  const incrementSteps = () => {
    if (steps < 8) {
      const newSteps = steps + 1
      setSteps(newSteps)
      setSelectedSticker(null) // 重置选择
    }
  }

  const decrementSteps = () => {
    if (steps > 2) {
      const newSteps = steps - 1
      setSteps(newSteps)
      setSelectedSticker(null) // 重置选择
    }
  }

  // 重复次数调整函数
  const incrementRepeats = () => {
    if (repeats < 12) {
      const newRepeats = repeats + 1
      setRepeats(newRepeats)
      setSelectedSticker(null) // 重置选择
    }
  }

  const decrementRepeats = () => {
    if (repeats > 2) {
      const newRepeats = repeats - 1
      setRepeats(newRepeats)
      setSelectedSticker(null) // 重置选择
    }
  }

  // 获取当前配置的贴纸选项
  const availableStickers = activePanel === 'rhythm' 
    ? getRhythmStickers(steps, repeats)
    : []

  // 自动选择第一个贴纸（如果还未选择）
  if (activePanel === 'rhythm' && !selectedSticker && availableStickers.length > 0) {
    setSelectedSticker(availableStickers[0].stickerId)
  }

  // 放置标记处理函数
  const handlePlaceStamp = () => {
    if (!selectedSticker) return

    if (import.meta.env.DEV) {
      console.log('📍 放置节奏标记:', {
        steps,
        repeats,
        stickerId: selectedSticker,
        currentPage
      })
    }

    // 调用 ReaderPage 提供的回调函数
    if (onAddRhythmStamp) {
      onAddRhythmStamp(steps, repeats, selectedSticker)
    }
    
    // 自动关闭面板
    onClose()
  }

  const renderRhythmPanel = () => (
    <div className="rhythm-panel">
      {/* 首次使用提示 */}
      {showRhythmHint && (
        <div className="rhythm-hint">
          <span className="hint-text">💡 尝试不同的节奏组合</span>
          <button 
            className="hint-dismiss"
            onClick={dismissRhythmHint}
            title="不再显示"
          >
            ✕
          </button>
        </div>
      )}

      {/* 步数选择器 */}
      <div className="control-group">
        <label className="control-label">步数</label>
        <div className="stepper">
          <button 
            className="stepper-btn" 
            onClick={decrementSteps}
            disabled={steps <= 2}
            title="减少步数"
          >
            −
          </button>
          <div className="stepper-value">{steps}</div>
          <button 
            className="stepper-btn" 
            onClick={incrementSteps}
            disabled={steps >= 8}
            title="增加步数"
          >
            +
          </button>
        </div>
        <div className="control-hint">范围: 2-8</div>
      </div>

      {/* 重复次数选择器 */}
      <div className="control-group">
        <label className="control-label">重复次数</label>
        <div className="stepper">
          <button 
            className="stepper-btn" 
            onClick={decrementRepeats}
            disabled={repeats <= 2}
            title="减少重复次数"
          >
            −
          </button>
          <div className="stepper-value">{repeats}</div>
          <button 
            className="stepper-btn" 
            onClick={incrementRepeats}
            disabled={repeats >= 12}
            title="增加重复次数"
          >
            +
          </button>
        </div>
        <div className="control-hint">范围: 2-12</div>
      </div>

      {/* 贴纸选择器 */}
      <div className="control-group">
        <label className="control-label">选择贴纸样式</label>
        <div className="sticker-grid">
          {availableStickers.map((sticker) => (
            <button
              key={sticker.stickerId}
              className={`sticker-card ${selectedSticker === sticker.stickerId ? 'selected' : ''}`}
              onClick={() => setSelectedSticker(sticker.stickerId)}
              title={sticker.description || sticker.label}
            >
              <div className="sticker-visual">{sticker.visual}</div>
              <div className="sticker-label">{sticker.label}</div>
              <div className="sticker-meta">{steps}×{repeats}</div>
            </button>
          ))}
        </div>
      </div>

      {/* 放置按钮 */}
      <div className="panel-actions">
        <button
          className="btn-primary"
          onClick={handlePlaceStamp}
          disabled={!selectedSticker}
          title={selectedSticker ? '放置节奏标记到当前页面' : '请先选择贴纸样式'}
        >
          放置节奏标记
        </button>
      </div>
    </div>
  )

  // 渲染 Form Panel
  const renderFormPanel = () => (
    <div className="form-panel">
      {/* 如果正在选择区域，显示提示信息 */}
      {isSelectingRegion && (
        <div className="region-selection-info">
          <div className="info-content">
            <span className="info-icon">�️</span>
            <span className="info-text">拖动鼠标绘制矩形区域...</span>
          </div>
        </div>
      )}
      
      {/* 如果已选择区域，显示区域信息和轮廓预览 */}
      {selectedRegion && !isSelectingRegion && (
        <div className="region-info">
          <div className="info-header">
            <span className="info-icon">✅</span>
            <span className="info-title">已选择区域</span>
          </div>
          <div className="region-details">
            <span className="detail-label">位置:</span>
            <span className="detail-value">
              ({Math.round(selectedRegion.region.x)}, {Math.round(selectedRegion.region.y)})
            </span>
            <span className="detail-label">尺寸:</span>
            <span className="detail-value">
              {Math.round(selectedRegion.region.width)} × {Math.round(selectedRegion.region.height)}
            </span>
          </div>
          
          {/* 轮廓预览 */}
          {selectedRegion.silhouette && (
            <div className="silhouette-preview">
              <div className="preview-label">形状轮廓:</div>
              <div className="preview-image-container">
                <img 
                  src={selectedRegion.silhouette.dataUrl} 
                  alt="区域轮廓"
                  className="preview-image"
                  style={{
                    width: `${selectedRegion.silhouette.width}px`,
                    height: `${selectedRegion.silhouette.height}px`
                  }}
                />
              </div>
              <div className="preview-hint">✨ 此轮廓将包含在标记中</div>
            </div>
          )}
        </div>
      )}
      
      {/* 如果既没有选择区域也不在选择中，说明出现了异常状态，重新触发选择 */}
      {!selectedRegion && !isSelectingRegion && (
        <div className="form-section">
          <h4 className="section-title">选择图形区域</h4>
          <p className="section-hint">拖动鼠标绘制矩形框选择图形区域</p>
          <button
            className="btn-scan"
            onClick={onStartRegionSelection}
            title="重新绘制区域"
          >
            🖱️ 重新绘制
          </button>
        </div>
      )}

      {/* 提示模板列表（只有选择区域后才显示） */}
      {selectedRegion && !isSelectingRegion && (
        <>
          <div className="form-section">
            <h4 className="section-title">选择提示问题</h4>
            <div className="prompt-list">
              {FORM_PROMPTS.map((prompt) => (
                <button
                  key={prompt.promptId}
                  className={`prompt-card ${selectedPrompt === prompt.promptId ? 'selected' : ''}`}
                  onClick={() => setSelectedPrompt(prompt.promptId)}
                >
                  <span className="prompt-radio">
                    {selectedPrompt === prompt.promptId ? '●' : '○'}
                  </span>
                  <span className="prompt-text">{prompt.promptText}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 笔记输入 */}
          <div className="form-section">
            <label htmlFor="form-note-input" className="section-title">
              笔记（可选）
            </label>
            <input
              id="form-note-input"
              type="text"
              className="note-input"
              placeholder="添加你的笔记..."
              value={formNote}
              onChange={(e) => setFormNote(e.target.value.slice(0, 40))}
              maxLength={40}
            />
            <div className="char-count">{formNote.length}/40</div>
          </div>

          {/* 放置按钮 */}
          <div className="panel-actions">
            <button
              className="btn-primary"
              onClick={handlePlaceFormStamp}
              disabled={!selectedPrompt}
              title={selectedPrompt ? '放置形态标记到当前页面' : '请先选择提示问题'}
            >
              放置形态标记
            </button>
          </div>
        </>
      )}
    </div>
  )

  // 渲染 Tactile Panel
  const renderTactilePanel = () => (
    <div className="tactile-panel">
      {/* 手势选择区域 */}
      <div className="tactile-section">
        <h4 className="section-title">选择手势</h4>
        <div className="gesture-grid">
          {TACTILE_GESTURES.map((gesture) => (
            <button
              key={gesture.gestureId}
              className={`gesture-card ${selectedGesture === gesture.gestureId ? 'selected' : ''}`}
              onClick={() => setSelectedGesture(gesture.gestureId)}
              title={gesture.label}
            >
              <div className="gesture-emoji">{gesture.emoji}</div>
              <div className="gesture-label">{gesture.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Feel 选择区域（可选） */}
      <div className="tactile-section">
        <h4 className="section-title">
          添加触感 (可选)
          {selectedFeel && (
            <button 
              className="clear-feel-btn"
              onClick={() => setSelectedFeel(null)}
              title="清除触感选择"
            >
              ✕
            </button>
          )}
        </h4>
        <div className="feel-grid">
          {TACTILE_FEELS.map((feel) => (
            <button
              key={feel.feelId}
              className={`feel-card ${selectedFeel === feel.feelId ? 'selected' : ''}`}
              onClick={() => setSelectedFeel(feel.feelId)}
              title={feel.label}
            >
              <div className="feel-emoji">{feel.emoji}</div>
              <div className="feel-label">{feel.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* 放置按钮 */}
      <div className="panel-actions">
        <button
          className="btn-primary"
          onClick={handlePlaceTactileStamp}
          disabled={!selectedGesture}
          title={selectedGesture ? '放置触觉标记到当前页面' : '请先选择手势'}
        >
          放置触觉标记
        </button>
      </div>
    </div>
  )

  const getPanelContent = () => {
    switch (activePanel) {
      case 'rhythm':
        return {
          title: '节奏标记',
          icon: '♪',
          content: renderRhythmPanel()
        }
      case 'form':
        return {
          title: '形态标记',
          icon: '□',
          content: renderFormPanel()
        }
      case 'tactile':
        return {
          title: '触觉标记',
          icon: '✋',
          content: renderTactilePanel()
        }
      default:
        return null
    }
  }

  const panel = getPanelContent()
  if (!panel) return null

  return (
    <div className="stamp-panel-overlay" onClick={onClose}>
      <div className="stamp-panel" onClick={(e) => e.stopPropagation()}>
        <div className="panel-header">
          <div className="panel-title">
            <span className="panel-icon">{panel.icon}</span>
            <h3>{panel.title}</h3>
          </div>
          <button className="panel-close" onClick={onClose} title="关闭">
            ✕
          </button>
        </div>
        <div className="panel-content">
          {panel.content}
        </div>
      </div>
    </div>
  )
}

export default StampPanel

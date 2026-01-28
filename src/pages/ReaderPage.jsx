import { useState, useRef, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/TextLayer.css'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import { usePdf } from '../context/PdfContext'
import { loadStampsByPage, saveStampsByPage, createStamp, createRhythmStamp, createFormStamp, createTactileStamp } from '../utils/stampStorage'
import StampLayer from '../components/StampLayer'
import StampToolbar from '../components/StampToolbar'
import StampPanel from '../components/StampPanel'
import OnboardingOverlay from '../components/OnboardingOverlay'
import DebugPanel from '../components/DebugPanel'
import ManualRegionSelector from '../components/ManualRegionSelector'
import './ReaderPage.css'

// 配置 PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DEV-ONLY SELF-TEST CHECKLIST (E2E Manual Test)
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * PREREQUISITE: Open Browser DevTools Console before starting
 * 
 * TEST STEPS (FIT-SCALE MODEL):
 * ──────────────────────────────
 * 1) Import a PDF file
 *    - Navigate to page 4
 *    - Adjust userZoom to 1.25 (125%) using zoom controls
 *    - Console should show: 
 *      "SAVE reader_state" with { lastPage: 4, lastZoom: 1.25 }
 *      "→ Persisting userZoom: 1.25 (not finalScale)"
 * 
 * 2) Add a stamp on page 4
 *    - Click "＋ 添加标记" button
 *    - Drag stamp to a new position (e.g., center of page)
 *    - Console should show: "SAVE stamps" with page 4 data
 * 
 * 3) Click "← 返回" to go back to ImportPage
 *    - Import the SAME PDF file again (same file = same SHA-256 hash = same pdfId)
 *    - Console should show: 
 *      "LOAD reader_state" with { lastPage: 4, lastZoom: 1.25 }
 *      "→ userZoom will be restored to: 1.25"
 *      "→ fitScale will be recomputed on page load"
 *      "→ finalScale = fitScale × userZoom"
 * 
 *    ✅ EXPECTED BEHAVIOR:
 *       - Page is restored to 4 (check page indicator)
 *       - userZoom is restored to 1.25 (check zoom button shows "125%")
 *       - fitScale is recomputed based on current container size
 *       - finalScale = fitScale × 1.25 (check DebugPanel if visible)
 *       - Stamp exists on page 4 at the same position (aligned with PDF content)
 * 
 * 4) Test zoom/scroll alignment:
 *    - Set userZoom to 1.5 (150%) → PDF becomes larger than container
 *    - Verify scrollbars appear in viewer area (not whole page)
 *    - Scroll PDF content → stamps should move with PDF (stay aligned)
 *    - Set userZoom to 0.75 (75%) → PDF fits in container
 *    - Verify no scrollbars, stamps still aligned
 * 
 * 5) Test window resize:
 *    - Set userZoom to 1.25
 *    - Resize browser window → fitScale recomputes, userZoom stays 1.25
 *    - Verify stamps remain aligned to PDF content
 * 
 * HOW IT WORKS (Fit-Scale Model):
 * ────────────────────────────────
 * - Each PDF file has a unique identifier: pdfId = first 24 chars of SHA-256 hash
 * - Same file ALWAYS produces the same pdfId (content-based, not filename-based)
 * - localStorage keys: ltp_mvp::{pdfId}::reader_state and ltp_mvp::{pdfId}::stamps
 * - reader_state persists: { lastPage, lastZoom } where lastZoom = userZoom (NOT finalScale)
 * 
 * Zoom Calculation:
 * - fitScale = min(containerWidth/pageWidth, containerHeight/pageHeight)
 * - finalScale = fitScale × userZoom
 * - userZoom is user-controlled (0.5 - 3.0), persisted to localStorage
 * - fitScale is auto-computed from container size, NOT persisted
 * 
 * Stamp Positioning:
 * - Stamps use normalized coordinates (0-1) relative to page
 * - Rendered position = normalized × renderedPageSize
 * - renderedPageSize = pageDimensions × finalScale
 * - Stamps overlay PDF in shared position:relative container
 * 
 * FAILURE DIAGNOSIS:
 * ──────────────────
 * If ANY step fails, the console will automatically log:
 *   - [PERSISTENCE CHECK] current pdfId, page, userZoom, fitScale, finalScale
 *   - [PERSISTENCE CHECK] localStorage keys used
 *   - [PERSISTENCE CHECK] localStorage raw values
 * 
 * Run manual verification by typing in console:
 *   window.__verifyPersistence()
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

function ReaderPage() {
  const { pdfId } = useParams()
  const navigate = useNavigate()
  const { currentPdf, clearPdf } = usePdf()
  
  const [numPages, setNumPages] = useState(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [userZoom, setUserZoom] = useState(1.0)
  const [pageDimensions, setPageDimensions] = useState({ width: 0, height: 0 })
  const [stageWidth, setStageWidth] = useState(0)
  const [stageHeight, setStageHeight] = useState(0)
  const [renderedPageSize, setRenderedPageSize] = useState({ width: 0, height: 0 })
  const [stampsByPage, setStampsByPage] = useState({})
  const [activePanel, setActivePanel] = useState('none')
  const [showOnboarding, setShowOnboarding] = useState(false)
  
  // Form Path 区域选择状态
  const [isSelectingRegion, setIsSelectingRegion] = useState(false)
  const [selectedRegion, setSelectedRegion] = useState(null)
  const pdfCanvasRef = useRef(null)

  // 计算容器驱动的缩放比例
  const fitScale = useMemo(() => {
    if (!pageDimensions.width || !pageDimensions.height || !stageWidth || !stageHeight) {
      return 1.0
    }
    
    const fitWidthScale = stageWidth / pageDimensions.width
    const fitHeightScale = stageHeight / pageDimensions.height
    const computedFitScale = Math.min(fitWidthScale, fitHeightScale)
    
    if (import.meta.env.DEV) {
      console.log('[fitScale calculation]', {
        pageDimensions,
        stageSize: { width: stageWidth, height: stageHeight },
        fitWidthScale: fitWidthScale.toFixed(3),
        fitHeightScale: fitHeightScale.toFixed(3),
        fitScale: computedFitScale.toFixed(3)
      })
    }
    
    return computedFitScale
  }, [pageDimensions.width, pageDimensions.height, stageWidth, stageHeight])

  // 最终缩放 = fitScale × userZoom
  const finalScale = fitScale * userZoom

  // DEV-only: Log state on every render
  if (import.meta.env.DEV) {
    console.log('[ReaderPage Render]', {
      pdfId,
      currentPage: pageNumber,
      userZoom,
      fitScale: fitScale.toFixed(3),
      finalScale: finalScale.toFixed(3),
      hasPdfId: !!pdfId,
      hasCurrentPdf: !!currentPdf,
      pdfIdMatch: currentPdf?.pdfId === pdfId
    })
  }
  
  const pdfStageRef = useRef(null)
  const pdfPageRef = useRef(null)
  const hasLoadedState = useRef(false)
  const hasLoadedStamps = useRef(false)
  
  const storageKey = useMemo(() => `ltp_mvp::${pdfId}::reader_state`, [pdfId])
  const onboardingKey = useMemo(() => `ltp_mvp::${pdfId}::onboarding_seen`, [pdfId])

  // 检查是否需要显示引导覆盖层
  useEffect(() => {
    if (!pdfId) return

    try {
      const onboardingSeen = localStorage.getItem(onboardingKey)
      if (!onboardingSeen) {
        setShowOnboarding(true)
      }
    } catch (error) {
      console.error('检查引导状态失败:', error)
    }
  }, [pdfId, onboardingKey])

  // 从 localStorage 加载保存的阅读状态（当 pdfId 变化时）
  useEffect(() => {
    if (!pdfId) return

    // 重置状态标志
    hasLoadedState.current = false
    
    // 重置为默认值
    setPageNumber(1)
    setUserZoom(1.0)
    setNumPages(null)
    setPageDimensions({ width: 0, height: 0 })

    try {
      const savedState = localStorage.getItem(storageKey)
      if (savedState) {
        const { lastPage, lastZoom } = JSON.parse(savedState)
        
        if (import.meta.env.DEV) {
          console.log('LOAD reader_state', pdfId, storageKey, { lastPage, lastZoom })
          console.log('  → userZoom will be restored to:', lastZoom)
          console.log('  → fitScale will be recomputed on page load')
          console.log('  → finalScale = fitScale × userZoom')
        }
        
        if (typeof lastPage === 'number' && lastPage > 0) {
          setPageNumber(lastPage)
        }
        
        if (typeof lastZoom === 'number' && lastZoom > 0) {
          setUserZoom(lastZoom)
        }
      } else {
        if (import.meta.env.DEV) {
          console.log('LOAD reader_state', pdfId, storageKey, 'empty (no data)')
        }
      }
    } catch (error) {
      console.error('加载保存的阅读状态失败:', error)
    }

    // 标记状态已加载，允许保存
    // 必须延迟设置，确保 setPageNumber 和 setScale 已经完成
    const timer = setTimeout(() => {
      hasLoadedState.current = true
      
      if (import.meta.env.DEV) {
        console.log('✅ [READER STATE LOADED] Ready to save reader_state for pdfId:', pdfId)
      }
    }, 50) // 等待state更新完成

    return () => clearTimeout(timer)
  }, [pdfId, storageKey])

  // 加载 Stamps 数据
  useEffect(() => {
    if (!pdfId) return

    // 重置标志 - 防止在加载期间保存
    hasLoadedStamps.current = false

    const stamps = loadStampsByPage(pdfId)
    setStampsByPage(stamps)

    // 标记stamps已加载，允许保存
    // 必须在下一个tick设置，确保setStampsByPage已经完成
    const timer = setTimeout(() => {
      hasLoadedStamps.current = true
      if (import.meta.env.DEV) {
        console.log('✅ [STAMPS LOADED] Ready to save stamps for pdfId:', pdfId)
      }
    }, 10) // 增加延迟确保state更新完成

    return () => clearTimeout(timer)
  }, [pdfId])

  // 保存阅读状态到 localStorage（当页码或缩放改变时）
  useEffect(() => {
    // 只在状态加载完成后才保存，避免覆盖恢复的值
    if (!pdfId || pageNumber < 1 || !hasLoadedState.current) return

    try {
      const state = {
        lastPage: pageNumber,
        lastZoom: userZoom
      }
      localStorage.setItem(storageKey, JSON.stringify(state))
      
      if (import.meta.env.DEV) {
        console.log('SAVE reader_state', pdfId, storageKey, state)
        console.log('  → Persisting userZoom:', userZoom, '(not finalScale)')
        console.log('  → finalScale is computed at runtime:', finalScale.toFixed(3))
      }
    } catch (error) {
      console.error('保存阅读状态失败:', error)
    }
  }, [pdfId, pageNumber, userZoom, storageKey])

  // 保存 Stamps 数据到 localStorage
  useEffect(() => {
    // 只在stamps加载完成后才保存，避免用空对象覆盖已有数据
    if (!pdfId || !hasLoadedStamps.current) {
      if (import.meta.env.DEV && pdfId && !hasLoadedStamps.current) {
        console.log('⏸️ [STAMPS SAVE BLOCKED] hasLoadedStamps is false, skipping save')
      }
      return
    }

    saveStampsByPage(pdfId, stampsByPage)
  }, [pdfId, stampsByPage])

  // 使用 ResizeObserver 监测 PdfStage 容器尺寸变化
  useEffect(() => {
    const pdfStage = pdfStageRef.current
    if (!pdfStage) return

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        setStageWidth(Math.round(width))
        setStageHeight(Math.round(height))
      }
    })

    resizeObserver.observe(pdfStage)

    return () => {
      resizeObserver.disconnect()
    }
  }, [])

  // DEV-ONLY: Persistence verification system
  useEffect(() => {
    if (!import.meta.env.DEV || !pdfId) return

    const verifyPersistence = () => {
      console.group('🔍 [PERSISTENCE CHECK]')
      
      // Current state
      console.log('Current pdfId:', pdfId)
      console.log('Current page:', pageNumber)
      console.log('Current userZoom:', userZoom)
      console.log('Current fitScale:', fitScale.toFixed(3))
      console.log('Current finalScale:', finalScale.toFixed(3))
      console.log('Stamps count:', Object.values(stampsByPage).reduce((sum, arr) => sum + arr.length, 0))
      
      // localStorage keys
      const readerStateKey = `ltp_mvp::${pdfId}::reader_state`
      const stampsKey = `ltp_mvp::${pdfId}::stamps`
      const onboardingKeyLocal = `ltp_mvp::${pdfId}::onboarding_seen`
      
      console.log('\nLocalStorage Keys:')
      console.log('  reader_state:', readerStateKey)
      console.log('  stamps:', stampsKey)
      console.log('  onboarding:', onboardingKeyLocal)
      
      // Raw values
      console.log('\nLocalStorage Raw Values:')
      try {
        const readerStateRaw = localStorage.getItem(readerStateKey)
        console.log('  reader_state:', readerStateRaw ? JSON.parse(readerStateRaw) : '(empty)')
      } catch (e) {
        console.error('  reader_state: ERROR -', e.message)
      }
      
      try {
        const stampsRaw = localStorage.getItem(stampsKey)
        if (stampsRaw) {
          const stampsParsed = JSON.parse(stampsRaw)
          const totalStamps = Object.values(stampsParsed).reduce((sum, arr) => sum + arr.length, 0)
          console.log('  stamps:', `${totalStamps} stamps across ${Object.keys(stampsParsed).length} pages`)
          console.log('    Pages with stamps:', Object.keys(stampsParsed).join(', '))
        } else {
          console.log('  stamps: (empty)')
        }
      } catch (e) {
        console.error('  stamps: ERROR -', e.message)
      }
      
      try {
        const onboardingRaw = localStorage.getItem(onboardingKeyLocal)
        console.log('  onboarding:', onboardingRaw || '(empty)')
      } catch (e) {
        console.error('  onboarding: ERROR -', e.message)
      }
      
      console.groupEnd()
    }

    // Expose to window for manual testing
    window.__verifyPersistence = verifyPersistence

    // Auto-verify on mount (after 500ms to let state settle)
    const timer = setTimeout(verifyPersistence, 500)

    return () => {
      clearTimeout(timer)
      delete window.__verifyPersistence
    }
  }, [pdfId, pageNumber, userZoom, finalScale, stampsByPage])

  // Guard: 缺少 pdfId（路由参数丢失）
  if (!pdfId) {
    return (
      <div className="reader-page">
        <div className="missing-file-container">
          <div className="missing-file-card">
            <h2>❌ 缺少 PDF ID</h2>
            <p>Missing pdfId. Please import the PDF again.</p>
            <p className="error-detail">路由参数丢失，无法加载 PDF。</p>
            <button className="back-button-large" onClick={() => {
              clearPdf()
              navigate('/')
            }}>
              返回导入页面
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Guard: 文件未加载或 pdfId 不匹配
  if (!currentPdf || currentPdf.pdfId !== pdfId) {
    return (
      <div className="reader-page">
        <div className="missing-file-container">
          <div className="missing-file-card">
            <h2>📄 文件未加载</h2>
            <p>请重新导入 PDF 文件</p>
            {pdfId && (
              <div className="pdf-id-info">
                <span>PDF ID:</span>
                <code>{pdfId}</code>
              </div>
            )}
            <button className="back-button-large" onClick={() => {
              clearPdf()
              navigate('/')
            }}>
              返回导入页面
            </button>
          </div>
        </div>
      </div>
    )
  }

  const handleDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages)
    // Clamp current page within [1, numPages]
    setPageNumber(prev => {
      const clamped = Math.max(1, Math.min(prev, numPages))
      if (import.meta.env.DEV && clamped !== prev) {
        console.log('Clamped page number:', prev, '→', clamped, '(numPages:', numPages, ')')
      }
      return clamped
    })
  }

  const handlePageLoadSuccess = (page) => {
    const viewport = page.getViewport({ scale: 1 })
    const { width, height } = viewport
    
    if (import.meta.env.DEV) {
      console.log('[Page loaded]', {
        page: pageNumber,
        dimensions: { width: Math.round(width), height: Math.round(height) },
        aspectRatio: (width / height).toFixed(3)
      })
    }
    
    setPageDimensions({ width, height })
  }

  // 计算实际渲染的 PDF 尺寸（应用 finalScale 后）
  useEffect(() => {
    if (pageDimensions.width && pageDimensions.height && finalScale) {
      const renderedWidth = pageDimensions.width * finalScale
      const renderedHeight = pageDimensions.height * finalScale
      setRenderedPageSize({ width: renderedWidth, height: renderedHeight })
      
      if (import.meta.env.DEV) {
        console.log('[Rendered page size]', {
          original: pageDimensions,
          finalScale: finalScale.toFixed(3),
          rendered: { 
            width: Math.round(renderedWidth), 
            height: Math.round(renderedHeight) 
          }
        })
      }
    }
  }, [pageDimensions.width, pageDimensions.height, finalScale])

  // 捕获 PDF canvas 元素用于区域扫描
  useEffect(() => {
    if (!pdfPageRef.current) return
    
    // react-pdf 渲染后，canvas 在 Page 组件内部
    const canvas = pdfPageRef.current.querySelector('canvas')
    if (canvas) {
      pdfCanvasRef.current = canvas
      
      if (import.meta.env.DEV) {
        console.log('[PDF Canvas] Captured:', {
          width: canvas.width,
          height: canvas.height,
          clientWidth: canvas.clientWidth,
          clientHeight: canvas.clientHeight
        })
      }
    } else if (import.meta.env.DEV) {
      console.warn('[PDF Canvas] Canvas not found in pdfPageRef')
    }
  }, [pageNumber, finalScale])

  // Form Path 区域选择处理
  const handleStartRegionSelection = () => {
    // 实时获取最新的 canvas（而不是使用 ref 缓存）
    const freshCanvas = pdfPageRef.current?.querySelector('canvas')
    
    if (!freshCanvas) {
      console.error('[RegionSelection] PDF canvas not found')
      alert('PDF 画布未找到，请稍后再试')
      return
    }
    
    // 验证 canvas 有效性
    if (freshCanvas.width === 0 || freshCanvas.height === 0) {
      console.error('[RegionSelection] Invalid canvas dimensions:', {
        width: freshCanvas.width,
        height: freshCanvas.height
      })
      alert('PDF 画布尺寸无效，请等待加载完成')
      return
    }
    
    // 更新 ref 为最新的 canvas
    pdfCanvasRef.current = freshCanvas
    
    if (import.meta.env.DEV) {
      console.log('[RegionSelection] Starting with FRESH canvas:', {
        width: freshCanvas.width,
        height: freshCanvas.height,
        timestamp: Date.now()
      })
    }
    
    setIsSelectingRegion(true)
    setSelectedRegion(null)
  }

  const handleRegionSelect = (region) => {
    if (import.meta.env.DEV) {
      console.log('[RegionSelection] Region selected:', region)
    }
    setSelectedRegion(region)
    setIsSelectingRegion(false)
    // Region (with silhouette) is selected, user will continue in Form panel
  }

  const handleCancelRegionSelection = () => {
    if (import.meta.env.DEV) {
      console.log('[RegionSelection] Cancelled')
    }
    setIsSelectingRegion(false)
    setSelectedRegion(null)
    // 取消选择时关闭Form面板
    setActivePanel('none')
  }

  const goToPrevPage = () => {
    setPageNumber(prev => Math.max(1, prev - 1))
  }

  const goToNextPage = () => {
    setPageNumber(prev => Math.min(numPages, prev + 1))
  }

  const zoomIn = () => {
    setUserZoom(prev => Math.min(3.0, prev + 0.25))
  }

  const zoomOut = () => {
    setUserZoom(prev => Math.max(0.5, prev - 0.25))
  }

  const resetZoom = () => {
    setUserZoom(1.0)
  }

  const handleBack = () => {
    if (import.meta.env.DEV) {
      console.log('🔙 [BACK BUTTON] Returning to import page')
      console.log('   Current state before leaving:')
      console.log('   - pdfId:', pdfId)
      console.log('   - page:', pageNumber)
      console.log('   - userZoom:', userZoom)
      console.log('   - finalScale:', finalScale.toFixed(3))
      console.log('   - stamps:', Object.values(stampsByPage).reduce((sum, arr) => sum + arr.length, 0))
      
      // 验证localStorage中的数据
      try {
        const readerStateKey = `ltp_mvp::${pdfId}::reader_state`
        const stampsKey = `ltp_mvp::${pdfId}::stamps`
        const readerState = localStorage.getItem(readerStateKey)
        const stamps = localStorage.getItem(stampsKey)
        console.log('   localStorage verification:')
        console.log('   - reader_state:', readerState ? JSON.parse(readerState) : 'NOT FOUND')
        console.log('   - stamps:', stamps ? `${Object.keys(JSON.parse(stamps)).length} pages` : 'NOT FOUND')
      } catch (e) {
        console.error('   localStorage verification error:', e)
      }
    }
    
    clearPdf()
    navigate('/')
  }

  const handleAddStamp = () => {
    if (!pdfId || !pageNumber) return

    const newStamp = createStamp({
      pdfId,
      page: pageNumber,
      type: 'generic',
      x: 0.85,
      y: 0.15,
      payload: {}
    })

    if (import.meta.env.DEV) {
      console.log('[addStamp]', {
        stampId: newStamp.id,
        page: pageNumber,
        x: newStamp.x,
        y: newStamp.y,
        type: newStamp.type
      })
    }

    setStampsByPage(prev => {
      const currentPageStamps = prev[pageNumber] || []
      return {
        ...prev,
        [pageNumber]: [...currentPageStamps, newStamp]
      }
    })
  }

  /**
   * 添加 Rhythm 标记（从 RhythmPanel）
   * 使用智能放置策略避免重叠
   */
  const handleAddRhythmStamp = (steps, repeats, stickerId) => {
    if (!pdfId || !pageNumber) return

    // 智能放置：计算不重叠的位置
    const currentPageStamps = stampsByPage[pageNumber] || []
    let x = 0.15  // 默认左侧
    let y = 0.15  // 默认顶部

    // 如果当前页已有标记，使用偏移策略
    if (currentPageStamps.length > 0) {
      const offset = (currentPageStamps.length % 5) * 0.08
      x = 0.15 + offset
      y = 0.15 + offset
      
      // 如果超出边界，重置到另一侧
      if (x > 0.8) x = 0.15
      if (y > 0.8) y = 0.15
    }

    const newStamp = createRhythmStamp({
      pdfId,
      page: pageNumber,
      x,
      y,
      steps,
      repeats,
      stickerId
    })

    if (import.meta.env.DEV) {
      console.log('[addRhythmStamp]', {
        stampId: newStamp.id,
        page: pageNumber,
        x: newStamp.x,
        y: newStamp.y,
        type: newStamp.type,
        payload: newStamp.payload
      })
    }

    setStampsByPage(prev => {
      const currentPageStamps = prev[pageNumber] || []
      return {
        ...prev,
        [pageNumber]: [...currentPageStamps, newStamp]
      }
    })
  }

  /**
   * 处理 Form 标记添加
   * 使用相同的智能放置策略
   */
  const handleAddFormStamp = (promptId, promptText, note, bbox, silhouetteData) => {
    if (!pdfId || !pageNumber) return

    // 智能放置：靠近选中区域但避免重叠
    let x = 0.15  // 默认左侧
    let y = 0.15  // 默认顶部

    if (bbox && renderedPageSize.width > 0 && renderedPageSize.height > 0) {
      // 计算选中区域的归一化坐标
      const regionCenterX = (bbox.x + bbox.w / 2) / renderedPageSize.width
      const regionCenterY = (bbox.y + bbox.h / 2) / renderedPageSize.height
      
      // 放置在区域右侧，偏移以避免重叠
      x = regionCenterX + (bbox.w / renderedPageSize.width) / 2 + 0.15
      y = regionCenterY - 0.1  // 略微上移
      
      // 确保在边界内
      x = Math.max(0.05, Math.min(0.75, x))
      y = Math.max(0.05, Math.min(0.85, y))
      
      if (import.meta.env.DEV) {
        console.log('[FormStamp] Placement near region:', {
          regionCenter: { x: regionCenterX, y: regionCenterY },
          stampPosition: { x, y }
        })
      }
    } else {
      // 无区域时使用偏移策略
      const currentPageStamps = stampsByPage[pageNumber] || []
      if (currentPageStamps.length > 0) {
        const offset = (currentPageStamps.length % 5) * 0.08
        x = 0.15 + offset
        y = 0.15 + offset
        
        if (x > 0.8) x = 0.15
        if (y > 0.8) y = 0.15
      }
    }

    // 构建 silhouette 对象
    let silhouette = { kind: 'none' }
    if (bbox) {
      silhouette = {
        kind: silhouetteData ? 'manual_bbox' : 'auto_placeholder',
        bbox,
        // 包含轮廓图像数据
        ...(silhouetteData && { silhouetteImage: silhouetteData })
      }
    }

    const newStamp = createFormStamp({
      pdfId,
      page: pageNumber,
      x,
      y,
      promptId,
      promptText,
      note,
      silhouette
    })

    if (import.meta.env.DEV) {
      console.log('[addFormStamp]', {
        stampId: newStamp.id,
        page: pageNumber,
        x: newStamp.x,
        y: newStamp.y,
        type: newStamp.type,
        payload: newStamp.payload,
        hasSilhouetteImage: !!silhouetteData
      })
    }

    setStampsByPage(prev => {
      const currentPageStamps = prev[pageNumber] || []
      return {
        ...prev,
        [pageNumber]: [...currentPageStamps, newStamp]
      }
    })
  }

  /**
   * 处理 Tactile 标记添加
   * 使用相同的智能放置策略
   * @param {string} gestureId - 手势 ID
   * @param {string} gestureEmoji - 手势 emoji
   * @param {string?} feelId - 触感 ID (可选)
   * @param {string?} feelEmoji - 触感 emoji (可选)
   * @param {string?} feelLabel - 触感标签 (可选)
   */
  const handleAddTactileStamp = (gestureId, gestureEmoji, feelId, feelEmoji, feelLabel) => {
    if (!pdfId || !pageNumber) return

    // 智能放置：计算不重叠的位置
    const currentPageStamps = stampsByPage[pageNumber] || []
    let x = 0.15  // 默认左侧
    let y = 0.15  // 默认顶部

    // 如果当前页已有标记，使用偏移策略
    if (currentPageStamps.length > 0) {
      const offset = (currentPageStamps.length % 5) * 0.08
      x = 0.15 + offset
      y = 0.15 + offset
      
      // 如果超出边界，重置到另一侧
      if (x > 0.8) x = 0.15
      if (y > 0.8) y = 0.15
    }

    const newStamp = createTactileStamp({
      pdfId,
      page: pageNumber,
      x,
      y,
      gestureId,
      gestureEmoji,
      feelId,
      feelEmoji,
      feelLabel
    })

    if (import.meta.env.DEV) {
      console.log('[addTactileStamp]', {
        stampId: newStamp.id,
        page: pageNumber,
        x: newStamp.x,
        y: newStamp.y,
        type: newStamp.type,
        payload: newStamp.payload
      })
    }

    setStampsByPage(prev => {
      const currentPageStamps = prev[pageNumber] || []
      return {
        ...prev,
        [pageNumber]: [...currentPageStamps, newStamp]
      }
    })
  }

  const handleStampPositionChange = (stampId, newX, newY) => {
    if (import.meta.env.DEV) {
      console.log('[updateStampPosition]', {
        stampId,
        newX,
        newY
      })
    }

    setStampsByPage(prev => {
      const updatedPages = { ...prev }
      
      // 找到包含该标记的页面并更新
      for (const page in updatedPages) {
        const pageStamps = updatedPages[page]
        const stampIndex = pageStamps.findIndex(s => s.id === stampId)
        
        if (stampIndex !== -1) {
          updatedPages[page] = [
            ...pageStamps.slice(0, stampIndex),
            { ...pageStamps[stampIndex], x: newX, y: newY },
            ...pageStamps.slice(stampIndex + 1)
          ]
          break
        }
      }
      
      return updatedPages
    })
  }

  /**
   * 更新 stamp 的 payload（用于 UI 状态等）
   */
  /**
   * 删除标记
   */
  const handleStampDelete = (stampId) => {
    if (import.meta.env.DEV) {
      console.log('[deleteStamp]', { stampId })
    }

    setStampsByPage(prev => {
      const updatedPages = { ...prev }
      
      // 找到包含该标记的页面并删除
      for (const page in updatedPages) {
        const pageStamps = updatedPages[page]
        const stampIndex = pageStamps.findIndex(s => s.id === stampId)
        
        if (stampIndex !== -1) {
          // 移除该标记
          const newPageStamps = [
            ...pageStamps.slice(0, stampIndex),
            ...pageStamps.slice(stampIndex + 1)
          ]
          
          // 如果该页没有标记了，移除整个页面键
          if (newPageStamps.length === 0) {
            delete updatedPages[page]
          } else {
            updatedPages[page] = newPageStamps
          }
          
          if (import.meta.env.DEV) {
            console.log('[deleteStamp] Removed from page', page, '- remaining:', newPageStamps.length)
          }
          break
        }
      }
      
      return updatedPages
    })
  }

  const handlePanelChange = (panelId) => {
    // 如果点击的是当前激活的面板，则关闭面板
    if (activePanel === panelId) {
      setActivePanel('none')
      // 关闭时重置Form状态
      if (panelId === 'form') {
        setIsSelectingRegion(false)
        setSelectedRegion(null)
      }
    } else {
      // 打开新面板时，如果是Form面板，清除之前的选择状态
      if (panelId === 'form') {
        setIsSelectingRegion(false)
        setSelectedRegion(null)
      }
      setActivePanel(panelId)
    }
  }

  const handlePanelClose = () => {
    setActivePanel('none')
    // Reset Form panel state when closing
    setIsSelectingRegion(false)
    setSelectedRegion(null)
  }

  const handleOnboardingDismiss = () => {
    try {
      localStorage.setItem(onboardingKey, '1')
      setShowOnboarding(false)
    } catch (error) {
      console.error('保存引导状态失败:', error)
      setShowOnboarding(false)
    }
  }

  return (
    <div className="reader-page">
      <header className="reader-header">
        <button className="back-button" onClick={handleBack}>
          ← 返回
        </button>
        <h2>{currentPdf.file.name}</h2>
      </header>
      
      <div className="reader-toolbar">
        <div className="page-controls">
          <button 
            onClick={goToPrevPage} 
            disabled={pageNumber <= 1}
            title="上一页"
          >
            ◀
          </button>
          <span className="page-indicator">
            {numPages ? `${pageNumber} / ${numPages}` : '加载中...'}
          </span>
          <button 
            onClick={goToNextPage} 
            disabled={pageNumber >= numPages}
            title="下一页"
          >
            ▶
          </button>
        </div>
        
        <div className="zoom-controls">
          <button onClick={zoomOut} disabled={userZoom <= 0.5} title="缩小">
            −
          </button>
          <button onClick={resetZoom} className="zoom-reset" title="重置缩放">
            {Math.round(userZoom * 100)}%
          </button>
          <button onClick={zoomIn} disabled={userZoom >= 3.0} title="放大">
            +
          </button>
        </div>
      </div>

      <main className="reader-content">
        <div className="pdf-stage" ref={pdfStageRef}>
          <div className="pdf-content-wrapper">
            <Document
              file={currentPdf.file}
              onLoadSuccess={handleDocumentLoadSuccess}
              loading={
                <div className="loading-message">
                  <div className="spinner-large"></div>
                  <p>正在加载 PDF...</p>
                </div>
              }
              error={
                <div className="error-message">
                  <p>❌ 加载 PDF 失败</p>
                  <button onClick={handleBack}>返回</button>
                </div>
              }
            >
              <div ref={pdfPageRef}>
                <Page 
                  pageNumber={pageNumber} 
                  scale={finalScale}
                  onLoadSuccess={handlePageLoadSuccess}
                  loading={
                    <div className="loading-message">
                      <div className="spinner-large"></div>
                    </div>
                  }
                />
              </div>
            </Document>
            <StampLayer 
              stamps={stampsByPage}
              currentPage={pageNumber}
              stageWidth={renderedPageSize.width}
              stageHeight={renderedPageSize.height}
              onStampPositionChange={handleStampPositionChange}
              onDelete={handleStampDelete}
              isSelectingRegion={isSelectingRegion}
            />
            
            {/* Manual Region Selector for Form Path */}
            {isSelectingRegion && pdfCanvasRef.current && (
              <ManualRegionSelector
                pdfCanvas={pdfCanvasRef.current}
                pageWidth={renderedPageSize.width}
                pageHeight={renderedPageSize.height}
                onRegionSelect={handleRegionSelect}
                onCancel={handleCancelRegionSelection}
              />
            )}
          </div>
        </div>
      </main>

      <StampToolbar 
        activePanel={activePanel}
        onPanelChange={handlePanelChange}
      />

      <StampPanel 
        activePanel={activePanel}
        onClose={handlePanelClose}
        onAddRhythmStamp={handleAddRhythmStamp}
        onAddFormStamp={handleAddFormStamp}
        onAddTactileStamp={handleAddTactileStamp}
        currentPage={pageNumber}
        pdfId={pdfId}
        onStartRegionSelection={handleStartRegionSelection}
        selectedRegion={selectedRegion}
        isSelectingRegion={isSelectingRegion}
      />

      {showOnboarding && (
        <OnboardingOverlay onDismiss={handleOnboardingDismiss} />
      )}

      {import.meta.env.DEV && (
        <DebugPanel
          pdfId={pdfId}
          currentPage={pageNumber}
          numPages={numPages}
          zoom={userZoom}
          fitScale={fitScale}
          finalScale={finalScale}
          stampsByPage={stampsByPage}
          containerSize={stageWidth && stageHeight ? { width: Math.round(stageWidth), height: Math.round(stageHeight) } : null}
          renderedPageSize={renderedPageSize}
          onAddStamp={handleAddStamp}
        />
      )}
    </div>
  )
}

export default ReaderPage

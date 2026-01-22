import { useState, useEffect } from 'react'
import './RegionSelector.css'
import { extractSimpleSilhouette } from '../utils/silhouetteExtractor'

/**
 * RegionSelector - Form Path 区域选择器
 * 扫描 PDF 页面，高亮候选区域，等待用户选择
 * 
 * @param {HTMLCanvasElement} pdfCanvas - PDF 渲染的 canvas 元素
 * @param {number} pageWidth - PDF 页面宽度（像素）
 * @param {number} pageHeight - PDF 页面高度（像素）
 * @param {function} onRegionSelect - 用户选择区域后的回调 (regionWithSilhouette) => void
 * @param {function} onCancel - 取消选择的回调
 */
function RegionSelector({ pdfCanvas, pageWidth, pageHeight, onRegionSelect, onCancel }) {
  const [regions, setRegions] = useState([])
  const [hoveredRegion, setHoveredRegion] = useState(null)
  const [isScanning, setIsScanning] = useState(true)
  const [isProcessingSilhouette, setIsProcessingSilhouette] = useState(false)

  // 执行区域扫描
  useEffect(() => {
    if (!pdfCanvas) {
      setIsScanning(false)
      return
    }

    const scanRegions = async () => {
      try {
        if (import.meta.env.DEV) {
          console.log('[RegionSelector] Starting scan...', {
            canvasWidth: pdfCanvas.width,
            canvasHeight: pdfCanvas.height,
            pageWidth,
            pageHeight
          })
        }

        const detectedRegions = await detectRegions(pdfCanvas)
        
        if (import.meta.env.DEV) {
          console.log('[RegionSelector] Detected regions:', detectedRegions)
        }

        setRegions(detectedRegions)
        setIsScanning(false)
      } catch (error) {
        console.error('[RegionSelector] Scan failed:', error)
        setIsScanning(false)
      }
    }

    scanRegions()
  }, [pdfCanvas, pageWidth, pageHeight])

  const handleRegionClick = (region) => {
    if (import.meta.env.DEV) {
      console.log('[RegionSelector] Region selected:', region)
    }
    
    // 提取轮廓
    setIsProcessingSilhouette(true)
    extractSimpleSilhouette(pdfCanvas, region, {
      threshold: 128,
      invert: true,  // 黑色形状，白色背景
      maxWidth: 150,
      maxHeight: 150
    })
      .then(silhouette => {
        if (import.meta.env.DEV) {
          console.log('[RegionSelector] Silhouette extracted:', {
            width: silhouette.width,
            height: silhouette.height,
            dataUrlLength: silhouette.dataUrl.length
          })
        }
        
        // 返回区域和轮廓数据
        onRegionSelect({
          region,
          silhouette
        })
      })
      .catch(error => {
        console.error('[RegionSelector] Silhouette extraction failed:', error)
        // 即使提取失败，也返回区域（不带轮廓）
        onRegionSelect({ region, silhouette: null })
      })
      .finally(() => {
        setIsProcessingSilhouette(false)
      })
  }

  return (
    <div className="region-selector-overlay">
      <div className="region-selector-header">
        <div className="header-content">
          <span className="header-title">
            {isScanning ? '🔍 扫描页面中...' : 
             isProcessingSilhouette ? '✨ 提取轮廓中...' :
             `✨ 发现 ${regions.length} 个候选区域`}
          </span>
          <button className="cancel-btn" onClick={onCancel} title="取消" disabled={isProcessingSilhouette}>
            ✕ 取消
          </button>
        </div>
      </div>

      {isScanning ? (
        <div className="scanning-indicator">
          <div className="spinner"></div>
          <p>分析页面图形...</p>
        </div>
      ) : isProcessingSilhouette ? (
        <div className="scanning-indicator">
          <div className="spinner"></div>
          <p>提取形状轮廓...</p>
        </div>
      ) : (
        <>
          {regions.length === 0 ? (
            <div className="no-regions-message">
              <p>😕 未检测到明显的图形区域</p>
              <p className="hint">尝试其他页面或手动放置标记</p>
            </div>
          ) : (
            <div className="regions-hint">
              <p>💡 点击高亮区域选择要标记的图形</p>
            </div>
          )}

          {/* 高亮区域覆盖层 */}
          <div className="regions-container">
            {regions.map((region, index) => (
              <div
                key={index}
                className={`region-highlight ${hoveredRegion === index ? 'hovered' : ''}`}
                style={{
                  left: `${region.x}px`,
                  top: `${region.y}px`,
                  width: `${region.width}px`,
                  height: `${region.height}px`
                }}
                onClick={() => handleRegionClick(region)}
                onMouseEnter={() => setHoveredRegion(index)}
                onMouseLeave={() => setHoveredRegion(null)}
                title={`区域 ${index + 1}: ${Math.round(region.width)}×${Math.round(region.height)}`}
              >
                <div className="region-label">
                  {index + 1}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

/**
 * 检测 PDF canvas 中的候选图形区域
 * 使用启发式算法：边缘密度、对比度块、面积大小
 * 
 * @param {HTMLCanvasElement} canvas - PDF 渲染的 canvas
 * @returns {Promise<Array>} 区域列表 [{ x, y, width, height }, ...]
 */
async function detectRegions(canvas) {
  return new Promise((resolve) => {
    try {
      const ctx = canvas.getContext('2d')
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const { width, height, data } = imageData

      // 启发式算法：简化版区域检测
      // 1. 将图像分成网格块（16x16 像素）
      // 2. 计算每个块的"内容密度"（非白色像素比例）
      // 3. 合并相邻的高密度块
      // 4. 返回最大的几个区域

      const blockSize = 16
      const cols = Math.floor(width / blockSize)
      const rows = Math.floor(height / blockSize)
      const densityMap = []

      // 计算每个块的密度
      for (let row = 0; row < rows; row++) {
        const rowData = []
        for (let col = 0; col < cols; col++) {
          const x = col * blockSize
          const y = row * blockSize
          const density = calculateBlockDensity(data, width, x, y, blockSize)
          rowData.push(density)
        }
        densityMap.push(rowData)
      }

      // 找到高密度块（阈值：> 0.15）
      const threshold = 0.15
      const highDensityBlocks = []
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          if (densityMap[row][col] > threshold) {
            highDensityBlocks.push({ row, col })
          }
        }
      }

      // 合并相邻块成区域（简单版：使用连通组件标记）
      const regions = mergeBlocks(highDensityBlocks, rows, cols, blockSize)

      // 过滤掉太小的区域（< 50x50 像素）
      const minSize = 50
      const validRegions = regions.filter(r => r.width >= minSize && r.height >= minSize)

      // 按面积排序，返回最大的 8 个区域
      validRegions.sort((a, b) => (b.width * b.height) - (a.width * a.height))
      const topRegions = validRegions.slice(0, 8)

      resolve(topRegions)
    } catch (error) {
      console.error('[detectRegions] Error:', error)
      resolve([])
    }
  })
}

/**
 * 计算块的密度（非白色像素比例）
 */
function calculateBlockDensity(data, width, startX, startY, blockSize) {
  let nonWhitePixels = 0
  let totalPixels = 0

  for (let dy = 0; dy < blockSize; dy++) {
    for (let dx = 0; dx < blockSize; dx++) {
      const x = startX + dx
      const y = startY + dy
      const index = (y * width + x) * 4

      if (index < data.length - 3) {
        const r = data[index]
        const g = data[index + 1]
        const b = data[index + 2]
        
        // 判断是否为白色（RGB > 240）
        const isWhite = r > 240 && g > 240 && b > 240
        if (!isWhite) {
          nonWhitePixels++
        }
        totalPixels++
      }
    }
  }

  return totalPixels > 0 ? nonWhitePixels / totalPixels : 0
}

/**
 * 合并相邻的高密度块成区域
 * 使用简化的连通组件算法
 */
function mergeBlocks(blocks, rows, cols, blockSize) {
  if (blocks.length === 0) return []

  // 创建访问标记
  const visited = new Set()
  const regions = []

  // 对每个未访问的块执行 BFS
  for (const block of blocks) {
    const key = `${block.row},${block.col}`
    if (visited.has(key)) continue

    // BFS 找连通区域
    const region = bfsRegion(block, blocks, visited)
    
    // 计算区域边界框
    const minRow = Math.min(...region.map(b => b.row))
    const maxRow = Math.max(...region.map(b => b.row))
    const minCol = Math.min(...region.map(b => b.col))
    const maxCol = Math.max(...region.map(b => b.col))

    regions.push({
      x: minCol * blockSize,
      y: minRow * blockSize,
      width: (maxCol - minCol + 1) * blockSize,
      height: (maxRow - minRow + 1) * blockSize
    })
  }

  return regions
}

/**
 * BFS 查找连通区域
 */
function bfsRegion(startBlock, allBlocks, visited) {
  const region = []
  const queue = [startBlock]
  const blockSet = new Set(allBlocks.map(b => `${b.row},${b.col}`))

  while (queue.length > 0) {
    const current = queue.shift()
    const key = `${current.row},${current.col}`
    
    if (visited.has(key)) continue
    visited.add(key)
    region.push(current)

    // 检查 4 邻域
    const neighbors = [
      { row: current.row - 1, col: current.col },
      { row: current.row + 1, col: current.col },
      { row: current.row, col: current.col - 1 },
      { row: current.row, col: current.col + 1 }
    ]

    for (const neighbor of neighbors) {
      const neighborKey = `${neighbor.row},${neighbor.col}`
      if (!visited.has(neighborKey) && blockSet.has(neighborKey)) {
        queue.push(neighbor)
      }
    }
  }

  return region
}

export default RegionSelector

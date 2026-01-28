/**
 * silhouetteExtractor.js - 从选定区域提取简化轮廓
 * 
 * 生成形态标记的"形状阴影"表示
 */

/**
 * 从 PDF canvas 的指定区域提取简化轮廓
 * 
 * @param {HTMLCanvasElement} sourceCanvas - PDF 渲染的 canvas
 * @param {Object} region - 区域边界框 { x, y, width, height }
 * @param {Object} options - 处理选项
 * @param {number} options.threshold - 二值化阈值 (0-255, 默认 128)
 * @param {boolean} options.invert - 是否反转颜色 (默认 false: 黑色轮廓+白色背景)
 * @param {number} options.maxWidth - 输出最大宽度 (默认 200px)
 * @param {number} options.maxHeight - 输出最大高度 (默认 200px)
 * @returns {Promise<Object>} { dataUrl, width, height, originalRegion }
 */
export async function extractSilhouette(sourceCanvas, region, options = {}) {
  const {
    threshold = 128,
    invert = false,  // 默认不反转：深色内容为黑色轮廓，适合浅色背景显示
    maxWidth = 200,
    maxHeight = 200
  } = options

  if (import.meta.env.DEV) {
    console.log('[Silhouette] Extracting from region:', region, 'options:', options)
  }

  try {
    // 1. 裁剪区域
    const croppedCanvas = cropRegion(sourceCanvas, region)
    
    // 2. 缩放到合适尺寸（保持比例）
    const scaledCanvas = scaleCanvas(croppedCanvas, maxWidth, maxHeight)
    
    // 3. 转换为灰度
    const grayscaleCanvas = convertToGrayscale(scaledCanvas)
    
    // 4. 应用阈值生成二值轮廓
    const silhouetteCanvas = applyThreshold(grayscaleCanvas, threshold, invert)
    
    // 5. 可选：边缘检测增强
    const enhancedCanvas = enhanceEdges(silhouetteCanvas)
    
    // 6. 转换为 data URL
    const dataUrl = enhancedCanvas.toDataURL('image/png')
    
    if (import.meta.env.DEV) {
      console.log('[Silhouette] Generated:', {
        width: enhancedCanvas.width,
        height: enhancedCanvas.height,
        dataUrlLength: dataUrl.length
      })
    }

    return {
      dataUrl,
      width: enhancedCanvas.width,
      height: enhancedCanvas.height,
      originalRegion: region
    }
  } catch (error) {
    console.error('[Silhouette] Extraction failed:', error)
    throw error
  }
}

/**
 * 从源 canvas 裁剪指定区域
 * 重要：创建一个"干净"的 canvas 以避免 tainted canvas 问题（屏幕录制等场景）
 */
function cropRegion(sourceCanvas, region) {
  const { x, y, width, height } = region
  
  // 确保边界在 canvas 范围内
  const cropX = Math.max(0, Math.floor(x))
  const cropY = Math.max(0, Math.floor(y))
  const cropW = Math.min(width, sourceCanvas.width - cropX)
  const cropH = Math.min(height, sourceCanvas.height - cropY)
  
  // 验证裁剪区域有效性
  if (cropW <= 0 || cropH <= 0) {
    const error = new Error(`Invalid crop region: width=${cropW}, height=${cropH}`)
    if (import.meta.env.DEV) {
      console.error('[Silhouette] Crop region invalid:', {
        sourceCanvas: { width: sourceCanvas.width, height: sourceCanvas.height },
        region,
        calculated: { cropX, cropY, cropW, cropH }
      })
    }
    throw error
  }
  
  // 创建新的"干净" canvas
  const canvas = document.createElement('canvas')
  canvas.width = cropW
  canvas.height = cropH
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  
  // 填充白色背景（防止透明区域）
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, cropW, cropH)
  
  try {
    // 方法1: 尝试直接绘制（可能会因 tainted canvas 失败）
    ctx.drawImage(
      sourceCanvas,
      cropX, cropY, cropW, cropH,  // 源区域
      0, 0, cropW, cropH            // 目标区域
    )
    
    if (import.meta.env.DEV) {
      console.log('[Silhouette] Cropped via drawImage:', { width: cropW, height: cropH })
    }
  } catch (drawError) {
    // 方法2: 如果 drawImage 失败，使用 getImageData（绕过 tainted 限制）
    console.warn('[Silhouette] drawImage failed, using getImageData fallback:', drawError)
    
    try {
      const sourceCtx = sourceCanvas.getContext('2d')
      const imageData = sourceCtx.getImageData(cropX, cropY, cropW, cropH)
      ctx.putImageData(imageData, 0, 0)
      
      if (import.meta.env.DEV) {
        console.log('[Silhouette] Cropped via getImageData:', { width: cropW, height: cropH })
      }
    } catch (getImageDataError) {
      console.error('[Silhouette] getImageData also failed:', getImageDataError)
      // 创建一个灰色占位符
      ctx.fillStyle = '#cccccc'
      ctx.fillRect(0, 0, cropW, cropH)
      ctx.fillStyle = '#666666'
      ctx.font = '12px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('无法读取', cropW / 2, cropH / 2)
    }
  }
  
  return canvas
}

/**
 * 缩放 canvas 到指定最大尺寸（保持宽高比）
 */
function scaleCanvas(sourceCanvas, maxWidth, maxHeight) {
  const { width, height } = sourceCanvas
  
  // 计算缩放比例
  const widthRatio = maxWidth / width
  const heightRatio = maxHeight / height
  const scale = Math.min(widthRatio, heightRatio, 1) // 不放大
  
  const newWidth = Math.floor(width * scale)
  const newHeight = Math.floor(height * scale)
  
  if (newWidth === width && newHeight === height) {
    return sourceCanvas // 无需缩放
  }
  
  const canvas = document.createElement('canvas')
  canvas.width = newWidth
  canvas.height = newHeight
  const ctx = canvas.getContext('2d')
  
  // 高质量缩放
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  
  ctx.drawImage(sourceCanvas, 0, 0, newWidth, newHeight)
  
  return canvas
}

/**
 * 转换为灰度图像
 */
function convertToGrayscale(sourceCanvas) {
  const canvas = document.createElement('canvas')
  canvas.width = sourceCanvas.width
  canvas.height = sourceCanvas.height
  const ctx = canvas.getContext('2d')
  
  ctx.drawImage(sourceCanvas, 0, 0)
  
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const data = imageData.data
  
  // 转换每个像素为灰度
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    
    // 使用标准灰度转换公式（加权平均）
    const gray = Math.floor(0.299 * r + 0.587 * g + 0.114 * b)
    
    data[i] = gray     // R
    data[i + 1] = gray // G
    data[i + 2] = gray // B
    // Alpha 保持不变
  }
  
  ctx.putImageData(imageData, 0, 0)
  return canvas
}

/**
 * 应用阈值生成二值图像（黑白轮廓）
 * 
 * 逻辑说明：
 * - PDF 通常是白色背景（灰度值高）+ 黑色文字/图形（灰度值低）
 * - 不反转时：深色内容(gray < threshold) → 黑色(0)，浅色背景 → 白色(255)
 * - 反转时：深色内容 → 白色(255)，浅色背景 → 黑色(0)，这样轮廓会显示为白色形状
 */
function applyThreshold(sourceCanvas, threshold, invert) {
  const canvas = document.createElement('canvas')
  canvas.width = sourceCanvas.width
  canvas.height = sourceCanvas.height
  const ctx = canvas.getContext('2d')
  
  ctx.drawImage(sourceCanvas, 0, 0)
  
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const data = imageData.data
  
  // 二值化处理
  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i] // 已经是灰度图，R=G=B
    
    // 根据阈值判断黑白
    // 深色(低灰度值) vs 浅色(高灰度值)
    const isDark = gray < threshold
    
    let value
    if (invert) {
      // 反转：深色内容显示为白色，浅色背景为黑色（反色轮廓）
      value = isDark ? 255 : 0
    } else {
      // 不反转：保持原样，深色为黑色，浅色为白色
      value = isDark ? 0 : 255
    }
    
    data[i] = value     // R
    data[i + 1] = value // G
    data[i + 2] = value // B
    // Alpha 保持不变
  }
  
  ctx.putImageData(imageData, 0, 0)
  return canvas
}

/**
 * 边缘检测增强（简化版 Sobel 算子）
 */
function enhanceEdges(sourceCanvas) {
  const canvas = document.createElement('canvas')
  canvas.width = sourceCanvas.width
  canvas.height = sourceCanvas.height
  const ctx = canvas.getContext('2d')
  
  ctx.drawImage(sourceCanvas, 0, 0)
  
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const data = imageData.data
  const width = canvas.width
  const height = canvas.height
  
  // 创建输出数据副本
  const outputData = new Uint8ClampedArray(data)
  
  // Sobel 核 (3x3)
  const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1]
  const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1]
  
  // 对每个像素应用 Sobel 算子
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let gx = 0
      let gy = 0
      
      // 3x3 邻域卷积
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const idx = ((y + ky) * width + (x + kx)) * 4
          const pixel = data[idx] // 灰度值
          const kernelIdx = (ky + 1) * 3 + (kx + 1)
          
          gx += pixel * sobelX[kernelIdx]
          gy += pixel * sobelY[kernelIdx]
        }
      }
      
      // 计算梯度幅值
      const magnitude = Math.sqrt(gx * gx + gy * gy)
      const edgeValue = Math.min(255, magnitude)
      
      const idx = (y * width + x) * 4
      outputData[idx] = edgeValue
      outputData[idx + 1] = edgeValue
      outputData[idx + 2] = edgeValue
      // Alpha 保持不变
    }
  }
  
  // 创建新的 ImageData 并绘制
  const outputImageData = new ImageData(outputData, width, height)
  ctx.putImageData(outputImageData, 0, 0)
  
  return canvas
}

/**
 * 快速提取轮廓（仅二值化，不做边缘检测）
 * 用于需要快速预览的场景
 * 
 * 默认效果：黑色轮廓 + 白色/透明背景（适合在浅色卡片上显示）
 * 
 * 特别处理屏幕录制场景：通过多层处理确保生成的 canvas 不会被标记为 tainted
 */
export async function extractSimpleSilhouette(sourceCanvas, region, options = {}) {
  const {
    threshold = 128,
    invert = false,  // 默认不反转：深色内容显示为黑色轮廓，浅色背景为白色
    maxWidth = 150,
    maxHeight = 150
  } = options

  try {
    // 所有处理步骤都会创建新的"干净"canvas
    const croppedCanvas = cropRegion(sourceCanvas, region)
    const scaledCanvas = scaleCanvas(croppedCanvas, maxWidth, maxHeight)
    const grayscaleCanvas = convertToGrayscale(scaledCanvas)
    const silhouetteCanvas = applyThreshold(grayscaleCanvas, threshold, invert)
    
    // 这个 canvas 应该是完全干净的，因为所有源数据都经过了重新处理
    // 尝试多种方法转换为可用格式
    let dataUrl
    let conversionMethod = 'unknown'
    
    try {
      // 方法1: 标准 toDataURL
      dataUrl = silhouetteCanvas.toDataURL('image/png')
      conversionMethod = 'toDataURL'
      
      if (import.meta.env.DEV) {
        console.log('[Silhouette] toDataURL succeeded, length:', dataUrl.length)
      }
    } catch (toDataURLError) {
      console.warn('[Silhouette] toDataURL failed, trying toBlob:', toDataURLError.message)
      
      try {
        // 方法2: toBlob → 转换为 base64 data URL（持久化）
        const blob = await new Promise((resolve, reject) => {
          silhouetteCanvas.toBlob((blob) => {
            if (blob) resolve(blob)
            else reject(new Error('toBlob returned null'))
          }, 'image/png')
        })
        
        // 将 blob 转换为 base64 data URL（而不是 Object URL）
        dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result)
          reader.onerror = reject
          reader.readAsDataURL(blob)
        })
        
        conversionMethod = 'toBlob-to-base64'
        
        if (import.meta.env.DEV) {
          console.log('[Silhouette] toBlob→base64 succeeded, length:', dataUrl.length)
        }
      } catch (toBlobError) {
        console.warn('[Silhouette] toBlob failed, using manual encoding:', toBlobError.message)
        
        // 方法3: 手动编码 - 从 ImageData 创建干净的 canvas
        try {
          const imageData = silhouetteCanvas.getContext('2d').getImageData(
            0, 0, silhouetteCanvas.width, silhouetteCanvas.height
          )
          
          // 创建全新的干净 canvas
          const cleanCanvas = document.createElement('canvas')
          cleanCanvas.width = silhouetteCanvas.width
          cleanCanvas.height = silhouetteCanvas.height
          const cleanCtx = cleanCanvas.getContext('2d')
          cleanCtx.putImageData(imageData, 0, 0)
          
          // 尝试从干净的 canvas 导出
          dataUrl = cleanCanvas.toDataURL('image/png')
          conversionMethod = 'manual-clean-canvas'
          
          if (import.meta.env.DEV) {
            console.log('[Silhouette] Manual clean canvas succeeded')
          }
        } catch (manualError) {
          console.error('[Silhouette] All conversion methods failed:', manualError)
          
          // 方法4: SVG 占位符（最后备用）
          dataUrl = 'data:image/svg+xml,' + encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" width="${silhouetteCanvas.width}" height="${silhouetteCanvas.height}" viewBox="0 0 ${silhouetteCanvas.width} ${silhouetteCanvas.height}">
              <rect width="100%" height="100%" fill="#f8f8f8"/>
              <text x="50%" y="50%" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#999" dy=".3em">
                📷 录屏中
              </text>
            </svg>`
          )
          conversionMethod = 'svg-fallback'
          
          console.warn('[Silhouette] Using SVG placeholder due to canvas restrictions')
        }
      }
    }
    
    if (import.meta.env.DEV) {
      console.log('[Silhouette] Conversion method used:', conversionMethod)
    }
    
    // 验证 dataUrl 有效性
    if (!dataUrl || !dataUrl.startsWith('data:')) {
      console.error('[Silhouette] Invalid dataUrl generated:', dataUrl?.substring(0, 50))
      throw new Error(`Invalid dataUrl (method: ${conversionMethod})`)
    }
    
    return {
      dataUrl,
      width: silhouetteCanvas.width,
      height: silhouetteCanvas.height,
      originalRegion: region,
      conversionMethod  // 调试信息
    }
  } catch (error) {
    console.error('[Silhouette] Simple extraction failed:', error)
    throw error
  }
}

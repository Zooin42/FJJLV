/**
 * silhouetteNormalizer.js - 将轮廓标准化为固定大小的 Form Stamp
 * 
 * 确保所有 Form stamps 具有一致的尺寸，无论源区域大小
 */

/**
 * Form Stamp 标准尺寸常量
 */
export const FORM_STAMP_SIZE = {
  width: 160,
  height: 160
}

/**
 * 将轮廓图像标准化到固定大小的 stamp
 * 
 * @param {string} silhouetteDataUrl - 原始轮廓 data URL
 * @param {number} silhouetteWidth - 原始轮廓宽度
 * @param {number} silhouetteHeight - 原始轮廓高度
 * @param {Object} options - 标准化选项
 * @param {number} options.stampWidth - 目标 stamp 宽度 (默认 160)
 * @param {number} options.stampHeight - 目标 stamp 高度 (默认 160)
 * @param {string} options.backgroundColor - 背景颜色 (默认半透明灰)
 * @param {string} options.silhouetteColor - 轮廓颜色 (默认深灰)
 * @param {number} options.padding - 内边距 (默认 10px)
 * @returns {Promise<string>} 标准化后的 data URL
 */
export async function normalizeSilhouetteToStamp(
  silhouetteDataUrl,
  silhouetteWidth,
  silhouetteHeight,
  options = {}
) {
  const {
    stampWidth = FORM_STAMP_SIZE.width,
    stampHeight = FORM_STAMP_SIZE.height,
    backgroundColor = 'rgba(59, 130, 246, 0.15)', // 蓝色半透明
    silhouetteColor = 'rgba(30, 41, 59, 0.8)',    // 深灰
    padding = 10
  } = options

  if (import.meta.env.DEV) {
    console.log('[SilhouetteNormalizer] Normalizing:', {
      source: { width: silhouetteWidth, height: silhouetteHeight },
      target: { width: stampWidth, height: stampHeight },
      padding
    })
  }

  return new Promise((resolve, reject) => {
    const img = new Image()
    
    img.onload = () => {
      try {
        // 创建标准大小的 canvas
        const canvas = document.createElement('canvas')
        canvas.width = stampWidth
        canvas.height = stampHeight
        const ctx = canvas.getContext('2d')

        // 1. 绘制背景
        ctx.fillStyle = backgroundColor
        ctx.fillRect(0, 0, stampWidth, stampHeight)

        // 2. 计算缩放比例（保持宽高比）
        const availableWidth = stampWidth - padding * 2
        const availableHeight = stampHeight - padding * 2
        
        const scaleX = availableWidth / silhouetteWidth
        const scaleY = availableHeight / silhouetteHeight
        const scale = Math.min(scaleX, scaleY) // 适配最小边

        const scaledWidth = silhouetteWidth * scale
        const scaledHeight = silhouetteHeight * scale

        // 3. 计算居中位置
        const offsetX = (stampWidth - scaledWidth) / 2
        const offsetY = (stampHeight - scaledHeight) / 2

        // 4. 绘制缩放后的轮廓（居中）
        ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight)

        // 5. 应用单色处理（将黑色像素替换为指定颜色）
        const imageData = ctx.getImageData(0, 0, stampWidth, stampHeight)
        const data = imageData.data

        // 解析 silhouetteColor
        const colorMatch = silhouetteColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/)
        const targetR = colorMatch ? parseInt(colorMatch[1]) : 30
        const targetG = colorMatch ? parseInt(colorMatch[2]) : 41
        const targetB = colorMatch ? parseInt(colorMatch[3]) : 59
        const targetA = colorMatch && colorMatch[4] ? parseFloat(colorMatch[4]) * 255 : 204

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i]
          const g = data[i + 1]
          const b = data[i + 2]
          const a = data[i + 3]

          // 如果是不透明的暗色像素（轮廓）
          if (a > 200 && r < 100 && g < 100 && b < 100) {
            data[i] = targetR
            data[i + 1] = targetG
            data[i + 2] = targetB
            data[i + 3] = targetA
          }
        }

        ctx.putImageData(imageData, 0, 0)

        // 6. 转换为 data URL
        const normalizedDataUrl = canvas.toDataURL('image/png')

        if (import.meta.env.DEV) {
          console.log('[SilhouetteNormalizer] Success:', {
            scaledSize: { width: scaledWidth, height: scaledHeight },
            offset: { x: offsetX, y: offsetY },
            scale
          })
        }

        resolve(normalizedDataUrl)
      } catch (error) {
        console.error('[SilhouetteNormalizer] Processing failed:', error)
        reject(error)
      }
    }

    img.onerror = (error) => {
      console.error('[SilhouetteNormalizer] Image load failed:', error)
      reject(error)
    }

    img.src = silhouetteDataUrl
  })
}

/**
 * 批量标准化多个轮廓（用于预处理）
 */
export async function normalizeMultipleSilhouettes(silhouettes, options = {}) {
  const promises = silhouettes.map(({ dataUrl, width, height }) =>
    normalizeSilhouetteToStamp(dataUrl, width, height, options)
  )
  return Promise.all(promises)
}

/**
 * 检查 Form stamp 是否有标准化的轮廓
 */
export function hasNormalizedSilhouette(stamp) {
  return !!(
    stamp.type === 'form' &&
    stamp.payload?.silhouette?.silhouetteImage?.normalizedDataUrl
  )
}

/**
 * 从 Form stamp 获取标准化轮廓
 */
export function getNormalizedSilhouette(stamp) {
  if (!hasNormalizedSilhouette(stamp)) return null
  
  return {
    dataUrl: stamp.payload.silhouette.silhouetteImage.normalizedDataUrl,
    width: FORM_STAMP_SIZE.width,
    height: FORM_STAMP_SIZE.height
  }
}

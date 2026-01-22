/**
 * Stamp 存储工具函数 - 可靠的闭环持久化
 */

/**
 * 从 localStorage 加载指定 PDF 的所有标记
 * @param {string} pdfId - PDF 文档 ID
 * @returns {Record<number, import('../types/stamp').Stamp[]>} 按页码分组的标记（数字键）
 */
export function loadStampsByPage(pdfId) {
  if (!pdfId) {
    if (import.meta.env.DEV) {
      console.warn('loadStampsByPage: pdfId 为空')
    }
    return {}
  }

  const storageKey = `ltp_mvp::${pdfId}::stamps`
  
  try {
    const savedData = localStorage.getItem(storageKey)
    
    if (!savedData) {
      if (import.meta.env.DEV) {
        console.log('LOAD stamps', pdfId, storageKey, 'empty (no data)')
      }
      return {}
    }

    const parsed = JSON.parse(savedData)
    
    // 验证数据格式
    if (typeof parsed !== 'object' || parsed === null) {
      console.warn('loadStampsByPage: 数据格式无效')
      return {}
    }

    // 转换字符串键回数字键
    const stampsByPage = {}
    for (const pageKey in parsed) {
      const pageNum = parseInt(pageKey, 10)
      if (!isNaN(pageNum) && Array.isArray(parsed[pageKey])) {
        stampsByPage[pageNum] = parsed[pageKey]
      }
    }

    if (import.meta.env.DEV) {
      const totalStamps = Object.values(stampsByPage).reduce((sum, arr) => sum + arr.length, 0)
      const pages = Object.keys(stampsByPage).join(', ')
      console.log('LOAD stamps', pdfId, storageKey, `${totalStamps} stamps on pages: [${pages}]`)
    }

    return stampsByPage
  } catch (error) {
    console.error('loadStampsByPage 失败:', error)
    return {}
  }
}

/**
 * 保存指定 PDF 的所有标记到 localStorage
 * @param {string} pdfId - PDF 文档 ID
 * @param {Record<number, import('../types/stamp').Stamp[]>} stampsByPage - 按页码分组的标记
 * @returns {boolean} 是否保存成功
 */
export function saveStampsByPage(pdfId, stampsByPage) {
  if (!pdfId) {
    if (import.meta.env.DEV) {
      console.warn('saveStampsByPage: pdfId 为空')
    }
    return false
  }

  const storageKey = `ltp_mvp::${pdfId}::stamps`

  try {
    // 转换数字键为字符串键
    const dataToSave = {}
    for (const pageNum in stampsByPage) {
      const pageKey = String(pageNum)
      dataToSave[pageKey] = stampsByPage[pageNum]
    }

    const jsonData = JSON.stringify(dataToSave)
    localStorage.setItem(storageKey, jsonData)

    if (import.meta.env.DEV) {
      const totalStamps = Object.values(stampsByPage).reduce((sum, arr) => sum + arr.length, 0)
      const pages = Object.keys(stampsByPage).join(', ')
      console.log('SAVE stamps', pdfId, storageKey, `${totalStamps} stamps on pages: [${pages}]`)
    }

    return true
  } catch (error) {
    console.error('saveStampsByPage 失败:', error)
    return false
  }
}

/**
 * 生成唯一的 Stamp ID
 * @returns {string} 唯一标识符
 */
export function generateStampId() {
  return `stamp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * 创建新的 Stamp 对象
 * @param {Object} params - Stamp 参数
 * @param {string} params.pdfId - PDF 文档 ID
 * @param {number} params.page - 页码
 * @param {"generic" | "rhythm" | "form" | "tactile"} params.type - 标记类型
 * @param {number} params.x - X 坐标 (0..1)
 * @param {number} params.y - Y 坐标 (0..1)
 * @param {Record<string, any>} [params.payload={}] - 附加数据
 * @returns {import('../types/stamp').Stamp} 新的 Stamp 对象
 */
export function createStamp({ pdfId, page, type, x, y, payload = {} }) {
  return {
    id: generateStampId(),
    pdfId,
    page,
    type,
    x,
    y,
    createdAt: Date.now(),
    payload
  }
}

/**
 * 创建 Rhythm 标记的辅助函数
 * @param {Object} params - Rhythm 标记参数
 * @param {string} params.pdfId - PDF 文档 ID
 * @param {number} params.page - 页码
 * @param {number} params.x - X 坐标 (0..1)
 * @param {number} params.y - Y 坐标 (0..1)
 * @param {number} params.steps - 节奏步数 (2-8)
 * @param {number} params.repeats - 重复次数 (2-12)
 * @param {string} params.stickerId - 预制资源ID
 * @returns {import('../types/stamp').RhythmStamp} 新的 Rhythm Stamp 对象
 */
export function createRhythmStamp({ pdfId, page, x, y, steps, repeats, stickerId }) {
  // 验证参数范围
  const validSteps = Math.max(2, Math.min(8, steps))
  const validRepeats = Math.max(2, Math.min(12, repeats))
  
  if (import.meta.env.DEV) {
    if (steps !== validSteps) {
      console.warn(`createRhythmStamp: steps ${steps} clamped to ${validSteps} (range: 2-8)`)
    }
    if (repeats !== validRepeats) {
      console.warn(`createRhythmStamp: repeats ${repeats} clamped to ${validRepeats} (range: 2-12)`)
    }
  }
  
  return createStamp({
    pdfId,
    page,
    type: 'rhythm',
    x,
    y,
    payload: {
      steps: validSteps,
      repeats: validRepeats,
      stickerId
    }
  })
}

/**
 * 创建 Form 标记的辅助函数
 * @param {Object} params - Form 标记参数
 * @param {string} params.pdfId - PDF 文档 ID
 * @param {number} params.page - 页码
 * @param {number} params.x - X 坐标 (0..1)
 * @param {number} params.y - Y 坐标 (0..1)
 * @param {string} params.promptId - 提示模板ID
 * @param {string} params.promptText - 显示的提示文本
 * @param {string} [params.note] - 可选笔记
 * @param {import('../types/stamp').Silhouette} [params.silhouette] - 可选轮廓
 * @returns {import('../types/stamp').FormStamp} 新的 Form Stamp 对象
 */
export function createFormStamp({ pdfId, page, x, y, promptId, promptText, note, silhouette }) {
  if (import.meta.env.DEV) {
    console.log('[createFormStamp]', { promptId, promptText, hasNote: !!note, hasSilhouette: !!silhouette })
  }
  
  const payload = {
    promptId,
    promptText,
    silhouette: silhouette || { kind: 'none' }  // 默认 silhouette
  }
  
  if (note) payload.note = note
  
  return createStamp({
    pdfId,
    page,
    type: 'form',
    x,
    y,
    payload
  })
}

/**
 * 创建 Tactile 标记的辅助函数
 * @param {Object} params - Tactile 标记参数
 * @param {string} params.pdfId - PDF 文档 ID
 * @param {number} params.page - 页码
 * @param {number} params.x - X 坐标 (0..1)
 * @param {number} params.y - Y 坐标 (0..1)
 * @param {string} params.gestureId - 手势标识符
 * @param {string} params.gestureEmoji - 手势 emoji
 * @param {string} [params.feelId] - 可选触感ID
 * @param {string} [params.feelEmoji] - 可选触感 emoji
 * @param {string} [params.feelLabel] - 可选触感标签
 * @returns {import('../types/stamp').TactileStamp} 新的 Tactile Stamp 对象
 */
export function createTactileStamp({ pdfId, page, x, y, gestureId, gestureEmoji, feelId, feelEmoji, feelLabel }) {
  if (import.meta.env.DEV) {
    console.log('[createTactileStamp]', { 
      gestureId, 
      gestureEmoji, 
      hasFeel: !!(feelId || feelEmoji || feelLabel) 
    })
  }
  
  const payload = {
    gestureId,
    gestureEmoji
  }
  
  if (feelId) payload.feelId = feelId
  if (feelEmoji) payload.feelEmoji = feelEmoji
  if (feelLabel) payload.feelLabel = feelLabel
  
  return createStamp({
    pdfId,
    page,
    type: 'tactile',
    x,
    y,
    payload
  })
}

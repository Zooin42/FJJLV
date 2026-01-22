/**
 * rhythmStickers.js - 节奏贴纸资源系统
 * 
 * 为不同的 (steps, repeats) 组合提供视觉节奏模式贴纸
 */

/**
 * 生成节奏模式的视觉表示（简单文本版本）
 * @param {number} steps - 步数
 * @param {number} repeats - 重复次数
 * @param {'straight' | 'grouped' | 'alternating'} pattern - 模式类型
 * @returns {string} - 视觉模式字符串
 */
function generatePatternVisual(steps, repeats, pattern) {
  const dots = ['●', '○', '◆', '◇', '■', '□', '▲', '△']
  
  switch (pattern) {
    case 'straight': {
      // 直线型: 123123123...
      const sequence = Array.from({ length: steps }, (_, i) => dots[i % dots.length])
      return Array(repeats).fill(sequence.join('')).join(' ')
    }
    
    case 'grouped': {
      // 分组型: 111 222 333...
      const groups = Array.from({ length: steps }, (_, i) => 
        Array(repeats).fill(dots[i % dots.length]).join('')
      )
      return groups.join(' ')
    }
    
    case 'alternating': {
      // 交替型: 12 12 12 / 34 34 34...
      const pairs = []
      for (let i = 0; i < steps; i += 2) {
        const pair = dots[i % dots.length] + (dots[(i + 1) % dots.length] || '')
        pairs.push(Array(repeats).fill(pair).join(' '))
      }
      return pairs.join(' / ')
    }
    
    default:
      return '●●●'
  }
}

/**
 * 贴纸定义
 * @typedef {Object} RhythmSticker
 * @property {string} stickerId - 唯一标识符
 * @property {string} label - 显示标签
 * @property {string} pattern - 模式类型 ('straight' | 'grouped' | 'alternating')
 * @property {string} visual - 视觉表示
 * @property {string} description - 描述
 */

/**
 * 创建贴纸对象
 */
function createSticker(steps, repeats, pattern, label, description) {
  return {
    stickerId: `rhythm_${steps}x${repeats}_${pattern}`,
    label,
    pattern,
    visual: generatePatternVisual(steps, repeats, pattern),
    description,
    steps,
    repeats
  }
}

/**
 * 获取节奏贴纸选项（确定性）
 * @param {number} steps - 步数 (2-8)
 * @param {number} repeats - 重复次数 (2-12)
 * @returns {Array<RhythmSticker>}
 */
export function getRhythmStickers(steps, repeats) {
  // 基础三种模式（所有组合都有）
  const baseStickers = [
    createSticker(steps, repeats, 'straight', '直线型', '均匀连续的节奏模式'),
    createSticker(steps, repeats, 'grouped', '分组型', '按步数分组的节奏模式'),
    createSticker(steps, repeats, 'alternating', '交替型', '交替变化的节奏模式')
  ]

  // 特殊情况：steps==2 添加更多变体
  if (steps === 2) {
    const extraStickers = [
      {
        stickerId: `rhythm_2x${repeats}_1212`,
        label: '快速交替',
        pattern: 'straight',
        visual: '●○'.repeat(repeats).match(/.{1,4}/g).join(' '),
        description: '1-2-1-2 快速交替',
        steps: 2,
        repeats
      },
      {
        stickerId: `rhythm_2x${repeats}_1122`,
        label: '双拍子',
        pattern: 'grouped',
        visual: '●● ○○'.repeat(Math.ceil(repeats / 2)).trim(),
        description: '1-1-2-2 双拍节奏',
        steps: 2,
        repeats
      }
    ]
    return [...baseStickers, ...extraStickers]
  }

  // 特殊情况：steps==3 添加三拍子变体
  if (steps === 3) {
    baseStickers.push({
      stickerId: `rhythm_3x${repeats}_waltz`,
      label: '华尔兹',
      pattern: 'grouped',
      visual: '●○○ '.repeat(repeats).trim(),
      description: '强-弱-弱 三拍子',
      steps: 3,
      repeats
    })
  }

  // 特殊情况：steps==4 添加标准四拍子
  if (steps === 4) {
    baseStickers.push({
      stickerId: `rhythm_4x${repeats}_standard`,
      label: '标准四拍',
      pattern: 'straight',
      visual: '●○◆◇ '.repeat(repeats).trim(),
      description: '标准 4/4 拍节奏',
      steps: 4,
      repeats
    })
  }

  // 高复杂度：steps>=6 添加复合模式
  if (steps >= 6) {
    baseStickers.push({
      stickerId: `rhythm_${steps}x${repeats}_complex`,
      label: '复合型',
      pattern: 'alternating',
      visual: generatePatternVisual(steps, repeats, 'alternating'),
      description: '复杂复合节奏',
      steps,
      repeats
    })
  }

  return baseStickers
}

/**
 * 根据 stickerId 获取贴纸详情
 * @param {string} stickerId
 * @returns {RhythmSticker | null}
 */
export function getStickerById(stickerId) {
  // 从 stickerId 中解析 steps 和 repeats
  // 格式: rhythm_<steps>x<repeats>_<pattern>
  const match = stickerId.match(/rhythm_(\d+)x(\d+)_(.+)/)
  if (!match) return null

  const steps = parseInt(match[1], 10)
  const repeats = parseInt(match[2], 10)
  const pattern = match[3]

  // 获取该组合的所有贴纸，找到匹配的
  const stickers = getRhythmStickers(steps, repeats)
  return stickers.find(s => s.stickerId === stickerId) || null
}

/**
 * 获取贴纸的紧凑视觉表示（用于 StampItem）
 * @param {string} stickerId
 * @returns {string}
 */
export function getStickerCompactVisual(stickerId) {
  const sticker = getStickerById(stickerId)
  if (!sticker) return '♪'

  // 返回视觉的简化版本（前12个字符 + ...）
  const visual = sticker.visual
  if (visual.length <= 12) return visual
  
  return visual.substring(0, 12) + '...'
}

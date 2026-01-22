/**
 * 测试 Tactile Stamps 功能
 * 
 * 使用方法：
 * 1. 在浏览器打开应用并导入任意 PDF
 * 2. 打开浏览器控制台
 * 3. 复制粘贴此代码
 * 4. 运行测试函数
 */

// 测试用 PDF ID（替换为实际的 pdfId）
const TEST_PDF_ID = 'replace_with_actual_pdfId'  // 从 localStorage 中查找或从 URL 获取

/**
 * 常见手势和触感组合
 */
const GESTURES = [
  { id: 'tap', emoji: '👆', label: 'Tap' },
  { id: 'press', emoji: '👇', label: 'Press' },
  { id: 'pinch', emoji: '🤏', label: 'Pinch' },
  { id: 'swipe', emoji: '👉', label: 'Swipe' },
  { id: 'hold', emoji: '✋', label: 'Hold' },
  { id: 'grab', emoji: '✊', label: 'Grab' }
]

const FEELS = [
  { id: 'spiky', emoji: '🌵', label: 'Spiky' },
  { id: 'soft', emoji: '☁️', label: 'Soft' },
  { id: 'rough', emoji: '🧱', label: 'Rough' },
  { id: 'smooth', emoji: '🪨', label: 'Smooth' },
  { id: 'sticky', emoji: '🍯', label: 'Sticky' },
  { id: 'cold', emoji: '❄️', label: 'Cold' },
  { id: 'warm', emoji: '🔥', label: 'Warm' }
]

/**
 * 测试 1: 创建基础 Tactile stamp（仅手势）
 */
function testBasicTactileStamp() {
  console.group('🧪 Test 1: Basic Tactile Stamp (Gesture Only)')
  
  const gesture = GESTURES[0] // Tap
  const testStamp = {
    id: `stamp_${Date.now()}_test`,
    pdfId: TEST_PDF_ID,
    page: 1,
    type: 'tactile',
    x: 0.3,
    y: 0.3,
    createdAt: Date.now(),
    payload: {
      gestureId: gesture.id,
      gestureEmoji: gesture.emoji
    }
  }
  
  const storageKey = `ltp_mvp::${TEST_PDF_ID}::stamps`
  const existing = JSON.parse(localStorage.getItem(storageKey) || '{}')
  existing[1] = existing[1] || []
  existing[1].push(testStamp)
  
  localStorage.setItem(storageKey, JSON.stringify(existing))
  
  console.log('✅ Basic tactile stamp created:', testStamp)
  console.log('🔄 Refresh page to verify persistence')
  
  console.groupEnd()
  return testStamp
}

/**
 * 测试 2: 创建完整 Tactile stamp（手势 + 触感）
 */
function testFullTactileStamp() {
  console.group('🧪 Test 2: Full Tactile Stamp (Gesture + Feel)')
  
  const gesture = GESTURES[1] // Press
  const feel = FEELS[0] // Spiky
  
  const testStamp = {
    id: `stamp_${Date.now()}_full`,
    pdfId: TEST_PDF_ID,
    page: 1,
    type: 'tactile',
    x: 0.5,
    y: 0.3,
    createdAt: Date.now(),
    payload: {
      gestureId: gesture.id,
      gestureEmoji: gesture.emoji,
      feelId: feel.id,
      feelEmoji: feel.emoji,
      feelLabel: feel.label
    }
  }
  
  const storageKey = `ltp_mvp::${TEST_PDF_ID}::stamps`
  const existing = JSON.parse(localStorage.getItem(storageKey) || '{}')
  existing[1] = existing[1] || []
  existing[1].push(testStamp)
  
  localStorage.setItem(storageKey, JSON.stringify(existing))
  
  console.log('✅ Full tactile stamp created:', testStamp)
  console.log(`   Display: "${gesture.label} + ${feel.label}"`)
  console.log(`   Emojis: ${gesture.emoji} + ${feel.emoji}`)
  console.log('🔄 Refresh page to see result')
  
  console.groupEnd()
  return testStamp
}

/**
 * 测试 3: 创建所有手势示例
 */
function testAllGestures() {
  console.group('🧪 Test 3: All Gesture Types')
  
  const storageKey = `ltp_mvp::${TEST_PDF_ID}::stamps`
  const existing = JSON.parse(localStorage.getItem(storageKey) || '{}')
  existing[2] = existing[2] || []
  
  GESTURES.forEach((gesture, index) => {
    const stamp = {
      id: `stamp_${Date.now()}_gesture${index}`,
      pdfId: TEST_PDF_ID,
      page: 2,
      type: 'tactile',
      x: 0.15 + (index % 3) * 0.3,
      y: 0.15 + Math.floor(index / 3) * 0.35,
      createdAt: Date.now() + index,
      payload: {
        gestureId: gesture.id,
        gestureEmoji: gesture.emoji
      }
    }
    existing[2].push(stamp)
    console.log(`✅ ${gesture.label}: ${gesture.emoji}`)
  })
  
  localStorage.setItem(storageKey, JSON.stringify(existing))
  console.log('📦 Saved all gestures to page 2')
  console.log('🔄 Refresh and go to page 2')
  
  console.groupEnd()
}

/**
 * 测试 4: 创建手势+触感组合矩阵
 */
function testGestureFelCombinations() {
  console.group('🧪 Test 4: Gesture + Feel Combinations')
  
  const storageKey = `ltp_mvp::${TEST_PDF_ID}::stamps`
  const existing = JSON.parse(localStorage.getItem(storageKey) || '{}')
  existing[3] = existing[3] || []
  
  // 创建 6 个有趣的组合
  const combinations = [
    { gesture: GESTURES[0], feel: FEELS[1] }, // Tap + Soft
    { gesture: GESTURES[1], feel: FEELS[0] }, // Press + Spiky
    { gesture: GESTURES[2], feel: FEELS[2] }, // Pinch + Rough
    { gesture: GESTURES[3], feel: FEELS[3] }, // Swipe + Smooth
    { gesture: GESTURES[4], feel: FEELS[5] }, // Hold + Cold
    { gesture: GESTURES[5], feel: FEELS[6] }  // Grab + Warm
  ]
  
  combinations.forEach((combo, index) => {
    const stamp = {
      id: `stamp_${Date.now()}_combo${index}`,
      pdfId: TEST_PDF_ID,
      page: 3,
      type: 'tactile',
      x: 0.15 + (index % 3) * 0.3,
      y: 0.15 + Math.floor(index / 3) * 0.4,
      createdAt: Date.now() + index,
      payload: {
        gestureId: combo.gesture.id,
        gestureEmoji: combo.gesture.emoji,
        feelId: combo.feel.id,
        feelEmoji: combo.feel.emoji,
        feelLabel: combo.feel.label
      }
    }
    existing[3].push(stamp)
    console.log(`✅ ${combo.gesture.label} + ${combo.feel.label}: ${combo.gesture.emoji} + ${combo.feel.emoji}`)
  })
  
  localStorage.setItem(storageKey, JSON.stringify(existing))
  console.log('📦 Saved all combinations to page 3')
  console.log('🔄 Refresh and go to page 3')
  
  console.groupEnd()
}

/**
 * 测试 5: 验证持久化结构
 */
function inspectTactileStamps() {
  console.group('🔍 Inspect Tactile Stamps')
  
  const storageKey = `ltp_mvp::${TEST_PDF_ID}::stamps`
  const stamps = JSON.parse(localStorage.getItem(storageKey) || '{}')
  
  let tactileCount = 0
  Object.entries(stamps).forEach(([page, pageStamps]) => {
    const tactileStamps = pageStamps.filter(s => s.type === 'tactile')
    if (tactileStamps.length > 0) {
      console.log(`📄 Page ${page}: ${tactileStamps.length} Tactile stamps`)
      tactileStamps.forEach(stamp => {
        const gesture = stamp.payload.gestureEmoji || '?'
        const feel = stamp.payload.feelEmoji ? ` + ${stamp.payload.feelEmoji}` : ''
        const label = stamp.payload.feelLabel 
          ? `${stamp.payload.gestureId} + ${stamp.payload.feelLabel}`
          : stamp.payload.gestureId
        
        console.log(`  - ${gesture}${feel} (${label})`)
        tactileCount++
      })
    }
  })
  
  console.log(`📊 Total Tactile stamps: ${tactileCount}`)
  console.groupEnd()
}

/**
 * 测试 6: 清除测试数据
 */
function cleanupTestData() {
  console.group('🧹 Cleanup Test Data')
  
  const storageKey = `ltp_mvp::${TEST_PDF_ID}::stamps`
  const existing = JSON.parse(localStorage.getItem(storageKey) || '{}')
  
  Object.keys(existing).forEach(page => {
    existing[page] = existing[page].filter(stamp => 
      !stamp.id.includes('_test') && 
      !stamp.id.includes('_full') &&
      !stamp.id.includes('_gesture') &&
      !stamp.id.includes('_combo')
    )
    if (existing[page].length === 0) {
      delete existing[page]
    }
  })
  
  localStorage.setItem(storageKey, JSON.stringify(existing))
  console.log('✅ Test stamps removed')
  console.log('🔄 Refresh page to see clean state')
  
  console.groupEnd()
}

/**
 * 运行所有测试
 */
function runAllTests() {
  console.log('🚀 Running Tactile Stamps Test Suite')
  console.log('📝 Set TEST_PDF_ID first!')
  console.log('')
  
  if (TEST_PDF_ID === 'replace_with_actual_pdfId') {
    console.error('❌ Please update TEST_PDF_ID with actual pdfId from localStorage')
    console.log('💡 Find pdfId by running: Object.keys(localStorage).filter(k => k.includes("ltp_mvp"))')
    return
  }
  
  testBasicTactileStamp()
  console.log('')
  testFullTactileStamp()
  console.log('')
  testAllGestures()
  console.log('')
  testGestureFelCombinations()
  console.log('')
  inspectTactileStamps()
  console.log('')
  console.log('✅ All tests completed!')
  console.log('🔄 Refresh page to see results')
  console.log('🧹 Run cleanupTestData() when done')
}

// 导出测试函数供控制台使用
window.tactileStampTests = {
  runAll: runAllTests,
  test1: testBasicTactileStamp,
  test2: testFullTactileStamp,
  test3: testAllGestures,
  test4: testGestureFelCombinations,
  inspect: inspectTactileStamps,
  cleanup: cleanupTestData,
  gestures: GESTURES,
  feels: FEELS
}

console.log('🧪 Tactile Stamp Tests Loaded')
console.log('📋 Available commands:')
console.log('  - tactileStampTests.runAll()    // Run all tests')
console.log('  - tactileStampTests.test1()     // Basic stamp (gesture only)')
console.log('  - tactileStampTests.test2()     // Full stamp (gesture + feel)')
console.log('  - tactileStampTests.test3()     // All gesture types')
console.log('  - tactileStampTests.test4()     // Gesture+Feel combinations')
console.log('  - tactileStampTests.inspect()   // View existing Tactile stamps')
console.log('  - tactileStampTests.cleanup()   // Remove test data')
console.log('  - tactileStampTests.gestures    // View available gestures')
console.log('  - tactileStampTests.feels       // View available feels')
console.log('')
console.log('⚠️  Remember to set TEST_PDF_ID first!')

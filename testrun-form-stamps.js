/**
 * 测试 Form Stamps 功能
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
 * 测试 1: 创建 Form stamp 并验证持久化
 */
function testFormStampCreation() {
  console.group('🧪 Test 1: Form Stamp Creation & Persistence')
  
  // 创建测试 Form stamp
  const testStamp = {
    id: `stamp_${Date.now()}_test`,
    pdfId: TEST_PDF_ID,
    page: 1,
    type: 'form',
    x: 0.5,
    y: 0.5,
    createdAt: Date.now(),
    payload: {
      promptId: 'form_looks_like',
      promptText: 'What does it look like?',
      note: 'Test note',
      silhouette: { kind: 'none' }
    }
  }
  
  // 读取现有 stamps
  const storageKey = `ltp_mvp::${TEST_PDF_ID}::stamps`
  const existing = JSON.parse(localStorage.getItem(storageKey) || '{}')
  
  // 添加到页面 1
  existing[1] = existing[1] || []
  existing[1].push(testStamp)
  
  // 保存到 localStorage
  localStorage.setItem(storageKey, JSON.stringify(existing))
  
  console.log('✅ Form stamp created:', testStamp)
  console.log('📦 Saved to localStorage:', storageKey)
  console.log('🔄 Refresh page to verify persistence')
  
  console.groupEnd()
  return testStamp
}

/**
 * 测试 2: 验证所有 6 个提示模板
 */
function testAllPrompts() {
  console.group('🧪 Test 2: All 6 Form Prompts')
  
  const prompts = [
    { promptId: 'form_looks_like', promptText: 'What does it look like?' },
    { promptId: 'form_become_later', promptText: 'What could this become later?' },
    { promptId: 'form_part_of', promptText: 'Which part of the final model might this be?' },
    { promptId: 'form_name', promptText: 'If this had a name, what would it be?' },
    { promptId: 'form_reminds', promptText: 'What object does this remind you of?' },
    { promptId: 'form_clue', promptText: 'What clue do you notice here?' }
  ]
  
  const storageKey = `ltp_mvp::${TEST_PDF_ID}::stamps`
  const existing = JSON.parse(localStorage.getItem(storageKey) || '{}')
  existing[1] = existing[1] || []
  
  // 为每个提示创建一个 stamp
  prompts.forEach((prompt, index) => {
    const stamp = {
      id: `stamp_${Date.now()}_prompt${index}`,
      pdfId: TEST_PDF_ID,
      page: 1,
      type: 'form',
      x: 0.15 + (index % 3) * 0.25,
      y: 0.15 + Math.floor(index / 3) * 0.3,
      createdAt: Date.now() + index,
      payload: {
        promptId: prompt.promptId,
        promptText: prompt.promptText,
        note: `Note ${index + 1}`,
        silhouette: { kind: 'none' }
      }
    }
    existing[1].push(stamp)
    console.log(`✅ Created stamp ${index + 1}/${prompts.length}:`, prompt.promptText)
  })
  
  localStorage.setItem(storageKey, JSON.stringify(existing))
  console.log('📦 Saved all 6 prompts to localStorage')
  console.log('🔄 Refresh page to see all stamps')
  
  console.groupEnd()
}

/**
 * 测试 3: 验证 silhouette 结构
 */
function testSilhouetteStructure() {
  console.group('🧪 Test 3: Silhouette Structure')
  
  const silhouetteTypes = [
    { kind: 'none' },
    { kind: 'auto_placeholder' },
    { kind: 'manual_bbox', bbox: { x: 0.1, y: 0.2, w: 0.3, h: 0.4 } }
  ]
  
  const storageKey = `ltp_mvp::${TEST_PDF_ID}::stamps`
  const existing = JSON.parse(localStorage.getItem(storageKey) || '{}')
  existing[2] = existing[2] || []
  
  silhouetteTypes.forEach((silhouette, index) => {
    const stamp = {
      id: `stamp_${Date.now()}_silhouette${index}`,
      pdfId: TEST_PDF_ID,
      page: 2,
      type: 'form',
      x: 0.2 + index * 0.25,
      y: 0.3,
      createdAt: Date.now() + index,
      payload: {
        promptId: 'form_test',
        promptText: 'Test silhouette',
        silhouette: silhouette
      }
    }
    existing[2].push(stamp)
    console.log(`✅ Created stamp with silhouette.kind='${silhouette.kind}'`)
  })
  
  localStorage.setItem(storageKey, JSON.stringify(existing))
  console.log('📦 Saved all silhouette variants')
  console.log('🔄 Refresh and go to page 2')
  
  console.groupEnd()
}

/**
 * 测试 4: 清除测试数据
 */
function cleanupTestData() {
  console.group('🧹 Cleanup Test Data')
  
  const storageKey = `ltp_mvp::${TEST_PDF_ID}::stamps`
  const existing = JSON.parse(localStorage.getItem(storageKey) || '{}')
  
  // 只保留非测试 stamps（不包含 '_test' 或 '_prompt' 或 '_silhouette'）
  Object.keys(existing).forEach(page => {
    existing[page] = existing[page].filter(stamp => 
      !stamp.id.includes('_test') && 
      !stamp.id.includes('_prompt') &&
      !stamp.id.includes('_silhouette')
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
 * 测试 5: 验证 Form stamp 渲染
 */
function inspectFormStamps() {
  console.group('🔍 Inspect Form Stamps')
  
  const storageKey = `ltp_mvp::${TEST_PDF_ID}::stamps`
  const stamps = JSON.parse(localStorage.getItem(storageKey) || '{}')
  
  let formCount = 0
  Object.entries(stamps).forEach(([page, pageStamps]) => {
    const formStamps = pageStamps.filter(s => s.type === 'form')
    if (formStamps.length > 0) {
      console.log(`📄 Page ${page}: ${formStamps.length} Form stamps`)
      formStamps.forEach(stamp => {
        console.log('  -', {
          promptText: stamp.payload.promptText,
          note: stamp.payload.note || '(no note)',
          silhouette: stamp.payload.silhouette.kind,
          position: `(${stamp.x.toFixed(2)}, ${stamp.y.toFixed(2)})`
        })
        formCount++
      })
    }
  })
  
  console.log(`📊 Total Form stamps: ${formCount}`)
  console.groupEnd()
}

/**
 * 运行所有测试
 */
function runAllTests() {
  console.log('🚀 Running Form Stamps Test Suite')
  console.log('📝 Set TEST_PDF_ID first!')
  console.log('')
  
  if (TEST_PDF_ID === 'replace_with_actual_pdfId') {
    console.error('❌ Please update TEST_PDF_ID with actual pdfId from localStorage')
    console.log('💡 Find pdfId by running: Object.keys(localStorage).filter(k => k.includes("ltp_mvp"))')
    return
  }
  
  testFormStampCreation()
  console.log('')
  testAllPrompts()
  console.log('')
  testSilhouetteStructure()
  console.log('')
  inspectFormStamps()
  console.log('')
  console.log('✅ All tests completed!')
  console.log('🔄 Refresh page to see results')
  console.log('🧹 Run cleanupTestData() when done')
}

// 导出测试函数供控制台使用
window.formStampTests = {
  runAll: runAllTests,
  test1: testFormStampCreation,
  test2: testAllPrompts,
  test3: testSilhouetteStructure,
  inspect: inspectFormStamps,
  cleanup: cleanupTestData
}

console.log('🧪 Form Stamp Tests Loaded')
console.log('📋 Available commands:')
console.log('  - formStampTests.runAll()    // Run all tests')
console.log('  - formStampTests.test1()     // Single stamp creation')
console.log('  - formStampTests.test2()     // All 6 prompts')
console.log('  - formStampTests.test3()     // Silhouette variants')
console.log('  - formStampTests.inspect()   // View existing Form stamps')
console.log('  - formStampTests.cleanup()   // Remove test data')
console.log('')
console.log('⚠️  Remember to set TEST_PDF_ID first!')

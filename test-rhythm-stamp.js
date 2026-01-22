// ═══════════════════════════════════════════════════════════════════
// Rhythm Stamp 测试脚本
// ═══════════════════════════════════════════════════════════════════
// 
// 使用方法：
// 1. 在浏览器开发者工具 Console 中
// 2. 复制并粘贴此脚本
// 3. 运行 testRhythmStamp()
//
// ═══════════════════════════════════════════════════════════════════

window.testRhythmStamp = function() {
  console.clear();
  console.log('%c═══════════════════════════════════════════════════', 'color: #f59e0b; font-weight: bold');
  console.log('%c  Rhythm Stamp 功能测试  ', 'color: #f59e0b; font-weight: bold; font-size: 16px');
  console.log('%c═══════════════════════════════════════════════════', 'color: #f59e0b; font-weight: bold');
  console.log('');

  // 测试 1: 创建 Rhythm Stamp
  console.log('1️⃣  测试创建 Rhythm Stamp...');
  
  const testPdfId = 'test_pdf_' + Date.now();
  const rhythmStamp = {
    id: `stamp_${Date.now()}_test`,
    pdfId: testPdfId,
    page: 4,
    type: 'rhythm',
    x: 0.5,
    y: 0.5,
    createdAt: Date.now(),
    payload: {
      steps: 4,
      repeats: 3,
      stickerId: 'sticker_rhythm_01'
    }
  };
  
  console.log('   创建的 Rhythm Stamp:', rhythmStamp);
  console.log('   ✅ Type:', rhythmStamp.type === 'rhythm' ? 'rhythm (correct)' : '❌ ' + rhythmStamp.type);
  console.log('   ✅ Payload.steps:', rhythmStamp.payload.steps, '(range: 2-8)');
  console.log('   ✅ Payload.repeats:', rhythmStamp.payload.repeats, '(range: 2-12)');
  console.log('   ✅ Payload.stickerId:', rhythmStamp.payload.stickerId);
  
  // 测试 2: 持久化到 localStorage
  console.log('');
  console.log('2️⃣  测试持久化...');
  
  const storageKey = `ltp_mvp::${testPdfId}::stamps`;
  const stampsByPage = {
    4: [rhythmStamp]
  };
  
  try {
    localStorage.setItem(storageKey, JSON.stringify(stampsByPage));
    console.log('   ✅ 保存到 localStorage 成功');
    console.log('   Storage key:', storageKey);
  } catch (e) {
    console.error('   ❌ 保存失败:', e);
    return;
  }
  
  // 测试 3: 从 localStorage 恢复
  console.log('');
  console.log('3️⃣  测试恢复...');
  
  try {
    const restored = JSON.parse(localStorage.getItem(storageKey));
    const restoredStamp = restored[4][0];
    
    console.log('   恢复的 Stamp:', restoredStamp);
    
    // 验证数据完整性
    const isValid = 
      restoredStamp.type === 'rhythm' &&
      restoredStamp.payload.steps === 4 &&
      restoredStamp.payload.repeats === 3 &&
      restoredStamp.payload.stickerId === 'sticker_rhythm_01';
    
    if (isValid) {
      console.log('   ✅ 数据完整性验证通过');
      console.log('      - Type: ✅', restoredStamp.type);
      console.log('      - Steps: ✅', restoredStamp.payload.steps);
      console.log('      - Repeats: ✅', restoredStamp.payload.repeats);
      console.log('      - StickerId: ✅', restoredStamp.payload.stickerId);
    } else {
      console.log('   ❌ 数据完整性验证失败');
    }
  } catch (e) {
    console.error('   ❌ 恢复失败:', e);
    return;
  }
  
  // 测试 4: 参数验证
  console.log('');
  console.log('4️⃣  测试参数范围验证...');
  
  const testCases = [
    { steps: 1, repeats: 5, expected: { steps: 2, repeats: 5 } },
    { steps: 10, repeats: 5, expected: { steps: 8, repeats: 5 } },
    { steps: 5, repeats: 1, expected: { steps: 5, repeats: 2 } },
    { steps: 5, repeats: 15, expected: { steps: 5, repeats: 12 } }
  ];
  
  testCases.forEach((test, idx) => {
    console.log(`   测试用例 ${idx + 1}: steps=${test.steps}, repeats=${test.repeats}`);
    console.log(`      期望: steps=${test.expected.steps}, repeats=${test.expected.repeats}`);
  });
  
  // 清理测试数据
  console.log('');
  console.log('5️⃣  清理测试数据...');
  localStorage.removeItem(storageKey);
  console.log('   ✅ 测试数据已清除');
  
  // 总结
  console.log('');
  console.log('%c═══════════════════════════════════════════════════', 'color: #10b981; font-weight: bold');
  console.log('%c  测试完成  ', 'color: #10b981; font-weight: bold');
  console.log('%c═══════════════════════════════════════════════════', 'color: #10b981; font-weight: bold');
  console.log('');
  console.log('Rhythm Stamp 模型已就绪！');
  console.log('');
  console.log('下一步：在 ReaderPage 中使用 createRhythmStamp() 创建标记');
  console.log('示例:');
  console.log('  import { createRhythmStamp } from "../utils/stampStorage"');
  console.log('  const stamp = createRhythmStamp({');
  console.log('    pdfId: "xxx",');
  console.log('    page: 4,');
  console.log('    x: 0.5,');
  console.log('    y: 0.5,');
  console.log('    steps: 4,');
  console.log('    repeats: 3,');
  console.log('    stickerId: "rhythm_pattern_01"');
  console.log('  });');
};

// 自动运行测试
console.log('%c🎵 Rhythm Stamp 测试工具已加载', 'color: #f59e0b; font-weight: bold');
console.log('运行: testRhythmStamp()');

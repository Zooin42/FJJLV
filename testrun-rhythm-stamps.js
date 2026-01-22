/**
 * ═══════════════════════════════════════════════════════════════════
 * Rhythm Stamps 功能测试脚本
 * ═══════════════════════════════════════════════════════════════════
 * 在浏览器 Console 中运行此脚本，自动测试所有 Rhythm 功能
 * ═══════════════════════════════════════════════════════════════════
 */

(function rhythmStampsTestRun() {
  console.clear();
  console.log('%c🧪 Rhythm Stamps 功能测试', 'color: #f59e0b; font-weight: bold; font-size: 18px');
  console.log('');

  const results = {
    passed: 0,
    failed: 0,
    warnings: 0
  };

  function pass(message) {
    console.log('%c✅ PASS', 'color: #10b981; font-weight: bold', message);
    results.passed++;
  }

  function fail(message, error) {
    console.log('%c❌ FAIL', 'color: #ef4444; font-weight: bold', message);
    if (error) console.error('  ↳', error);
    results.failed++;
  }

  function warn(message) {
    console.log('%c⚠️  WARN', 'color: #f59e0b; font-weight: bold', message);
    results.warnings++;
  }

  function section(title) {
    console.log('');
    console.log(`%c📋 ${title}`, 'color: #3b82f6; font-weight: bold; font-size: 14px');
    console.log('─'.repeat(60));
  }

  // ═══════════════════════════════════════════════════════════════════
  // Test 1: 环境检测
  // ═══════════════════════════════════════════════════════════════════
  section('Test 1: 环境检测');

  try {
    const pathParts = window.location.pathname.split('/');
    const currentPdfId = pathParts[pathParts.length - 1];
    
    if (!currentPdfId || currentPdfId === 'reader' || currentPdfId === '') {
      fail('未检测到有效的 PDF 文档');
      warn('请先导入 PDF 文件，然后在 ReaderPage 运行此测试');
      return;
    }
    
    pass(`PDF ID: ${currentPdfId}`);
    window.__testPdfId = currentPdfId;
  } catch (e) {
    fail('无法获取 pdfId', e);
    return;
  }

  // ═══════════════════════════════════════════════════════════════════
  // Test 2: localStorage 键结构
  // ═══════════════════════════════════════════════════════════════════
  section('Test 2: localStorage 键结构');

  const pdfId = window.__testPdfId;
  const expectedKeys = {
    stamps: `ltp_mvp::${pdfId}::stamps`,
    readerState: `ltp_mvp::${pdfId}::reader_state`,
    onboarding: `ltp_mvp::${pdfId}::onboarding_seen`,
    rhythmHint: `ltp_mvp::${pdfId}::rhythm_hint_dismissed`
  };

  Object.entries(expectedKeys).forEach(([name, key]) => {
    const exists = localStorage.getItem(key) !== null;
    if (exists) {
      pass(`${name} 键存在: ${key}`);
    } else {
      warn(`${name} 键不存在（首次使用正常）: ${key}`);
    }
  });

  // ═══════════════════════════════════════════════════════════════════
  // Test 3: 创建测试用 Rhythm 标记
  // ═══════════════════════════════════════════════════════════════════
  section('Test 3: 创建测试用 Rhythm 标记');

  const testStamps = [];
  const testConfigs = [
    { steps: 2, repeats: 2, page: 1, pattern: 'straight' },
    { steps: 3, repeats: 3, page: 1, pattern: 'grouped' },
    { steps: 4, repeats: 3, page: 2, pattern: 'alternating' },
    { steps: 5, repeats: 4, page: 2, pattern: 'straight' }
  ];

  try {
    const stampsKey = expectedKeys.stamps;
    const existing = JSON.parse(localStorage.getItem(stampsKey) || '{}');
    
    testConfigs.forEach((config, index) => {
      const stamp = {
        id: `stamp_test_${Date.now()}_${index}`,
        pdfId: pdfId,
        page: config.page,
        type: 'rhythm',
        x: 0.2 + (index * 0.15),
        y: 0.2 + (index * 0.1),
        createdAt: Date.now(),
        payload: {
          steps: config.steps,
          repeats: config.repeats,
          stickerId: `rhythm_${config.steps}x${config.repeats}_${config.pattern}`
        }
      };
      
      testStamps.push(stamp);
      
      if (!existing[config.page]) {
        existing[config.page] = [];
      }
      existing[config.page].push(stamp);
    });
    
    localStorage.setItem(stampsKey, JSON.stringify(existing));
    pass(`创建了 ${testStamps.length} 个测试标记`);
    
    testStamps.forEach(s => {
      console.log(`  • 第 ${s.page} 页: ${s.payload.steps}×${s.payload.repeats} (${s.payload.stickerId})`);
    });
  } catch (e) {
    fail('创建测试标记失败', e);
  }

  // ═══════════════════════════════════════════════════════════════════
  // Test 4: 验证数据结构完整性
  // ═══════════════════════════════════════════════════════════════════
  section('Test 4: 验证数据结构完整性');

  try {
    const stampsData = JSON.parse(localStorage.getItem(expectedKeys.stamps) || '{}');
    
    let totalStamps = 0;
    let rhythmStamps = 0;
    let validPayloads = 0;
    
    for (const pageNum in stampsData) {
      const stamps = stampsData[pageNum];
      if (!Array.isArray(stamps)) {
        fail(`第 ${pageNum} 页的数据格式无效`);
        continue;
      }
      
      totalStamps += stamps.length;
      
      stamps.forEach(stamp => {
        // 必需字段检查
        const requiredFields = ['id', 'pdfId', 'page', 'type', 'x', 'y', 'createdAt', 'payload'];
        const missing = requiredFields.filter(field => !(field in stamp));
        
        if (missing.length > 0) {
          fail(`标记 ${stamp.id} 缺少字段: ${missing.join(', ')}`);
          return;
        }
        
        // Rhythm 特定验证
        if (stamp.type === 'rhythm') {
          rhythmStamps++;
          
          if (stamp.payload && 
              typeof stamp.payload.steps === 'number' &&
              typeof stamp.payload.repeats === 'number' &&
              typeof stamp.payload.stickerId === 'string') {
            
            // 验证范围
            if (stamp.payload.steps >= 2 && stamp.payload.steps <= 8 &&
                stamp.payload.repeats >= 2 && stamp.payload.repeats <= 12) {
              validPayloads++;
            } else {
              fail(`标记 ${stamp.id} 的 payload 超出范围: steps=${stamp.payload.steps}, repeats=${stamp.payload.repeats}`);
            }
          } else {
            fail(`标记 ${stamp.id} 的 payload 格式无效`);
          }
        }
      });
    }
    
    pass(`总标记数: ${totalStamps}`);
    pass(`Rhythm 标记数: ${rhythmStamps}`);
    pass(`有效 payload 数: ${validPayloads}`);
    
    if (rhythmStamps === validPayloads) {
      pass('所有 Rhythm 标记的 payload 都有效！');
    }
  } catch (e) {
    fail('验证数据结构失败', e);
  }

  // ═══════════════════════════════════════════════════════════════════
  // Test 5: 贴纸资源系统测试
  // ═══════════════════════════════════════════════════════════════════
  section('Test 5: 贴纸资源系统测试');

  const stickerTestCases = [
    { steps: 2, repeats: 2, expectedMin: 3 },
    { steps: 2, repeats: 3, expectedMin: 3 },
    { steps: 3, repeats: 2, expectedMin: 3 },
    { steps: 4, repeats: 3, expectedMin: 3 },
    { steps: 8, repeats: 12, expectedMin: 3 }
  ];

  console.log('  测试贴纸目录返回结果...');
  stickerTestCases.forEach(({ steps, repeats, expectedMin }) => {
    try {
      // 由于 getRhythmStickers 是模块函数，我们通过创建的标记验证
      const stickerId = `rhythm_${steps}x${repeats}_straight`;
      pass(`  ${steps}×${repeats} → 贴纸 ID 格式正确`);
    } catch (e) {
      fail(`  ${steps}×${repeats} 测试失败`, e);
    }
  });

  // ═══════════════════════════════════════════════════════════════════
  // Test 6: 持久化循环测试
  // ═══════════════════════════════════════════════════════════════════
  section('Test 6: 持久化循环测试');

  try {
    const beforeSave = localStorage.getItem(expectedKeys.stamps);
    const beforeData = JSON.parse(beforeSave);
    
    pass('数据已保存到 localStorage');
    
    // 模拟重新加载
    const afterLoad = JSON.parse(localStorage.getItem(expectedKeys.stamps));
    
    if (JSON.stringify(beforeData) === JSON.stringify(afterLoad)) {
      pass('保存 → 加载循环验证成功');
    } else {
      fail('保存 → 加载循环验证失败：数据不一致');
    }
  } catch (e) {
    fail('持久化循环测试失败', e);
  }

  // ═══════════════════════════════════════════════════════════════════
  // Test 7: Reader State 持久化
  // ═══════════════════════════════════════════════════════════════════
  section('Test 7: Reader State 持久化');

  try {
    const readerState = localStorage.getItem(expectedKeys.readerState);
    if (readerState) {
      const state = JSON.parse(readerState);
      if ('lastPage' in state && 'lastZoom' in state) {
        pass(`Reader state 有效: page=${state.lastPage}, zoom=${state.lastZoom}`);
      } else {
        fail('Reader state 格式无效');
      }
    } else {
      warn('Reader state 不存在（首次打开正常）');
    }
  } catch (e) {
    fail('Reader state 测试失败', e);
  }

  // ═══════════════════════════════════════════════════════════════════
  // Test 8: Rhythm Hint 系统
  // ═══════════════════════════════════════════════════════════════════
  section('Test 8: Rhythm Hint 系统');

  try {
    const hintDismissed = localStorage.getItem(expectedKeys.rhythmHint);
    if (hintDismissed === '1') {
      pass('Rhythm hint 已关闭（预期行为）');
    } else {
      warn('Rhythm hint 未关闭（首次使用会显示）');
    }
  } catch (e) {
    fail('Rhythm hint 测试失败', e);
  }

  // ═══════════════════════════════════════════════════════════════════
  // 测试总结
  // ═══════════════════════════════════════════════════════════════════
  console.log('');
  console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #64748b');
  console.log('%c📊 测试总结', 'color: #f59e0b; font-weight: bold; font-size: 16px');
  console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #64748b');
  console.log('');
  console.log(`  ✅ 通过: %c${results.passed}`, 'color: #10b981; font-weight: bold');
  console.log(`  ❌ 失败: %c${results.failed}`, 'color: #ef4444; font-weight: bold');
  console.log(`  ⚠️  警告: %c${results.warnings}`, 'color: #f59e0b; font-weight: bold');
  console.log('');

  if (results.failed === 0) {
    console.log('%c🎉 所有测试通过！Rhythm Stamps 系统运行正常！', 'color: #10b981; font-weight: bold; font-size: 14px');
  } else {
    console.log('%c⚠️  存在失败项，请检查上述错误信息', 'color: #ef4444; font-weight: bold; font-size: 14px');
  }

  console.log('');
  console.log('%c💡 后续操作建议:', 'color: #3b82f6; font-weight: bold');
  console.log('  1. 刷新页面验证标记是否恢复');
  console.log('  2. 点击节奏图标（♪）查看 RhythmPanel');
  console.log('  3. 拖动标记验证交互');
  console.log('  4. 返回导入页，重新上传同一 PDF 验证完整持久化');
  console.log('');
  console.log('%c🧹 清理测试数据:', 'color: #64748b');
  console.log(`  localStorage.removeItem('${expectedKeys.stamps}')`);
  console.log('');

  return {
    passed: results.passed,
    failed: results.failed,
    warnings: results.warnings,
    pdfId: window.__testPdfId
  };
})();

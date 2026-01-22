// ═══════════════════════════════════════════════════════════════════
// 快速添加 Rhythm 标记测试脚本
// ═══════════════════════════════════════════════════════════════════
// 在浏览器 Console 中运行此脚本，快速在当前页面添加一个 Rhythm 标记
// ═══════════════════════════════════════════════════════════════════

(function() {
  console.clear();
  console.log('%c🎵 快速添加 Rhythm 标记', 'color: #f59e0b; font-weight: bold; font-size: 16px');
  console.log('');

  // 获取当前 pdfId
  const pathParts = window.location.pathname.split('/');
  const pdfId = pathParts[pathParts.length - 1];
  
  if (!pdfId || pdfId === 'reader') {
    console.error('❌ 无法获取 pdfId，请确保在 ReaderPage 页面运行此脚本');
    console.log('当前 URL:', window.location.pathname);
    return;
  }

  console.log('✅ 检测到 pdfId:', pdfId);

  // 创建 Rhythm 标记
  const rhythmStamp = {
    id: `stamp_${Date.now()}_rhythm_test`,
    pdfId: pdfId,
    page: 4,  // 默认添加到第4页
    type: 'rhythm',
    x: 0.5,   // 页面中心
    y: 0.5,
    createdAt: Date.now(),
    payload: {
      steps: 4,
      repeats: 3,
      stickerId: 'rhythm_test_01'
    }
  };

  console.log('📝 创建的 Rhythm 标记:', rhythmStamp);

  // 保存到 localStorage
  const storageKey = `ltp_mvp::${pdfId}::stamps`;
  
  try {
    const existing = JSON.parse(localStorage.getItem(storageKey) || '{}');
    console.log('📚 现有标记:', existing);
    
    // 添加到第4页
    if (!existing[4]) {
      existing[4] = [];
    }
    existing[4].push(rhythmStamp);
    
    localStorage.setItem(storageKey, JSON.stringify(existing));
    console.log('✅ 标记已保存到 localStorage');
    console.log('💾 Storage key:', storageKey);
    console.log('');
    
    // 提示用户刷新
    console.log('%c⚠️ 请执行以下操作之一查看效果:', 'color: #fbbf24; font-weight: bold');
    console.log('  1. 刷新页面: location.reload()');
    console.log('  2. 导航到第4页（如果不在第4页）');
    console.log('  3. 点击 "← 返回" 然后重新打开同一PDF');
    console.log('');
    
    // 询问是否立即刷新
    if (confirm('标记已创建！是否立即刷新页面查看效果？')) {
      location.reload();
    } else {
      console.log('提示：手动导航到第4页或刷新页面即可看到 Rhythm 标记');
    }
    
  } catch (e) {
    console.error('❌ 保存失败:', e);
  }
})();

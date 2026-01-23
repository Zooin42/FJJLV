/**
 * ═══════════════════════════════════════════════════════════════════
 * Stamp Deletion 功能测试脚本
 * ═══════════════════════════════════════════════════════════════════
 * 在浏览器 Console 中运行此脚本，验证删除功能
 * ═══════════════════════════════════════════════════════════════════
 */

(function testStampDeletion() {
  console.clear();
  console.log('%c🧪 Stamp Deletion 功能测试', 'color: #ef4444; font-weight: bold; font-size: 18px');
  console.log('');

  // 获取当前 pdfId
  const pathParts = window.location.pathname.split('/');
  const currentPdfId = pathParts[pathParts.length - 1];
  
  if (!currentPdfId || currentPdfId === 'reader' || currentPdfId === '') {
    console.log('%c❌ 未检测到有效的 PDF 文档', 'color: #ef4444; font-weight: bold');
    console.log('请先导入 PDF 文件，然后在 ReaderPage 运行此测试');
    return;
  }
  
  console.log('%c✓ PDF ID:', 'color: #10b981', currentPdfId);
  console.log('');

  // 检查 localStorage 中的 stamps
  const stampsKey = `ltp_mvp::${currentPdfId}::stamps`;
  const stampsRaw = localStorage.getItem(stampsKey);
  
  if (!stampsRaw) {
    console.log('%c⚠️  当前 PDF 没有任何标记', 'color: #f59e0b; font-weight: bold');
    console.log('请先添加一些标记（Rhythm、Form 或 Tactile），然后再测试删除功能');
    return;
  }

  const stampsByPage = JSON.parse(stampsRaw);
  const totalStamps = Object.values(stampsByPage).reduce((sum, arr) => sum + arr.length, 0);
  
  console.log('%c✓ 当前标记统计:', 'color: #10b981; font-weight: bold');
  console.log(`  总数: ${totalStamps}`);
  console.log(`  页数: ${Object.keys(stampsByPage).length}`);
  
  for (const [page, stamps] of Object.entries(stampsByPage)) {
    console.log(`  第 ${page} 页: ${stamps.length} 个标记`);
    stamps.forEach((stamp, idx) => {
      console.log(`    ${idx + 1}. [${stamp.type}] ${stamp.id.substring(0, 20)}...`);
    });
  }
  
  console.log('');
  console.log('%c📋 测试步骤:', 'color: #3b82f6; font-weight: bold');
  console.log('1. 找到页面上的任意标记卡片');
  console.log('2. 注意卡片头部右侧有一个 × 删除按钮');
  console.log('3. 点击 × 按钮');
  console.log('4. 确认删除对话框');
  console.log('5. 检查标记是否从页面消失');
  console.log('6. 在 Console 查看 [deleteStamp] 日志');
  console.log('7. 刷新页面或重新打开 PDF，确认标记已永久删除');
  console.log('');
  
  console.log('%c✅ 验证标准:', 'color: #10b981; font-weight: bold');
  console.log('- 删除按钮在卡片头部清晰可见');
  console.log('- 点击后显示确认对话框');
  console.log('- 确认后标记立即从页面消失');
  console.log('- Console 显示 [deleteStamp] 日志');
  console.log('- 刷新后标记不再出现（持久化成功）');
  console.log('- 适用于所有类型: rhythm, form, tactile, generic');
  
})();

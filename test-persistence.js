// ═══════════════════════════════════════════════════════════════════
// 浏览器控制台测试脚本 - 验证持久化功能
// ═══════════════════════════════════════════════════════════════════
// 
// 使用方法：
// 1. 打开浏览器开发者工具 (F12)
// 2. 复制整个文件内容
// 3. 粘贴到 Console 并按回车
// 4. 根据提示进行测试
//
// ═══════════════════════════════════════════════════════════════════

(function() {
  console.clear();
  console.log('%c═══════════════════════════════════════════════════', 'color: #3b82f6; font-weight: bold');
  console.log('%c  持久化功能测试工具  ', 'color: #3b82f6; font-weight: bold; font-size: 16px');
  console.log('%c═══════════════════════════════════════════════════', 'color: #3b82f6; font-weight: bold');
  console.log('');

  // 检查 localStorage 可用性
  function testLocalStorage() {
    console.log('1️⃣  测试 localStorage 可用性...');
    try {
      const testKey = '__ltp_mvp_test__';
      localStorage.setItem(testKey, 'test');
      const value = localStorage.getItem(testKey);
      localStorage.removeItem(testKey);
      
      if (value === 'test') {
        console.log('   ✅ localStorage 工作正常');
        return true;
      } else {
        console.log('   ❌ localStorage 读写失败');
        return false;
      }
    } catch (e) {
      console.log('   ❌ localStorage 不可用:', e.message);
      return false;
    }
  }

  // 列出所有 ltp_mvp 相关的 keys
  function listAllKeys() {
    console.log('');
    console.log('2️⃣  列出所有已保存的 PDF 数据...');
    
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('ltp_mvp::')) {
        keys.push(key);
      }
    }
    
    if (keys.length === 0) {
      console.log('   ℹ️  没有找到任何数据（这是正常的，如果是第一次使用）');
      return [];
    }
    
    console.log(`   找到 ${keys.length} 个条目:`);
    
    // 按 pdfId 分组
    const byPdfId = {};
    keys.forEach(key => {
      const match = key.match(/^ltp_mvp::([^:]+)::(.*)/);
      if (match) {
        const [, pdfId, type] = match;
        if (!byPdfId[pdfId]) {
          byPdfId[pdfId] = [];
        }
        byPdfId[pdfId].push({ type, key });
      }
    });
    
    Object.entries(byPdfId).forEach(([pdfId, items]) => {
      console.log(`   📄 PDF ID: ${pdfId}`);
      items.forEach(({ type, key }) => {
        try {
          const value = localStorage.getItem(key);
          if (type === 'reader_state') {
            const data = JSON.parse(value);
            console.log(`      - reader_state: page ${data.lastPage}, zoom ${Math.round(data.lastZoom * 100)}%`);
          } else if (type === 'stamps') {
            const data = JSON.parse(value);
            const pages = Object.keys(data);
            const totalStamps = Object.values(data).reduce((sum, arr) => sum + arr.length, 0);
            console.log(`      - stamps: ${totalStamps} stamps on pages: ${pages.join(', ')}`);
          } else {
            console.log(`      - ${type}: ${value}`);
          }
        } catch (e) {
          console.log(`      - ${type}: (error parsing)`);
        }
      });
    });
    
    return Object.keys(byPdfId);
  }

  // 详细检查特定 pdfId 的数据
  function inspectPdfId(pdfId) {
    console.log('');
    console.log(`3️⃣  详细检查 PDF ID: ${pdfId}`);
    
    const readerStateKey = `ltp_mvp::${pdfId}::reader_state`;
    const stampsKey = `ltp_mvp::${pdfId}::stamps`;
    const onboardingKey = `ltp_mvp::${pdfId}::onboarding_seen`;
    
    console.log('   localStorage keys:');
    console.log(`   - ${readerStateKey}`);
    console.log(`   - ${stampsKey}`);
    console.log(`   - ${onboardingKey}`);
    console.log('');
    
    console.log('   数据内容:');
    
    // Reader State
    try {
      const readerState = localStorage.getItem(readerStateKey);
      if (readerState) {
        console.log('   ✅ reader_state:', JSON.parse(readerState));
      } else {
        console.log('   ⚠️  reader_state: 未找到');
      }
    } catch (e) {
      console.log('   ❌ reader_state: 解析错误', e.message);
    }
    
    // Stamps
    try {
      const stamps = localStorage.getItem(stampsKey);
      if (stamps) {
        const data = JSON.parse(stamps);
        console.log('   ✅ stamps:', data);
        console.log('      详细信息:');
        Object.entries(data).forEach(([page, stampArray]) => {
          console.log(`      - 第 ${page} 页: ${stampArray.length} 个标记`);
          stampArray.forEach((stamp, idx) => {
            console.log(`        ${idx + 1}. ${stamp.type} at (${stamp.x.toFixed(2)}, ${stamp.y.toFixed(2)})`);
          });
        });
      } else {
        console.log('   ⚠️  stamps: 未找到');
      }
    } catch (e) {
      console.log('   ❌ stamps: 解析错误', e.message);
    }
    
    // Onboarding
    const onboarding = localStorage.getItem(onboardingKey);
    console.log(`   ${onboarding ? '✅' : '⚠️ '} onboarding_seen:`, onboarding || '未找到');
  }

  // 清除所有数据
  function clearAllData() {
    console.log('');
    console.log('4️⃣  清除所有 ltp_mvp 数据...');
    
    let count = 0;
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('ltp_mvp::')) {
        keys.push(key);
      }
    }
    
    keys.forEach(key => {
      localStorage.removeItem(key);
      count++;
    });
    
    console.log(`   ✅ 已清除 ${count} 个条目`);
  }

  // 运行基本测试
  const isLocalStorageWorking = testLocalStorage();
  
  if (isLocalStorageWorking) {
    const pdfIds = listAllKeys();
    
    // 暴露工具函数到全局
    window.__ltpTest = {
      inspect: (pdfId) => {
        if (!pdfId && pdfIds.length > 0) {
          pdfId = pdfIds[0];
          console.log(`使用第一个 PDF ID: ${pdfId}`);
        }
        if (pdfId) {
          inspectPdfId(pdfId);
        } else {
          console.log('请提供 pdfId 参数');
        }
      },
      clear: clearAllData,
      list: listAllKeys
    };
    
    console.log('');
    console.log('%c═══════════════════════════════════════════════════', 'color: #10b981; font-weight: bold');
    console.log('%c  工具函数已就绪  ', 'color: #10b981; font-weight: bold');
    console.log('%c═══════════════════════════════════════════════════', 'color: #10b981; font-weight: bold');
    console.log('');
    console.log('可用命令:');
    console.log('  __ltpTest.list()           - 列出所有 PDF 数据');
    console.log('  __ltpTest.inspect(pdfId)   - 详细检查指定 PDF');
    console.log('  __ltpTest.clear()          - 清除所有数据');
    console.log('');
    
    if (pdfIds.length > 0) {
      console.log(`提示: 运行 __ltpTest.inspect("${pdfIds[0]}") 查看第一个 PDF 的详细信息`);
    } else {
      console.log('提示: 上传一个 PDF 并进行操作后，再次运行此脚本查看保存的数据');
    }
  } else {
    console.log('');
    console.log('❌ localStorage 不可用，无法继续测试');
    console.log('可能原因:');
    console.log('  1. 浏览器处于隐私/无痕模式');
    console.log('  2. 浏览器设置禁用了 localStorage');
    console.log('  3. 存储配额已满');
  }
})();

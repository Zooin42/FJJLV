# 持久化功能调试指南

## 问题现象
用户上传同一个PDF后，返回再重新上传，没有恢复到之前的阅读位置、缩放和标记。

## 调试步骤

### 步骤 1: 打开浏览器开发者工具
1. 打开应用: http://localhost:3002
2. 按 F12 或右键 → 检查 → Console 标签
3. 确保 Console 可见

### 步骤 2: 上传PDF并进行操作
1. 上传一个PDF文件
2. 观察Console输出，应该看到：
   ```
   🔑 [PDF IMPORT] Computed pdfId: xxxx
   📄 [PDF IMPORT] File: xxx.pdf
   ℹ️ [PDF IMPORT] No existing data - this is a new PDF
   ```
3. 记下这个 **pdfId**（重要！）

### 步骤 3: 修改状态
1. 点击"下一页"按钮，导航到第 4 页
2. 点击"+"按钮放大，设置缩放到 125%
3. 点击"＋ 添加标记"按钮
4. 拖动标记到页面中心

### 步骤 4: 观察保存日志
在Console中应该看到以下日志：

```
✅ [READER STATE LOADED] Ready to save reader_state for pdfId: xxxx
SAVE reader_state xxxx ltp_mvp::xxxx::reader_state { lastPage: 4, lastZoom: 1.25 }

✅ [STAMPS LOADED] Ready to save stamps for pdfId: xxxx
SAVE stamps xxxx ltp_mvp::xxxx::stamps 1 stamps on pages: [4]
```

**如果没有看到这些日志，说明保存功能有问题！**

### 步骤 5: 验证localStorage
在Console中运行以下命令：
```javascript
// 替换 YOUR_PDF_ID 为步骤2中记录的pdfId
const pdfId = 'YOUR_PDF_ID';
const readerStateKey = `ltp_mvp::${pdfId}::reader_state`;
const stampsKey = `ltp_mvp::${pdfId}::stamps`;

console.log('Reader State:', JSON.parse(localStorage.getItem(readerStateKey)));
console.log('Stamps:', JSON.parse(localStorage.getItem(stampsKey)));
```

**期望输出**:
```
Reader State: { lastPage: 4, lastZoom: 1.25 }
Stamps: { "4": [{ id: "...", page: 4, ... }] }
```

**如果输出是 null 或 {}，说明数据没有被保存！**

### 步骤 6: 点击返回按钮
1. 点击左上角的"← 返回"按钮
2. 观察Console输出，应该看到：
   ```
   🔙 [BACK BUTTON] Returning to import page
      Current state before leaving:
      - pdfId: xxxx
      - page: 4
      - zoom: 1.25
      - stamps: 1
      localStorage verification:
      - reader_state: { lastPage: 4, lastZoom: 1.25 }
      - stamps: 1 pages
   ```

**如果localStorage verification显示 NOT FOUND，说明数据没有被保存！**

### 步骤 7: 重新上传同一个PDF
1. 再次上传**同一个PDF文件**
2. 观察Console输出，应该看到：
   ```
   🔑 [PDF IMPORT] Computed pdfId: xxxx  (应该和之前一样)
   📄 [PDF IMPORT] File: xxx.pdf
   ✅ [PDF IMPORT] Found existing data for this PDF:
      - reader_state exists
      - stamps exist
      → Will restore previous state
   
   LOAD reader_state xxxx ltp_mvp::xxxx::reader_state { lastPage: 4, lastZoom: 1.25 }
   LOAD stamps xxxx ltp_mvp::xxxx::stamps 1 stamps on pages: [4]
   ```

3. 检查UI:
   - 页码显示应该是 "4 / N"
   - 缩放显示应该是 "125%"
   - 第4页应该有一个标记

### 步骤 8: 如果失败，收集诊断信息

在Console运行：
```javascript
// 列出所有ltp_mvp相关的localStorage条目
console.log('All ltp_mvp keys:');
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  if (key.startsWith('ltp_mvp::')) {
    console.log(key, '→', localStorage.getItem(key).substring(0, 100));
  }
}
```

## 常见问题

### 问题1: 看到 "⏸️ [STAMPS SAVE BLOCKED]"
**原因**: hasLoadedStamps 标志还是 false
**解决**: 这是正常的，说明系统正确阻止了在加载完成前的保存

### 问题2: 没有看到任何 SAVE 日志
**原因**: 
1. 状态可能没有改变
2. hasLoadedState 或 hasLoadedStamps 还是 false
**检查**: 确保你进行了操作（翻页、缩放、添加标记）

### 问题3: pdfId 不一致
**原因**: 上传的不是同一个文件
**解决**: 确保文件内容完全相同（SHA-256哈希相同）

### 问题4: localStorage 显示 null
**原因**: 
1. 浏览器隐私模式
2. localStorage 被禁用
3. 代码逻辑错误
**检查**: 
```javascript
// 测试localStorage是否可用
try {
  localStorage.setItem('test', '1');
  localStorage.removeItem('test');
  console.log('✅ localStorage is working');
} catch (e) {
  console.error('❌ localStorage is not working:', e);
}
```

## 需要报告的信息

如果问题依然存在，请提供：
1. Console 的完整输出（从上传到重新上传的所有日志）
2. 步骤5的 localStorage 验证结果
3. 步骤8的诊断信息
4. 浏览器类型和版本
5. 是否在隐私/无痕模式

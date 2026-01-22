# Form Stamps 功能测试指南

## 功能说明
Form stamps 已完全集成到系统中，包括：
- ✅ 数据模型 (FormPayload with silhouette)
- ✅ UI 面板 (6 个提示模板 + 笔记输入)
- ✅ 创建逻辑 (智能放置 + 偏移策略)
- ✅ 持久化 (自动保存到 localStorage)
- ✅ 渲染显示 (蓝色卡片 + 折叠/展开)
- ✅ 拖拽支持 (边缘吸附)

---

## 手动测试步骤

### 1. 创建 Form Stamp
1. 在应用中导入任意 PDF
2. 点击右下角工具栏的 **□ (Form)** 按钮
3. 在弹出的面板中：
   - 选择一个提示问题（默认已选中第一个）
   - 可选：输入笔记（最多 40 字符）
4. 点击 **"放置形态标记"** 按钮
5. **预期结果**：
   - 面板自动关闭
   - 页面左上角出现蓝色卡片标记
   - 卡片显示选中的提示文本
   - 如果输入了笔记，显示 "笔记: xxx"

### 2. 验证渲染
**展开状态（默认）**：
- 卡片宽度 180px+
- 蓝色边框 (#3b82f6)
- 方形图标 □
- 标题显示 "Form"
- 内容显示提示问题和笔记

**折叠状态**：
- 点击卡片右上角的 **▼** 按钮
- 卡片缩小为 64×40px 芯片
- 只显示图标和 ▲ 按钮
- 点击 ▲ 恢复展开

### 3. 验证拖拽
1. 按住 Form stamp 卡片拖动
2. **预期行为**：
   - 卡片跟随鼠标移动
   - 透明度降低到 90%
   - 边缘吸附：
     - 拖到最左侧 (x<8%) → 自动吸附到 x=5%
     - 拖到最右侧 (x>92%) → 自动吸附到 x=95%
     - 上下边缘同理

### 4. 验证持久化
1. 创建多个 Form stamps（使用不同的提示和笔记）
2. **刷新页面** (Cmd+R / Ctrl+R)
3. **预期结果**：
   - 所有 Form stamps 保持在原位置
   - 提示文本和笔记内容完整恢复
   - 折叠/展开状态保持

### 5. 验证多页支持
1. 在第 1 页创建 Form stamp
2. 翻到第 2 页，再创建一个
3. 切换页面验证：
   - 每页只显示该页的 stamps
   - 跨页切换后内容不丢失

### 6. 测试所有 6 个提示模板
依次选择并放置所有提示：
1. "What does it look like?"
2. "What could this become later?"
3. "Which part of the final model might this be?"
4. "If this had a name, what would it be?"
5. "What object does this remind you of?"
6. "What clue do you notice here?"

**预期结果**：每个 stamp 显示不同的提示文本

### 7. 验证智能放置
1. 在同一页连续添加 5 个 Form stamps
2. **预期行为**：
   - 第 1 个：左上角 (0.15, 0.15)
   - 第 2-5 个：依次向右下偏移 (offset × 0.08)
   - 如果超出边界，重置到左上角

---

## 自动化测试（浏览器控制台）

### 准备工作
1. 导入 PDF 并记住 URL 中的 pdfId
2. 打开浏览器控制台 (F12)
3. 加载测试脚本：
```javascript
// 粘贴 testrun-form-stamps.js 的内容
```

### 设置 pdfId
```javascript
// 方法 1: 从 localStorage 查找
Object.keys(localStorage).filter(k => k.includes('ltp_mvp'))

// 方法 2: 从 URL 获取
// 格式: http://localhost:3004/reader/abc123...

// 修改测试文件中的 TEST_PDF_ID
```

### 运行测试
```javascript
// 运行所有测试
formStampTests.runAll()

// 或单独运行
formStampTests.test1()  // 单个 stamp
formStampTests.test2()  // 所有 6 个提示
formStampTests.test3()  // silhouette 变体
formStampTests.inspect() // 查看现有 stamps
formStampTests.cleanup() // 清理测试数据
```

---

## localStorage 结构验证

### 查看 Form stamps 数据
```javascript
// 打开控制台
const pdfId = 'your_pdf_id_here'
const key = `ltp_mvp::${pdfId}::stamps`
const stamps = JSON.parse(localStorage.getItem(key))
console.log(stamps)
```

### 预期数据结构
```javascript
{
  "1": [  // 页码
    {
      "id": "stamp_1737555600000_xyz",
      "pdfId": "abc123...",
      "page": 1,
      "type": "form",
      "x": 0.15,
      "y": 0.15,
      "createdAt": 1737555600000,
      "payload": {
        "promptId": "form_looks_like",
        "promptText": "What does it look like?",
        "note": "Optional note text",  // 可选
        "silhouette": {
          "kind": "none"  // 或 "auto_placeholder" 或 "manual_bbox"
        }
      }
    }
  ]
}
```

---

## 常见问题排查

### Form stamp 不显示
- 检查控制台是否有错误
- 确认 `stampsByPage[currentPage]` 包含 Form stamps
- 验证 `stamp.type === 'form'`

### 持久化失败
- 确认 `hasLoadedStamps.current === true`
- 检查 useEffect 依赖数组 `[pdfId, stampsByPage]`
- 查看 DevTools → Application → Local Storage

### 拖拽不工作
- 确认 StampLayer 传递了 `onStampPositionChange`
- 检查 pointer events 是否被阻止
- 验证 `stageWidth` 和 `stageHeight` 非零

### 面板不关闭/不打开
- 确认 `activePanel` 状态正确切换
- 检查 `onClose()` 调用
- 验证 `handlePanelClose` 函数

---

## 成功标准
✅ 所有 6 个提示模板可选择并创建  
✅ 笔记输入正常工作（最多 40 字符）  
✅ Form stamps 显示为蓝色卡片  
✅ 拖拽平滑且支持边缘吸附  
✅ 刷新页面后数据完整恢复  
✅ 折叠/展开功能正常  
✅ 控制台无错误或警告  
✅ 多页支持正常

---

## 下一步
- [ ] 添加 silhouette 可视化（bbox 框选）
- [ ] 实现 Form stamp 编辑功能
- [ ] 添加删除 stamp 功能
- [ ] Tactile stamps 实现

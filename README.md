# React 应用

这是一个使用 Vite 构建的 React 应用。

## 开始使用

### 安装依赖
```bash
npm install
```

### 启动开发服务器
```bash
npm run dev
```

应用将在 http://localhost:3000 打开。

### 构建生产版本
```bash
npm run build
```

### 预览生产版本
```bash
npm run preview
```

## 技术栈

- React 18
- Vite 5
- React Router DOM 6

## DEV 模式 - 持久化测试指南

**前提条件**: 在浏览器中打开 DevTools Console

### 数据层实现原理

**如何判断是同一个用户上传了同一份PDF？**

1. **PDF 唯一标识符 (pdfId)**:
   - 使用 SHA-256 算法计算 PDF 文件内容的哈希值
   - 取哈希值的前 24 个字符作为 pdfId
   - **关键特性**: 相同的文件内容 → 相同的 pdfId（与文件名无关）
   
2. **localStorage 持久化策略**:
   ```
   ltp_mvp::{pdfId}::reader_state  → { lastPage: number, lastZoom: number }
   ltp_mvp::{pdfId}::stamps         → 按页码分组的标记数据
   ltp_mvp::{pdfId}::onboarding_seen → 引导已显示标记
   ```

3. **状态恢复机制**:
   - 用户上传 PDF → 计算 pdfId → 查询 localStorage
   - 如果存在对应 pdfId 的数据 → 自动恢复上次的阅读位置和标记
   - 不同浏览器标签页、不同时间上传同一文件，都会恢复到相同状态

**为什么这样设计有效？**
- SHA-256 保证：文件内容不变，pdfId 就不变
- localStorage 按 pdfId 存储：每个PDF有独立的状态空间
- 跨标签页共享：localStorage 在同一域名下所有标签页共享

### E2E 手动测试步骤

#### 步骤 1: 初始化测试
1. 导入一个 PDF 文件
2. Console 会显示: `🔑 [PDF IMPORT] Computed pdfId: xxx`
3. 导航到第 4 页 (点击下一页按钮)
4. 设置缩放为 1.25 (125%) - 点击放大按钮一次
5. Console 会显示: `SAVE reader_state` with `{ lastPage: 4, lastZoom: 1.25 }`

#### 步骤 2: 添加标记
1. 点击 "＋ 添加标记" 按钮
2. 拖动标记到页面中心位置
3. Console 会显示: `SAVE stamps` 和更新信息

#### 步骤 3: 测试状态恢复 (同一标签页)
1. 点击 "← 返回" 按钮返回导入页面
2. 重新导入**相同的** PDF 文件
3. 检查 Console:
   - `LOAD reader_state` 应显示 `{ lastPage: 4, lastZoom: 1.25 }`
   - `LOAD stamps` 应显示标记数据
   - `🔍 [PERSISTENCE CHECK]` 自动验证会在 500ms 后运行

**✅ 期望结果**:
- 页码显示为 "4 / N"
- 缩放显示为 "125%"
- 标记出现在第 4 页相同位置

#### 步骤 4: 跨标签页测试
1. 打开新的浏览器标签页/窗口
2. 访问应用 (http://localhost:3002)
3. 导入**相同的** PDF 文件
4. 检查 Console 和 UI

**✅ 期望结果**:
- 相同的恢复状态: 第 4 页, 125% 缩放
- 标记在相同位置可见

### 手动验证命令

在 Console 中输入以下命令进行手动验证:
```javascript
window.__verifyPersistence()
```

这会显示:
- 当前 pdfId
- localStorage 键名
- localStorage 原始值
- 标记统计信息

### 故障排查

如果任何步骤失败:
1. Console 会自动显示 `[PERSISTENCE CHECK]` 信息
2. 检查 localStorage 键是否正确
3. 检查原始值是否被保存
4. 使用 DebugPanel (右下角) 点击 "Inspect reader state" 和 "Inspect stamps"

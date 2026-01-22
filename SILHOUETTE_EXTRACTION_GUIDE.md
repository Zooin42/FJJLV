# 轮廓提取功能测试指南

## 功能概述

Form Path 标记现在支持自动提取选定区域的简化轮廓（silhouette）。当用户选择一个图形区域时，系统会：

1. 裁剪选定的边界框区域
2. 转换为灰度图像
3. 应用阈值生成黑白轮廓
4. 可选应用边缘检测增强
5. 生成缩略图（最大 150×150px）
6. 存储为 data URL，包含在标记中

## 实现架构

### 新增文件

**`src/utils/silhouetteExtractor.js`**
- 核心轮廓提取工具函数
- 提供两种模式：
  - `extractSilhouette()` - 完整版（包含边缘检测）
  - `extractSimpleSilhouette()` - 快速版（仅二值化）

### 修改文件

1. **`src/components/RegionSelector.jsx`**
   - 导入 `extractSimpleSilhouette`
   - 添加 `isProcessingSilhouette` 状态
   - 在 `handleRegionClick()` 中调用轮廓提取
   - 返回包含 `{ region, silhouette }` 的数据

2. **`src/components/StampPanel.jsx`**
   - 更新 `handlePlaceFormStamp()` 处理轮廓数据
   - 添加轮廓预览 UI（`silhouette-preview` 区域）
   - 显示轮廓缩略图

3. **`src/components/StampPanel.css`**
   - 新增 `.silhouette-preview` 样式
   - 新增 `.preview-image-container` 样式
   - 新增 `.preview-image` 样式（crisp-edges 渲染）

4. **`src/pages/ReaderPage.jsx`**
   - 更新 `handleAddFormStamp()` 签名，接收 `bbox` 和 `silhouetteData`
   - 构建 silhouette 对象，包含图像数据
   - 存储到 Form stamp payload

## 数据结构

### Silhouette 对象

```javascript
{
  dataUrl: "data:image/png;base64,...",  // Base64 编码的 PNG 图像
  width: 150,                             // 轮廓图像宽度（像素）
  height: 120,                            // 轮廓图像高度（像素）
  originalRegion: {                       // 原始区域边界框
    x: 150,
    y: 200,
    width: 300,
    height: 240
  }
}
```

### Form Stamp Payload（更新）

```javascript
{
  type: "form",
  payload: {
    promptId: "form_looks_like",
    promptText: "What does it look like?",
    note: "用户笔记（可选）",
    silhouette: {
      kind: 'manual_bbox',              // 'none' | 'auto_placeholder' | 'manual_bbox'
      bbox: { x, y, w, h },             // 归一化坐标
      silhouetteImage: {                // 轮廓图像数据
        dataUrl: "data:image/png;...",
        width: 150,
        height: 120
      }
    }
  }
}
```

## 测试步骤

### 步骤 1: 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

### 步骤 2: 上传包含图形的 PDF

- 选择一个包含明显图形/图表的 PDF 文件
- 示例：技术图纸、流程图、建筑图、产品设计图

### 步骤 3: 触发 Form Path 流程

1. 点击右下角 **Form Path (□)** 按钮
2. 点击 **"🔍 扫描页面"** 按钮
3. 等待区域扫描完成（"✨ 发现 N 个候选区域"）
4. 高亮区域出现在 PDF 上

### 步骤 4: 选择区域并观察轮廓提取

1. 点击任意高亮区域
2. 观察状态变化：
   - "✨ 提取轮廓中..." 提示出现
   - Spinner 动画显示
   - 自动提取轮廓（约 0.5-2 秒）
3. 返回 Form Panel

### 步骤 5: 检查轮廓预览

Form Panel 应该显示：

```
✅ 已选择区域
位置: (150, 200)
尺寸: 300 × 240

形状轮廓:
[黑白轮廓缩略图显示在此]
✨ 此轮廓将包含在标记中
```

### 步骤 6: 完成标记创建

1. 选择提示问题（例如 "What does it look like?"）
2. 可选：添加笔记
3. 点击 **"放置形态标记"**
4. 标记创建完成

### 步骤 7: 验证数据持久化

打开浏览器 DevTools Console，运行：

```javascript
const pdfId = 'YOUR_PDF_ID';  // 从导入时的日志获取
const stampsKey = `ltp_mvp::${pdfId}::stamps`;
const stamps = JSON.parse(localStorage.getItem(stampsKey));
console.log('Form stamps with silhouettes:', stamps);
```

检查输出中的 Form stamp 是否包含：
- `silhouette.kind === 'manual_bbox'`
- `silhouette.silhouetteImage.dataUrl` 存在
- `silhouette.silhouetteImage.width/height` 值正确

## 轮廓提取算法

### 处理流程

```
原始 PDF Canvas
    ↓
[1] 裁剪区域 (cropRegion)
    - 提取 bbox 对应的像素区域
    ↓
[2] 缩放 (scaleCanvas)
    - 最大 150×150px
    - 保持宽高比
    - 高质量插值
    ↓
[3] 灰度转换 (convertToGrayscale)
    - 公式: 0.299*R + 0.587*G + 0.114*B
    ↓
[4] 二值化 (applyThreshold)
    - 阈值: 128 (可配置)
    - 反转: true（黑色形状，白色背景）
    ↓
[5] 边缘增强 (enhanceEdges) - 可选
    - Sobel 算子 3×3 卷积
    - 计算梯度幅值
    ↓
输出: PNG data URL
```

### 关键参数

```javascript
extractSimpleSilhouette(canvas, region, {
  threshold: 128,      // 二值化阈值 (0-255)
  invert: true,        // 反转颜色（黑形状/白背景）
  maxWidth: 150,       // 输出最大宽度
  maxHeight: 150       // 输出最大高度
})
```

## 调试技巧

### 检查轮廓提取日志

在 DEV 模式下，Console 会显示详细日志：

```
[Silhouette] Extracting from region: {x, y, width, height}
[RegionSelector] Silhouette extracted: {
  width: 150,
  height: 120,
  dataUrlLength: 12345
}
```

### 查看轮廓图像

在 Console 中运行：

```javascript
// 获取最近创建的 Form stamp
const stamps = Object.values(JSON.parse(localStorage.getItem('ltp_mvp::YOUR_PDF_ID::stamps')));
const formStamp = stamps.flat().find(s => s.type === 'form');
const dataUrl = formStamp?.payload?.silhouette?.silhouetteImage?.dataUrl;

// 在新标签页打开图像
if (dataUrl) {
  window.open(dataUrl);
}
```

### 调整阈值测试

修改 `RegionSelector.jsx` 中的阈值参数：

```javascript
extractSimpleSilhouette(pdfCanvas, region, {
  threshold: 100,  // 降低阈值 → 更多黑色区域
  // threshold: 180,  // 提高阈值 → 更少黑色区域
  invert: true,
  maxWidth: 150,
  maxHeight: 150
})
```

## 已知限制

1. **性能**: 大区域（> 500×500px）提取时间可能达到 2-3 秒
2. **准确度**: 简化算法，不适用于复杂背景或低对比度图形
3. **文件大小**: data URL 通常 10-50KB，可能影响 localStorage 容量
4. **浏览器兼容**: 需要 Canvas API 支持（所有现代浏览器）

## 后续增强建议

1. **可配置阈值**: 让用户在 UI 中调整阈值滑块
2. **轮廓编辑**: 允许用户手动调整边界框
3. **多种算法**: 提供边缘检测、形态学操作等选项
4. **WebGL 加速**: 使用 GPU 加速大图处理
5. **向量化**: 将轮廓转换为 SVG 路径（更小文件）

## 相关文件清单

- ✅ `src/utils/silhouetteExtractor.js` - 核心提取逻辑
- ✅ `src/components/RegionSelector.jsx` - 触发提取
- ✅ `src/components/StampPanel.jsx` - 显示预览
- ✅ `src/components/StampPanel.css` - 预览样式
- ✅ `src/pages/ReaderPage.jsx` - 数据存储
- ✅ `src/types/stamp.js` - 类型定义（FormPayload）

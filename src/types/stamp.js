/**
 * Rhythm Payload - 节奏标记的特定数据
 * @typedef {Object} RhythmPayload
 * @property {number} steps - 节奏步数 (2-8)
 * @property {number} repeats - 重复次数 (2-12)
 * @property {string} stickerId - 预制资源ID
 */

/**
 * Silhouette - 形状轮廓信息
 * @typedef {Object} Silhouette
 * @property {'none' | 'auto_placeholder' | 'manual_bbox'} kind - 轮廓类型
 * @property {{ x: number, y: number, w: number, h: number }} [bbox] - 边界框（归一化坐标 0-1）
 */

/**
 * Form Payload - 形态标记的特定数据
 * @typedef {Object} FormPayload
 * @property {string} promptId - 使用的提示模板ID
 * @property {string} promptText - 在标记上显示的简短文本（例如："What does it look like?"）
 * @property {string} [note] - 可选的用户输入，简短笔记
 * @property {Silhouette} [silhouette] - 可选的轮廓信息
 */

/**
 * Tactile Payload - 触觉标记的特定数据
 * @typedef {Object} TactilePayload
 * @property {string} gestureId - 手势标识符 (例如 "tap", "press", "pinch")
 * @property {string} gestureEmoji - 手势的 emoji 表示 (例如 👆 ✋ 🤏)
 * @property {string} [feelId] - 可选的触感修饰符ID
 * @property {string} [feelEmoji] - 可选的触感 emoji (例如 🌵 ☁️ 🧱)
 * @property {string} [feelLabel] - 简短的触感文本标签
 */

/**
 * Base Stamp - 所有标记的基础属性
 * @typedef {Object} BaseStamp
 * @property {string} id - 唯一标识符
 * @property {string} pdfId - 所属 PDF 文档的 ID
 * @property {number} page - 所在页码
 * @property {number} x - X 坐标 (0..1, 相对位置)
 * @property {number} y - Y 坐标 (0..1, 相对位置)
 * @property {number} createdAt - 创建时间戳
 */

/**
 * Generic Stamp - 通用标记（无特定payload）
 * @typedef {BaseStamp & { type: "generic", payload: {} }} GenericStamp
 */

/**
 * Rhythm Stamp - 节奏标记
 * @typedef {BaseStamp & { type: "rhythm", payload: RhythmPayload }} RhythmStamp
 */

/**
 * Form Stamp - 形态标记
 * @typedef {BaseStamp & { type: "form", payload: FormPayload }} FormStamp
 */

/**
 * Tactile Stamp - 触觉标记
 * @typedef {BaseStamp & { type: "tactile", payload: TactilePayload }} TactileStamp
 */

/**
 * Stamp - 标记类型的 discriminated union
 * @typedef {GenericStamp | RhythmStamp | FormStamp | TactileStamp} Stamp
 */

/**
 * 按页码分组的 Stamp 集合
 * @typedef {Record<number, Stamp[]>} StampsByPage
 */

// 导出空对象以使此文件成为模块
export {}

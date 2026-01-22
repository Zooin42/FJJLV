/**
 * 使用 SHA-256 计算 PDF 文件的哈希值
 * @param {File} file - PDF 文件对象
 * @returns {Promise<string>} 返回前 24 位十六进制哈希值作为 pdfId
 */
export async function computePdfId(file) {
  // 读取文件内容
  const arrayBuffer = await file.arrayBuffer()
  
  // 使用 Web Crypto API 计算 SHA-256
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer)
  
  // 转换为十六进制字符串
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('')
  
  // 返回前 24 位字符
  return hashHex.substring(0, 24)
}

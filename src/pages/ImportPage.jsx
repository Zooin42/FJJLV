import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePdf } from '../context/PdfContext'
import { computePdfId } from '../utils/pdfHash'
import './ImportPage.css'

function ImportPage() {
  const [selectedFile, setSelectedFile] = useState(null)
  const [isHashing, setIsHashing] = useState(false)
  const fileInputRef = useRef(null)
  const navigate = useNavigate()
  const { setPdf } = usePdf()

  const handleFileChange = (event) => {
    const file = event.target.files?.[0]
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file)
    } else if (file) {
      alert('请选择 PDF 文件')
      event.target.value = ''
    }
  }

  const handleOpen = async () => {
    if (!selectedFile) {
      alert('请先选择一个 PDF 文件')
      return
    }

    try {
      setIsHashing(true)
      
      // 计算 PDF ID
      const pdfId = await computePdfId(selectedFile)
      
      if (import.meta.env.DEV) {
        console.log('🔑 [PDF IMPORT] Computed pdfId:', pdfId)
        console.log('📄 [PDF IMPORT] File:', selectedFile.name)
        console.log('💾 [PDF IMPORT] File size:', selectedFile.size, 'bytes')
        
        // 检查是否已有保存的状态
        const readerStateKey = `ltp_mvp::${pdfId}::reader_state`
        const stampsKey = `ltp_mvp::${pdfId}::stamps`
        const hasReaderState = !!localStorage.getItem(readerStateKey)
        const hasStamps = !!localStorage.getItem(stampsKey)
        
        if (hasReaderState || hasStamps) {
          console.log('✅ [PDF IMPORT] Found existing data for this PDF:')
          if (hasReaderState) console.log('   - reader_state exists')
          if (hasStamps) console.log('   - stamps exist')
          console.log('   → Will restore previous state')
        } else {
          console.log('ℹ️ [PDF IMPORT] No existing data - this is a new PDF')
        }
      }
      
      // 将文件保存到上下文
      setPdf(pdfId, selectedFile)
      
      // 导航到阅读器页面，传递 pdfId
      navigate(`/reader/${pdfId}`, { state: { pdfId } })
    } catch (error) {
      console.error('处理 PDF 文件时出错:', error)
      alert('处理文件时出错，请重试')
    } finally {
      setIsHashing(false)
    }
  }

  return (
    <div className="import-page">
      <div className="import-container">
        <h1>PDF 阅读器</h1>
        <p className="subtitle">选择一个 PDF 文件开始阅读</p>
        
        <div className="file-picker-section">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            className="file-input"
            id="pdf-file-input"
          />
          <label htmlFor="pdf-file-input" className="file-label">
            {selectedFile ? selectedFile.name : '选择 PDF 文件'}
          </label>
        </div>

        {selectedFile && (
          <div className="file-info">
            <p>文件名称: {selectedFile.name}</p>
            <p>文件大小: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
          </div>
        )}

        <button 
          className="open-button" 
          onClick={handleOpen}
          disabled={!selectedFile || isHashing}
        >
          {isHashing ? (
            <>
              <span className="spinner"></span>
              处理中...
            </>
          ) : (
            '打开'
          )}
        </button>
      </div>
    </div>
  )
}

export default ImportPage

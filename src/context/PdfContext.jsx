import { createContext, useContext, useState } from 'react'

const PdfContext = createContext(null)

export function PdfProvider({ children }) {
  const [currentPdf, setCurrentPdf] = useState(null)

  const setPdf = (pdfId, file) => {
    setCurrentPdf({ pdfId, file })
  }

  const clearPdf = () => {
    setCurrentPdf(null)
  }

  return (
    <PdfContext.Provider value={{ currentPdf, setPdf, clearPdf }}>
      {children}
    </PdfContext.Provider>
  )
}

export function usePdf() {
  const context = useContext(PdfContext)
  if (!context) {
    throw new Error('usePdf 必须在 PdfProvider 内部使用')
  }
  return context
}

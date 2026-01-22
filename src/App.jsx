import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { PdfProvider } from './context/PdfContext'
import ImportPage from './pages/ImportPage'
import ReaderPage from './pages/ReaderPage'

function App() {
  return (
    <PdfProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<ImportPage />} />
          <Route path="/reader/:pdfId" element={<ReaderPage />} />
        </Routes>
      </BrowserRouter>
    </PdfProvider>
  )
}

export default App

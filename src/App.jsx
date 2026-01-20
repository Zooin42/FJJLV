import { useState } from 'react'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="App">
      <header className="App-header">
        <h1>欢迎使用 React</h1>
        <p>这是一个使用 Vite 构建的 React 应用</p>
        <div className="card">
          <button onClick={() => setCount((count) => count + 1)}>
            点击次数: {count}
          </button>
        </div>
        <p className="read-the-docs">
          编辑 <code>src/App.jsx</code> 开始开发
        </p>
      </header>
    </div>
  )
}

export default App

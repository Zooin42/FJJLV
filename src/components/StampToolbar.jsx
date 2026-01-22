import './StampToolbar.css'

/**
 * StampToolbar - 固定在右下角的标记工具栏
 * 显示三种标记类型的按钮: 节奏、形态、触觉
 */
function StampToolbar({ activePanel, onPanelChange }) {
  const tools = [
    { id: 'rhythm', icon: '♪', label: '节奏' },
    { id: 'form', icon: '□', label: '形态' },
    { id: 'tactile', icon: '✋', label: '触觉' }
  ]

  return (
    <div className="stamp-toolbar">
      {tools.map(tool => (
        <button
          key={tool.id}
          className={`toolbar-button ${activePanel === tool.id ? 'active' : ''}`}
          onClick={() => onPanelChange(tool.id)}
          title={tool.label}
        >
          <span className="toolbar-icon">{tool.icon}</span>
          <span className="toolbar-label">{tool.label}</span>
        </button>
      ))}
    </div>
  )
}

export default StampToolbar

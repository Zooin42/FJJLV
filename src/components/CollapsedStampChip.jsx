/**
 * CollapsedStampChip - 统一的折叠标记芯片组件
 * 所有标记类型（rhythm, form, tactile, generic）使用相同的折叠样式
 * 悬停自动展开，无需点击
 */
function CollapsedStampChip({ icon, typeColor }) {
  return (
    <div className="collapsed-stamp-chip">
      <span className="chip-icon" style={{ color: typeColor }}>{icon}</span>
    </div>
  )
}

export default CollapsedStampChip

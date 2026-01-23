import StampItem from './StampItem'
import './StampLayer.css'

/**
 * StampLayer - 标记覆盖层，显示当前页的所有标记
 */
function StampLayer({ stamps, currentPage, stageWidth, stageHeight, onStampPositionChange, onDelete, isSelectingRegion = false }) {
  // 获取当前页的标记
  const currentPageStamps = stamps[currentPage] || []

  // 如果舞台尺寸无效，不渲染
  if (stageWidth === 0 || stageHeight === 0) {
    return null
  }

  return (
    <div className="stamp-layer">
      {currentPageStamps.map(stamp => (
        <StampItem
          key={stamp.id}
          stamp={stamp}
          stageWidth={stageWidth}
          stageHeight={stageHeight}
          onPositionChange={onStampPositionChange}
          onDelete={onDelete}
          disabled={isSelectingRegion}
        />
      ))}
    </div>
  )
}

export default StampLayer

import './OnboardingOverlay.css'

/**
 * OnboardingOverlay - 首次打开 PDF 时显示的引导覆盖层
 */
function OnboardingOverlay({ onDismiss }) {
  return (
    <div className="onboarding-overlay">
      <div className="onboarding-card">
        <div className="onboarding-content">
          <p className="onboarding-line">你仍然跟随着说明。</p>
          <p className="onboarding-line">有时你可能会注意到不同的感受。</p>
          <p className="onboarding-line">如果你愿意，你可以留下一个小标记。</p>
        </div>
        <div className="onboarding-actions">
          <button className="onboarding-button skip" onClick={onDismiss}>
            跳过
          </button>
          <button className="onboarding-button primary" onClick={onDismiss}>
            知道了
          </button>
        </div>
      </div>
    </div>
  )
}

export default OnboardingOverlay

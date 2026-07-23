import { PictureInPicture2 } from 'lucide-react';
import { getPopoutBridge } from '../desktop/desktopWindowsBridge';

export function PopoutButton({ sym }: { sym: string }) {
  const bridge = getPopoutBridge();
  if (!bridge) return null;

  return (
    <button
      className="popout-open-btn"
      type="button"
      title="弹出盯盘小窗"
      aria-label="弹出盯盘小窗"
      onClick={() => {
        void bridge.openPopout(sym);
      }}
    >
      <PictureInPicture2 className="icon" size={14} />
    </button>
  );
}

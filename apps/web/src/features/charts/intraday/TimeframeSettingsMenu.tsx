import { useState } from 'react';
import { Popover } from '@base-ui/react/popover';
import { Settings2 } from 'lucide-react';
import { Checkbox } from '@web/ui';
import { useIntradayControls } from './controlsContext';
import { TF_OPTIONS } from './timeframes';

export function TimeframeSettingsMenu() {
  const { visibleTfs, toggleTf } = useIntradayControls();
  const [open, setOpen] = useState(false);
  const shown = new Set(visibleTfs);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger className="tf-settings-trigger" aria-label="周期设置" title="周期设置">
        <Settings2 size={12} />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner
          className="tf-settings-positioner"
          side="bottom"
          align="start"
          sideOffset={4}
        >
          <Popover.Popup className="tf-settings-popup" aria-label="周期设置">
            <div className="tf-settings-title">显示哪些周期</div>
            {TF_OPTIONS.map((option) => (
              <label
                key={option.key}
                className={`tf-settings-row${option.analysis ? ' tf-settings-row--fixed' : ''}`}
              >
                <Checkbox
                  size="sm"
                  checked={shown.has(option.key)}
                  disabled={option.analysis}
                  onCheckedChange={() => toggleTf(option.key)}
                />
                {option.label}
                {option.analysis && <span className="tf-settings-tag">分析档</span>}
              </label>
            ))}
            <div className="tf-settings-foot">分析档固定三个；其余现拉现算，不写进存档。</div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

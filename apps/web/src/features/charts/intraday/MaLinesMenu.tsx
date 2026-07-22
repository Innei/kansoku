import { useState } from 'react';
import { Popover } from '@base-ui/react/popover';
import { ChevronDown, Eye, EyeOff, Plus, X } from 'lucide-react';
import { fmt } from '@web/lib/format';
import { useIntradayControls } from './controlsContext';
import { MAX_MA_LINES, MAX_MA_PERIOD, MIN_MA_PERIOD, useMaSeries, type MaLine } from './useMaLines';

interface MaRowProps {
  line: MaLine;
  last: number | null | undefined;
  takenPeriods: number[];
  onChange: (patch: Partial<Omit<MaLine, 'id'>>) => void;
  onRemove: () => void;
}

function MaRow({ line, last, takenPeriods, onChange, onRemove }: MaRowProps) {
  const [draft, setDraft] = useState(String(line.period));
  const [syncedPeriod, setSyncedPeriod] = useState(line.period);

  if (line.period !== syncedPeriod) {
    setSyncedPeriod(line.period);
    setDraft(String(line.period));
  }

  // The period is committed on blur/Enter rather than per keystroke: mid-edit
  // states ("", "1" on the way to "144") are neither valid periods nor worth
  // recomputing the line for, and rejecting them inside a controlled onChange
  // makes the last character undeletable.
  const commit = () => {
    const period = Math.trunc(Number(draft));
    const valid =
      draft.trim() !== '' &&
      Number.isFinite(period) &&
      period >= MIN_MA_PERIOD &&
      period <= MAX_MA_PERIOD &&
      !takenPeriods.includes(period);
    if (valid) onChange({ period });
    else setDraft(String(line.period));
  };

  return (
    <div className="ma-row">
      <button
        type="button"
        className="ma-row-eye"
        aria-label={line.visible ? `隐藏 EMA${line.period}` : `显示 EMA${line.period}`}
        onClick={() => onChange({ visible: !line.visible })}
      >
        {line.visible ? <Eye size={12} /> : <EyeOff size={12} />}
      </button>
      <input
        type="color"
        className="ma-row-color"
        aria-label={`EMA${line.period} 颜色`}
        value={line.color}
        onChange={(e) => onChange({ color: e.target.value })}
      />
      <input
        type="number"
        className="ma-row-period"
        aria-label={`EMA${line.period} 周期`}
        min={MIN_MA_PERIOD}
        max={MAX_MA_PERIOD}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            commit();
            e.currentTarget.blur();
          }
          if (e.key === 'Escape') setDraft(String(line.period));
        }}
      />
      <span className="ma-row-last">{last != null ? `$${fmt(last)}` : '—'}</span>
      <button
        type="button"
        className="ma-row-del"
        aria-label={`删除 EMA${line.period}`}
        onClick={onRemove}
      >
        <X size={11} />
      </button>
    </div>
  );
}

export function MaLinesMenu({ candles }: { candles: { time: number; close: number }[] }) {
  const { maLines, addMaLine, removeMaLine, updateMaLine } = useIntradayControls();
  const [open, setOpen] = useState(false);
  const series = useMaSeries(candles, maLines);
  const visibleCount = maLines.filter((l) => l.visible).length;
  const lastByLineId = new Map(series.map((s) => [s.line.id, s.last]));

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger className="ma-menu-trigger" aria-label="均线设置">
        均线 {visibleCount}
        <ChevronDown className="icon" size={11} />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner className="ma-menu-positioner" side="bottom" align="end" sideOffset={4}>
          <Popover.Popup className="ma-menu-popup" aria-label="均线设置">
            <div className="ma-menu-title">均线（EMA）</div>
            {maLines.map((line) => (
              <MaRow
                key={line.id}
                line={line}
                last={lastByLineId.get(line.id)}
                takenPeriods={maLines.filter((l) => l.id !== line.id).map((l) => l.period)}
                onChange={(patch) => updateMaLine(line.id, patch)}
                onRemove={() => removeMaLine(line.id)}
              />
            ))}
            <button
              type="button"
              className="ma-menu-add"
              disabled={maLines.length >= MAX_MA_LINES}
              onClick={addMaLine}
            >
              <Plus size={11} /> 添加均线
            </button>
            <div className="ma-menu-foot">最多 {MAX_MA_LINES} 条；只影响画线，不影响 AI 判断。</div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

import { Checkbox as BaseCheckbox } from '@base-ui/react/checkbox';
import { Check } from 'lucide-react';

export type CheckboxSize = 'sm' | 'md';

const ICON_SIZE: Record<CheckboxSize, number> = { sm: 9, md: 11 };

export function Checkbox({
  checked,
  onCheckedChange,
  disabled = false,
  size = 'md',
  ariaLabel,
  className,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: CheckboxSize;
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <BaseCheckbox.Root
      aria-label={ariaLabel}
      checked={checked}
      disabled={disabled}
      className={`ui-checkbox ui-checkbox--${size}${className ? ` ${className}` : ''}`}
      onCheckedChange={onCheckedChange}
    >
      <BaseCheckbox.Indicator className="ui-checkbox-indicator">
        <Check size={ICON_SIZE[size]} strokeWidth={3} />
      </BaseCheckbox.Indicator>
    </BaseCheckbox.Root>
  );
}

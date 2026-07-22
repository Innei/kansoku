// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Checkbox } from './Checkbox';

afterEach(() => cleanup());

describe('Checkbox', () => {
  it('exposes the checked state through data attributes for CSS to hook into', () => {
    const { container, rerender } = render(<Checkbox checked={false} onCheckedChange={vi.fn()} />);
    expect(container.querySelector('.ui-checkbox')?.hasAttribute('data-unchecked')).toBe(true);

    rerender(<Checkbox checked onCheckedChange={vi.fn()} />);
    expect(container.querySelector('.ui-checkbox')?.hasAttribute('data-checked')).toBe(true);
  });

  it('reports the next state once per click', () => {
    const onCheckedChange = vi.fn();
    render(<Checkbox checked={false} ariaLabel="显示均线" onCheckedChange={onCheckedChange} />);

    fireEvent.click(screen.getByRole('checkbox', { name: '显示均线' }));

    expect(onCheckedChange).toHaveBeenCalledTimes(1);
    expect(onCheckedChange).toHaveBeenCalledWith(true, expect.anything());
  });

  it('stays silent while disabled', () => {
    const onCheckedChange = vi.fn();
    render(
      <Checkbox checked={false} disabled ariaLabel="锁定项" onCheckedChange={onCheckedChange} />,
    );

    fireEvent.click(screen.getByRole('checkbox', { name: '锁定项' }));

    expect(onCheckedChange).not.toHaveBeenCalled();
  });

  it('only fires once when wrapped in a label and the label text is clicked', () => {
    const onCheckedChange = vi.fn();
    render(
      <label>
        <Checkbox checked={false} onCheckedChange={onCheckedChange} />
        显示均线
      </label>,
    );

    fireEvent.click(screen.getByText('显示均线'));

    expect(onCheckedChange).toHaveBeenCalledTimes(1);
  });

  it('carries the size modifier so callers can pick the compact variant', () => {
    const { container } = render(<Checkbox checked size="sm" onCheckedChange={vi.fn()} />);

    expect(container.querySelector('.ui-checkbox--sm')).toBeTruthy();
  });
});

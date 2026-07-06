import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

type TooltipPlacement = "top" | "bottom";

interface TooltipPosition {
  left: number;
  top: number;
}

interface TooltipProps {
  children: ReactNode;
  className?: string;
  content: ReactNode;
  disabled?: boolean;
  focusable?: boolean;
  placement?: TooltipPlacement;
}

function hasContent(content: ReactNode): boolean {
  return content !== null && content !== undefined && content !== false && content !== "";
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function Tooltip({
  children,
  className,
  content,
  disabled,
  focusable = false,
  placement = "top",
}: TooltipProps) {
  const id = useId();
  const anchorRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<TooltipPosition | null>(null);
  const active = !disabled && hasContent(content);

  useEffect(() => {
    if (!open || !active) return;

    const update = () => {
      const rect = anchorRef.current?.getBoundingClientRect();
      if (!rect) return;

      const gap = 8;
      setPosition({
        left: clamp(rect.left + rect.width / 2, 12, window.innerWidth - 12),
        top: placement === "bottom" ? rect.bottom + gap : rect.top - gap,
      });
    };

    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [active, open, placement]);

  if (!active) return <>{children}</>;

  return (
    <>
      <span
        ref={anchorRef}
        className={`tooltip-anchor${className ? ` ${className}` : ""}`}
        tabIndex={focusable ? 0 : undefined}
        aria-describedby={open ? id : undefined}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        {children}
      </span>
      {open &&
        position &&
        createPortal(
          <span
            id={id}
            role="tooltip"
            className="tooltip-panel"
            data-placement={placement}
            style={{ left: position.left, top: position.top }}
          >
            {content}
          </span>,
          document.body,
        )}
    </>
  );
}

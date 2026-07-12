import { ScrollArea as BaseScrollArea } from "@base-ui/react/scroll-area";
import type { ReactNode } from "react";

type Orientation = "vertical" | "horizontal";

export function ScrollArea({
  children,
  className,
  viewportClassName,
  contentClassName,
  orientation = "vertical",
}: {
  children: ReactNode;
  className?: string;
  viewportClassName?: string;
  contentClassName?: string;
  orientation?: Orientation;
}) {
  return (
    <BaseScrollArea.Root
      className={`scroll-area${className ? ` ${className}` : ""}`}
      data-orientation={orientation}
    >
      <BaseScrollArea.Viewport
        className={`scroll-area-viewport${viewportClassName ? ` ${viewportClassName}` : ""}`}
      >
        <BaseScrollArea.Content
          className={`scroll-area-content${contentClassName ? ` ${contentClassName}` : ""}`}
        >
          {children}
        </BaseScrollArea.Content>
      </BaseScrollArea.Viewport>
      <BaseScrollArea.Scrollbar orientation={orientation} className="scroll-area-scrollbar">
        <BaseScrollArea.Thumb className="scroll-area-thumb" />
      </BaseScrollArea.Scrollbar>
    </BaseScrollArea.Root>
  );
}

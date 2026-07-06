import { useEffect } from "react";

const BRAND = "盘面";

export function useTitle(pageName: string | null | undefined): void {
  useEffect(() => {
    document.title = pageName ? `${pageName} · ${BRAND}` : BRAND;
  }, [pageName]);
}

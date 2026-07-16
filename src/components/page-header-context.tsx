import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Header = { title?: string; backTo?: string };
type Ctx = { header: Header; set: (h: Header) => void };

const PageHeaderCtx = createContext<Ctx>({ header: {}, set: () => {} });

export function PageHeaderProvider({ children }: { children: ReactNode }) {
  const [header, set] = useState<Header>({});
  return <PageHeaderCtx.Provider value={{ header, set }}>{children}</PageHeaderCtx.Provider>;
}

export function usePageHeader() {
  return useContext(PageHeaderCtx).header;
}

export function useSetPageHeader(h: Header) {
  const { set } = useContext(PageHeaderCtx);
  useEffect(() => {
    set(h);
    return () => set({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [h.title, h.backTo]);
}

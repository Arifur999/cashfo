"use client";

import { usePathname } from "next/navigation";
import { createContext, useContext, useLayoutEffect, useState, type Dispatch, type SetStateAction } from "react";

// A record page's name for the top bar's breadcrumb ("Users › Sharmin
// Akter"): the page renders <BreadcrumbTitle title={owner.name} />, and the
// breadcrumb reads it back for as long as that page is open.
interface RecordTitle {
  path: string;
  title: string;
}

const RecordTitleContext = createContext<RecordTitle | null>(null);
const SetRecordTitleContext = createContext<Dispatch<SetStateAction<RecordTitle | null>>>(() => {});

export const BreadcrumbProvider = ({ children }: { children: React.ReactNode }) => {
  const [record, setRecord] = useState<RecordTitle | null>(null);
  return (
    <SetRecordTitleContext value={setRecord}>
      <RecordTitleContext value={record}>{children}</RecordTitleContext>
    </SetRecordTitleContext>
  );
};

const BreadcrumbTitle = ({ title }: { title: string }) => {
  const pathname = usePathname();
  const setRecord = useContext(SetRecordTitleContext);
  // Before paint, so a client-side visit never shows the crumb without it.
  useLayoutEffect(() => {
    setRecord({ path: pathname, title });
    return () => setRecord((current) => (current?.path === pathname ? null : current));
  }, [pathname, title, setRecord]);
  return null;
};

// The open record page's name, or null on any other page.
export const useRecordTitle = () => {
  const record = useContext(RecordTitleContext);
  const pathname = usePathname();
  return record?.path === pathname ? record.title : null;
};

export default BreadcrumbTitle;

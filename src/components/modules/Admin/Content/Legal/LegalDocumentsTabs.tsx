"use client";

import { useQuery } from "@tanstack/react-query";
import Callout from "@/components/shared/Callout";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { legalDocumentsQuery } from "@/queries/legalDocument.queries";
import LegalDocumentEditor from "./LegalDocumentEditor";
import { LEGAL_DOC_LABELS } from "./legalDocumentLabels";

const LegalDocumentsTabs = ({ canManage }: { canManage: boolean }) => {
  const documents = useQuery(legalDocumentsQuery()).data?.data ?? [];

  if (documents.length === 0) {
    return <Callout>No legal documents exist yet -- they&apos;re created by the database seed.</Callout>;
  }

  return (
    <Tabs defaultValue={documents[0].type}>
      <TabsList variant="line" aria-label="Legal documents">
        {documents.map((document) => (
          <TabsTrigger key={document.type} value={document.type}>
            {LEGAL_DOC_LABELS[document.type]}
            <Badge variant="secondary" className="ml-1">
              v{document.version}
            </Badge>
          </TabsTrigger>
        ))}
      </TabsList>
      {documents.map((document) => (
        // Kept mounted (just hidden), so unsaved edits survive a tab switch.
        <TabsContent key={document.type} value={document.type} forceMount className="mt-2 data-[state=inactive]:hidden">
          <LegalDocumentEditor document={document} canManage={canManage} />
        </TabsContent>
      ))}
    </Tabs>
  );
};

export default LegalDocumentsTabs;

import { Download } from "lucide-react";
import T from "@/components/shared/T";
import Button from "@/components/smartly/Button";

// The page header's Export as a plain download link: the API builds the
// spreadsheet (every row the filters match), so nothing waits in the page.
const ExportLink = ({ href }: { href: string }) => (
  <Button asChild variant="secondary" size="md">
    <a href={href} download>
      <Download className="size-4 text-ink-2" aria-hidden="true" />
      <T>Export</T>
    </a>
  </Button>
);

export default ExportLink;

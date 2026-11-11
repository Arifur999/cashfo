"use client";

import { useQuery } from "@tanstack/react-query";
import { Eye } from "lucide-react";
import { useState } from "react";
import { HelpCompanyCards } from "@/components/modules/Customer/Settings/HelpCompanyCards";
import { HelpVideos } from "@/components/modules/Customer/Settings/HelpVideos";
import { PopupDialog } from "@/components/modules/Customer/Shared/PopupDialog";
import Button from "@/components/smartly/Button";
import ErrorState from "@/components/smartly/ErrorState";
import SkeletonRows from "@/components/smartly/SkeletonRows";
import { clockIn } from "@/lib/customer/helpPage";
import { APP_TIME_ZONE } from "@/lib/date";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { adminHelpQuery } from "@/queries/help.queries";

// "See the user Help page" (the page head) and "Open Help page" (What users
// see now): an admin can't open the customer app, so the button shows the
// Help page's two live parts -- the shown video guides and the company card
// -- as users see them, in a preview that changes nothing.
const HelpPageButton = ({ look }: { look: "head" | "card" }) => {
  const { translate } = useLocale();
  const [open, setOpen] = useState(false);
  const query = useQuery({ ...adminHelpQuery(), enabled: open });
  const help = query.data?.data;
  const shown = help?.videos.filter((video) => video.shown) ?? [];

  return (
    <>
      {look === "head" ? (
        <Button variant="secondary" size="md" onClick={() => setOpen(true)}>
          <Eye aria-hidden="true" />
          {translate("See the user Help page")}
        </Button>
      ) : (
        <Button variant="action" size="sm" className="h-9 flex-1 text-[13px]" onClick={() => setOpen(true)}>
          {translate("Open Help page")}
        </Button>
      )}
      <PopupDialog
        open={open}
        onClose={() => setOpen(false)}
        width={940}
        title={translate("The user Help page")}
        sub={translate("What users see in Settings › Help & support, live. Nothing here can be changed.")}
        bodyClassName="bg-page"
      >
        {help ? (
          <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
            <HelpVideos videos={shown} all={shown} />
            <HelpCompanyCards company={help.company} clock={clockIn(APP_TIME_ZONE)} onIdea={() => undefined} />
          </div>
        ) : query.isError ? (
          <ErrorState title={translate("Couldn't load the Help page")} onRetry={() => void query.refetch()} />
        ) : (
          <SkeletonRows rows={4} avatar={false} />
        )}
      </PopupDialog>
    </>
  );
};

export default HelpPageButton;

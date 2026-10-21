"use client";

import Link from "next/link";
import FormDrawer from "@/components/shared/dialog/FormDrawer";
import SelectControl from "@/components/shared/form/SelectControl";
import T from "@/components/shared/T";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { userRecordHref } from "@/lib/navItem";
import type { FeatureRequestStatus, IFeatureRequest } from "@/types/featureRequest.types";
import { askedText, votesText } from "./FeatureRequestCard";
import { DECLINED_COLUMN, FEATURE_REQUEST_COLUMNS } from "./featureRequestOptions";

const STATUS_OPTIONS = [...FEATURE_REQUEST_COLUMNS, DECLINED_COLUMN].map((column) => ({ value: column.status, label: column.label }));

interface FeatureRequestDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // The request on show, kept while the drawer slides away.
  request: IFeatureRequest | undefined;
  canManage: boolean;
  onMove: (status: FeatureRequestStatus) => void;
}

// One request in full: what the customer asked in their own words, when,
// how many want it and who asked (their page, when they have an account),
// with the same moves the card's menu offers.
const FeatureRequestDrawer = ({ open, onOpenChange, request, canManage, onMove }: FeatureRequestDrawerProps) => {
  const { locale, translate } = useLocale();
  const requester = request?.requester;

  return (
    <FormDrawer
      open={open && request !== undefined}
      onOpenChange={onOpenChange}
      title="Feature request"
      description={request ? `${askedText(request.createdAt, translate)} · ${votesText(request.voteCount, translate, locale)}` : undefined}
      width="lg"
      closeOnOutsideClick
    >
      {request && (
        <div className="flex flex-col gap-5">
          {/* The customer's own title, as they wrote it: the drawer head
              translates, so it can't carry it. */}
          <h3 className="text-title wrap-break-word text-ink">{request.title}</h3>
          {canManage && <SelectControl label="Status" value={request.status} options={STATUS_OPTIONS} onValueChange={onMove} className="h-11 rounded-md border-line-strong bg-surface text-body text-ink" />}
          <section className="flex flex-col gap-2">
            <h3 className="text-small font-semibold text-ink-2">
              <T>What they asked for</T>
            </h3>
            {request.description.trim() ? (
              <p className="text-body leading-relaxed wrap-break-word whitespace-pre-line text-ink">{request.description.trim()}</p>
            ) : (
              <p className="text-body text-ink-muted">
                <T>They didn&apos;t add a description.</T>
              </p>
            )}
          </section>
          <section className="flex flex-col gap-2 rounded-md border border-line bg-strip px-4 py-3">
            <h3 className="text-small font-semibold text-ink-2">
              <T>Asked by</T>
            </h3>
            {requester ? (
              <>
                <span className="flex min-w-0 flex-col">
                  <b className="truncate text-body font-semibold text-ink">{requester.name}</b>
                  <span className="truncate text-small text-ink-muted">{requester.email}</span>
                </span>
                {requester.isCustomer && (
                  <Link href={userRecordHref(requester.id)} className="self-start text-small font-semibold text-emerald hover:underline">
                    <T>Open their page</T>
                  </Link>
                )}
              </>
            ) : (
              <p className="text-small text-ink-muted">
                <T>This person&apos;s record is gone.</T>
              </p>
            )}
          </section>
        </div>
      )}
    </FormDrawer>
  );
};

export default FeatureRequestDrawer;

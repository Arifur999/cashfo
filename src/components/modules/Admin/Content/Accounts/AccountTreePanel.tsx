"use client";

import { useQuery } from "@tanstack/react-query";
import { CirclePlus, MoreHorizontal, Pencil, PowerOff, RotateCcw } from "lucide-react";
import { reactivateAccountTemplateAction } from "@/app/(dashboardLayout)/admin/content/_action";
import Card from "@/components/smartly/Card";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useActionMutation } from "@/hooks/useActionMutation";
import { useRowDialogs } from "@/hooks/useRowDialogs";
import { queryKeys } from "@/lib/queryKeys";
import { cn } from "@/lib/utils";
import { accountTemplatesQuery } from "@/queries/accountTemplate.queries";
import type { IAccountTemplate } from "@/types/accountTemplate.types";
import AccountTemplateDialogs, { type AccountTemplateDialog } from "./AccountTemplateDialogs";
import { accountKindLabel } from "./accountTemplateOptions";
import CreateAccountTemplateDialog from "./CreateAccountTemplateDialog";

const LEDGER_SUBTYPES = ["receivable", "payable"];

// The design's "Starting wallets and accounts": the default chart as a
// tree, each row with a menu to edit it, add under it or retire it.
const AccountTreePanel = ({ canManage }: { canManage: boolean }) => {
  const templates = useQuery(accountTemplatesQuery()).data?.data ?? [];
  const { activeDialog, activeRow, openDialog, closeDialog } = useRowDialogs<IAccountTemplate, AccountTemplateDialog>();

  const { run: reactivate } = useActionMutation({
    action: reactivateAccountTemplateAction,
    successMessage: "Account back in the starting set",
    invalidateKeys: [queryKeys.accountTemplates.all],
    refreshRoute: false,
  });

  const rows = templates.flatMap((template) => [
    { template, depth: 0 },
    ...(template.children ?? []).map((child) => ({ template: child, depth: 1 })),
  ]);

  return (
    <Card padding="none" className="flex flex-col gap-3 px-5 py-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-title text-ink">Starting wallets and accounts</h2>
          <span className="text-small text-ink-muted">The account tree a new workspace begins with</span>
        </div>
        {canManage && (
          <CreateAccountTemplateDialog
            trigger={
              <Button variant="outline" size="sm" className="h-8.5 rounded-md border-line-strong bg-surface text-small font-semibold text-ink hover:bg-cream">
                Add
              </Button>
            }
          />
        )}
      </div>
      <ul className="flex flex-col gap-0.5">
        {rows.map(({ template, depth }) => (
          <li
            key={template.id}
            className={cn("group/row flex min-h-8 items-center gap-2 rounded-sm pr-1 text-body", depth === 0 ? "font-semibold text-ink" : "font-medium text-ink", !template.isActive && "text-ink-muted line-through")}
            style={{ paddingLeft: depth * 22 }}
          >
            <span className={cn("size-1.5 rounded-full", depth === 0 ? "bg-emerald" : "bg-ink-faint")} aria-hidden="true" />
            <span className="truncate">{template.name}</span>
            <span className="ml-auto text-caption font-normal text-ink-muted">{accountKindLabel(template)}</span>
            {canManage && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-xs" className="text-ink-muted opacity-0 group-hover/row:opacity-100 hover:text-ink data-[state=open]:opacity-100" aria-label={`More for ${template.name}`}>
                    <MoreHorizontal aria-hidden="true" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => openDialog("edit", template)}>
                    <Pencil aria-hidden="true" /> Edit
                  </DropdownMenuItem>
                  {depth === 0 && template.isActive && (
                    <DropdownMenuItem onClick={() => openDialog("addChild", template)}>
                      <CirclePlus aria-hidden="true" /> Add sub-account
                    </DropdownMenuItem>
                  )}
                  {!template.isActive && (
                    <DropdownMenuItem onClick={() => void reactivate(template.id)}>
                      <RotateCcw aria-hidden="true" /> Put back
                    </DropdownMenuItem>
                  )}
                  {/* New workspaces need their receivable and payable accounts (every loan and credit sale posts to them); the API only lets these be renamed. */}
                  {template.isActive && !LEDGER_SUBTYPES.includes(template.accountSubtype ?? "") && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem variant="destructive" onClick={() => openDialog("deactivate", template)}>
                        <PowerOff aria-hidden="true" /> Stop giving it to new workspaces
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </li>
        ))}
        {rows.length === 0 && <li className="text-small text-ink-muted">No starting accounts yet.</li>}
      </ul>
      <AccountTemplateDialogs template={activeRow} activeDialog={activeDialog} onClose={closeDialog} />
    </Card>
  );
};

export default AccountTreePanel;

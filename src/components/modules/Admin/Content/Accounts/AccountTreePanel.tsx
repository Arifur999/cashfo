"use client";

import { useQuery } from "@tanstack/react-query";
import { Circle, CirclePlus, Folder, FolderOpen, MoreHorizontal, Pencil, Plus, PowerOff, RotateCcw } from "lucide-react";
import { useState } from "react";
import { reactivateAccountTemplateAction } from "@/app/(dashboardLayout)/admin/content/_action";
import Card from "@/components/smartly/Card";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useActionMutation } from "@/hooks/useActionMutation";
import { useRowDialogs } from "@/hooks/useRowDialogs";
import { queryKeys } from "@/lib/queryKeys";
import { cn } from "@/lib/utils";
import { accountTemplatesQuery } from "@/queries/accountTemplate.queries";
import type { AccountType, IAccountTemplate } from "@/types/accountTemplate.types";
import AccountTemplateDialogs, { type AccountTemplateDialog } from "./AccountTemplateDialogs";
import { accountKindLabel } from "./accountTemplateOptions";
import CreateAccountTemplateDialog from "./CreateAccountTemplateDialog";
import T from "@/components/shared/T";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { localName } from "@/lib/i18n/message";

const LEDGER_SUBTYPES = ["receivable", "payable"];

// The tree's folders, by account type, in the order the design lists them.
const GROUPS: { type: AccountType; label: string }[] = [
  { type: "ASSET", label: "Assets" },
  { type: "LIABILITY", label: "Liabilities" },
  { type: "EQUITY", label: "Equity" },
  { type: "INCOME", label: "Income" },
  { type: "EXPENSE", label: "Expenses" },
];
// Wallets and debts start open; the long income and expense lists folded.
const OPEN_AT_FIRST: AccountType[] = ["ASSET", "LIABILITY"];

// A row of the tree: 32px tall, 22px further in for each level.
const ROW = "flex min-h-8 items-center gap-2 rounded-sm text-body text-ink";

// The design's "Starting wallets and accounts": the default chart as a
// tree in folders by type, each account with a menu to edit it, add under
// it or retire it.
const AccountTreePanel = ({ canManage }: { canManage: boolean }) => {
  const [open, setOpen] = useState<AccountType[]>(OPEN_AT_FIRST);
  const templates = useQuery(accountTemplatesQuery()).data?.data ?? [];
  const { locale, translate } = useLocale();
  const { activeDialog, activeRow, openDialog, closeDialog } = useRowDialogs<IAccountTemplate, AccountTemplateDialog>();

  const { run: reactivate } = useActionMutation({
    action: reactivateAccountTemplateAction,
    successMessage: "Account back in the starting set",
    invalidateKeys: [queryKeys.accountTemplates.all],
    refreshRoute: false,
  });

  const toggle = (type: AccountType) => setOpen((current) => (current.includes(type) ? current.filter((item) => item !== type) : [...current, type]));
  const groups = GROUPS.map((group) => ({ ...group, templates: templates.filter((template) => template.accountType === group.type) })).filter(
    (group) => group.templates.length > 0,
  );

  // An account: a folder when it holds sub-accounts, a dot otherwise, its
  // kind on the right and its menu on hover. (A function returning a row,
  // not a component, so the rows keep their state between renders.)
  const renderAccount = (template: IAccountTemplate, depth: 1 | 2) => {
    const Icon = template.children?.length ? Folder : Circle;
    return (
      <li key={template.id} className={cn(ROW, "group/row pr-1 font-medium", !template.isActive && "text-ink-muted line-through")} style={{ paddingLeft: depth * 22 }}>
        <Icon className="size-3.5 shrink-0 text-ink-muted" aria-hidden="true" />
        <span className="truncate">{localName(locale, template)}</span>
        <span className="ml-auto text-caption font-normal text-ink-muted">{translate(accountKindLabel(template))}</span>
        {canManage && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-xs"
                className="text-ink-muted opacity-0 group-hover/row:opacity-100 hover:text-ink data-[state=open]:opacity-100"
                aria-label={translate("More for {name}", { name: localName(locale, template) })}
              >
                <MoreHorizontal aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => openDialog("edit", template)}>
                <Pencil aria-hidden="true" /> <T>Edit</T>
              </DropdownMenuItem>
              {depth === 1 && template.isActive && (
                <DropdownMenuItem onClick={() => openDialog("addChild", template)}>
                  <CirclePlus aria-hidden="true" /> <T>Add sub-account</T>
                </DropdownMenuItem>
              )}
              {!template.isActive && (
                <DropdownMenuItem onClick={() => void reactivate(template.id)}>
                  <RotateCcw aria-hidden="true" /> <T>Put back</T>
                </DropdownMenuItem>
              )}
              {/* New workspaces need their receivable and payable accounts (every loan and credit sale posts to them); the API only lets these be renamed. */}
              {template.isActive && !LEDGER_SUBTYPES.includes(template.accountSubtype ?? "") && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onClick={() => openDialog("deactivate", template)}>
                    <PowerOff aria-hidden="true" /> <T>Stop giving it to new workspaces</T>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </li>
    );
  };

  return (
    <Card padding="none" className="flex flex-col gap-3 px-5 py-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-title text-ink"><T>Starting wallets and accounts</T></h2>
          <span className="text-small text-ink-muted"><T>The account tree a new workspace begins with</T></span>
        </div>
        {canManage && (
          <CreateAccountTemplateDialog
            trigger={
              <Button variant="outline" size="sm" className="h-8.5 rounded-md border-line-strong bg-surface text-small font-semibold text-ink hover:bg-cream">
                <Plus aria-hidden="true" />
                <T>Add</T>
              </Button>
            }
          />
        )}
      </div>
      <ul className="flex flex-col gap-0.5">
        {groups.map((group) => {
          const isOpen = open.includes(group.type);
          const Icon = isOpen ? FolderOpen : Folder;
          return (
            <li key={group.type}>
              <button type="button" aria-expanded={isOpen} onClick={() => toggle(group.type)} className={cn(ROW, "w-full font-semibold hover:bg-cream")}>
                <Icon className="size-3.5 text-emerald" aria-hidden="true" />
                <T>{group.label}</T>
              </button>
              {isOpen && (
                <ul className="flex flex-col gap-0.5">
                  {group.templates.flatMap((template) => [renderAccount(template, 1), ...(template.children ?? []).map((child) => renderAccount(child, 2))])}
                </ul>
              )}
            </li>
          );
        })}
        {groups.length === 0 && <li className="text-small text-ink-muted"><T>No starting accounts yet.</T></li>}
      </ul>
      <AccountTemplateDialogs template={activeRow} activeDialog={activeDialog} onClose={closeDialog} />
    </Card>
  );
};

export default AccountTreePanel;

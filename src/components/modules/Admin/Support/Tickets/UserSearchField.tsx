"use client";

import type { AnyFieldApi } from "@tanstack/react-form";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ChevronsUpDown } from "lucide-react";
import { useId, useState } from "react";
import UserInfoCell from "@/components/shared/cell/UserInfoCell";
import FormFieldShell from "@/components/shared/form/FormFieldShell";
import Loader from "@/components/shared/Loader";
import InputFrame from "@/components/smartly/form/InputFrame";
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useDebouncedCallback } from "@/hooks/useDebouncedCallback";
import { formatCount } from "@/lib/i18n/digits";
import { platformUserSearchQuery, USER_SEARCH_MIN_LENGTH } from "@/queries/ticket.queries";
import type { IUserSearchResult } from "@/types/ticket.types";
import T from "@/components/shared/T";
import { useLocale } from "@/lib/i18n/LocaleProvider";

const SearchHint = ({ children }: { children: React.ReactNode }) => (
  <div className="flex justify-center py-6 text-center text-small text-ink-muted">{children}</div>
);

interface UserSearchFieldProps {
  // Holds the picked user's id.
  field: AnyFieldApi;
  label: string;
  description?: React.ReactNode;
}

// A searchable user picker: the API does the matching (cmdk's own filter is
// off), the form field stores the id, and the trigger keeps showing who was
// picked. The trigger sits in the same frame as the form's other fields
// (44px, the strong line, the emerald ring while focused).
const UserSearchField = ({ field, label, description }: UserSearchFieldProps) => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [term, setTerm] = useState("");
  const [selected, setSelected] = useState<IUserSearchResult | null>(null);
  // The list the combobox opens, named by the trigger while it is open.
  const listId = useId();
  const { locale, translate } = useLocale();
  const applyTerm = useDebouncedCallback((value: string) => setTerm(value.trim()), 300);

  const { data, isFetching, isError } = useQuery({ ...platformUserSearchQuery(term), placeholderData: keepPreviousData });
  const canSearch = term.length >= USER_SEARCH_MIN_LENGTH;
  const users = canSearch ? (data?.data ?? []) : [];

  const pick = (user: IUserSearchResult) => {
    setSelected(user);
    field.handleChange(user.id);
    setOpen(false);
  };

  const renderStatus = () => {
    if (!canSearch) return <SearchHint>{translate("Type at least {count} characters of a name or email.", { count: formatCount(USER_SEARCH_MIN_LENGTH, locale) })}</SearchHint>;
    if (isError) return <SearchHint><T>Couldn&apos;t search users. Try again.</T></SearchHint>;
    if (users.length > 0) return null;
    if (isFetching) {
      return (
        <SearchHint>
          <Loader size={16} label="Searching..." />
        </SearchHint>
      );
    }
    return <SearchHint>{translate("No users match “{term}”.", { term })}</SearchHint>;
  };

  return (
    <FormFieldShell field={field} label={label} description={description}>
      {(control, hasError) => (
        <Popover
          // Modal, so the list scrolls inside the dialog that hosts it.
          modal
          open={open}
          onOpenChange={(nextOpen) => {
            setOpen(nextOpen);
            if (!nextOpen) field.handleBlur();
          }}
        >
          <InputFrame size="md" invalid={hasError} className="px-0">
            <PopoverTrigger asChild>
              <button
                {...control}
                type="button"
                role="combobox"
                aria-expanded={open}
                aria-controls={open ? listId : undefined}
                // The frame draws the focus ring, as it does for a text field.
                className="flex h-full w-full min-w-0 items-center justify-between gap-2 rounded-md px-4 text-left outline-none"
              >
                {selected ? (
                  <span className="flex min-w-0 flex-col items-start leading-tight">
                    <span className="max-w-full truncate font-medium text-ink">{selected.name}</span>
                    <span className="max-w-full truncate text-caption text-ink-muted">{selected.email}</span>
                  </span>
                ) : (
                  <span className="truncate text-ink-faint"><T>Search by name or email...</T></span>
                )}
                <ChevronsUpDown className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
              </button>
            </PopoverTrigger>
          </InputFrame>
          <PopoverContent id={listId} align="start" className="w-(--radix-popover-trigger-width) p-0">
            <Command shouldFilter={false}>
              <CommandInput
                value={input}
                onValueChange={(value) => {
                  setInput(value);
                  applyTerm.run(value);
                }}
                placeholder={translate("Name or email...")}
              />
              <CommandList>
                {renderStatus()}
                {users.length > 0 && (
                  <CommandGroup>
                    {users.map((user) => (
                      <CommandItem key={user.id} value={user.id} data-checked={selected?.id === user.id} onSelect={() => pick(user)}>
                        <UserInfoCell name={user.name} email={user.email} />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}
    </FormFieldShell>
  );
};

export default UserSearchField;

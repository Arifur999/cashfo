"use client";

import type { AnyFieldApi } from "@tanstack/react-form";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ChevronsUpDown } from "lucide-react";
import { useState } from "react";
import UserInfoCell from "@/components/shared/cell/UserInfoCell";
import FormFieldShell from "@/components/shared/form/FormFieldShell";
import Loader from "@/components/shared/Loader";
import { Button } from "@/components/ui/button";
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useDebouncedCallback } from "@/hooks/useDebouncedCallback";
import { cn } from "@/lib/utils";
import { platformUserSearchQuery, USER_SEARCH_MIN_LENGTH } from "@/queries/ticket.queries";
import type { IUserSearchResult } from "@/types/ticket.types";
import T from "@/components/shared/T";
import { useLocale } from "@/lib/i18n/LocaleProvider";

const SearchHint = ({ children }: { children: React.ReactNode }) => (
  <div className="flex justify-center py-6 text-center text-sm text-muted-foreground">{children}</div>
);

interface UserSearchFieldProps {
  // Holds the picked user's id.
  field: AnyFieldApi;
  label: string;
  description?: React.ReactNode;
}

// A searchable user picker: the API does the matching (cmdk's own filter is
// off), the form field stores the id, and the trigger keeps showing who was
// picked.
const UserSearchField = ({ field, label, description }: UserSearchFieldProps) => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [term, setTerm] = useState("");
  const [selected, setSelected] = useState<IUserSearchResult | null>(null);
  const { translate } = useLocale();
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
    if (!canSearch) return <SearchHint>{translate("Type at least {count} characters of a name or email.", { count: USER_SEARCH_MIN_LENGTH })}</SearchHint>;
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
          <PopoverTrigger asChild>
            <Button
              {...control}
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className={cn("h-auto min-h-9 w-full justify-between py-1.5 font-normal", hasError && "border-destructive")}
            >
              {selected ? (
                <span className="flex min-w-0 flex-col items-start text-left">
                  <span className="truncate font-medium">{selected.name}</span>
                  <span className="truncate text-xs text-muted-foreground">{selected.email}</span>
                </span>
              ) : (
                <span className="text-muted-foreground"><T>Search by name or email...</T></span>
              )}
              <ChevronsUpDown className="opacity-50" aria-hidden="true" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-(--radix-popover-trigger-width) p-0">
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

"use client";

import { Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { UserSearchResult } from "@/lib/api";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { searchUsersAction } from "@/app/admin/(dashboard)/support/_actions";
import { t } from "@/lib/i18n/t";

interface UserSearchSelectProps {
  value: UserSearchResult | null;
  onChange: (user: UserSearchResult | null) => void;
}

export function UserSearchSelect({ value, onChange }: UserSearchSelectProps) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 300);
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (debouncedQuery.trim().length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    searchUsersAction(debouncedQuery.trim()).then((result) => {
      if (cancelled) return;
      setIsLoading(false);
      if (result.success && result.data) setResults(result.data);
    });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  if (value) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm">
        <div>
          <p className="font-medium text-neutral-900">{value.name}</p>
          <p className="text-xs text-neutral-500">{value.email}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            onChange(null);
            setQuery("");
          }}
          className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
          aria-label={t("Clear selected user")}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={t("Search by name or email...")}
          className="w-full rounded-xl border border-neutral-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
        />
      </div>
      {isOpen && query.trim().length >= 2 && (
        <div className="absolute z-10 mt-1 w-full rounded-xl border border-neutral-200 bg-white py-1 shadow-lg">
          {isLoading && <p className="px-3.5 py-2 text-sm text-neutral-400">{t("Searching...")}</p>}
          {!isLoading && results.length === 0 && (
            <p className="px-3.5 py-2 text-sm text-neutral-400">{t("No users found.")}</p>
          )}
          {!isLoading &&
            results.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => {
                  onChange(user);
                  setIsOpen(false);
                }}
                className="block w-full px-3.5 py-2 text-left text-sm hover:bg-neutral-50"
              >
                <p className="font-medium text-neutral-900">{user.name}</p>
                <p className="text-xs text-neutral-500">{user.email}</p>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

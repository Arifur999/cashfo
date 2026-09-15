"use client";

import { useState } from "react";
import { ProfileTab } from "./ProfileTab";
import { SecurityTab } from "./SecurityTab";

type TabKey = "Profile" | "Security";

// Matches the reference layout's tab bar (Profile/App/Security/Help/
// Resources) -- App/Help/Resources are shown disabled ("Coming soon")
// rather than omitted, so the page's eventual shape is visible without
// pretending unbuilt tabs are functional.
const UPCOMING_TABS = ["App", "Help", "Resources"];

export function SettingsPageClient() {
  const [tab, setTab] = useState<TabKey>("Profile");

  return (
    <div className="h-full bg-brand-content px-6 py-8">
      <h1 className="text-xl font-semibold text-neutral-900">Settings</h1>
      <p className="mt-1 text-sm text-neutral-500">Manage your account settings and preferences</p>

      <div className="mt-6 flex flex-wrap gap-1 rounded-xl bg-neutral-100 p-1">
        {(["Profile", "Security"] as TabKey[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              tab === key ? "bg-brand-primary text-white shadow-sm" : "text-neutral-500 hover:text-neutral-700"
            }`}
          >
            {key}
          </button>
        ))}
        {UPCOMING_TABS.map((t) => (
          <button
            key={t}
            type="button"
            disabled
            title="Coming soon"
            className="cursor-not-allowed rounded-lg px-4 py-2 text-sm font-medium text-neutral-400"
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-6">{tab === "Profile" ? <ProfileTab /> : <SecurityTab />}</div>
    </div>
  );
}

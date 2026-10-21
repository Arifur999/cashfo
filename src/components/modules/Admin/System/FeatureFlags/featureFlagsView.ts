import type { ReadonlyURLSearchParams } from "next/navigation";
import type { IFeatureFlag } from "@/types/featureFlag.types";

// Feature flags' All / On / Off, kept in the address bar as ?show=on, so a
// refresh or a shared link opens the same list.
export type FlagSwitchView = "all" | "on" | "off";

type Params = URLSearchParams | ReadonlyURLSearchParams;

export const readFlagSwitchView = (params: Params): FlagSwitchView => {
  const show = params.get("show");
  return show === "on" || show === "off" ? show : "all";
};

// The URL for a view: the page's other params kept, All left out.
export const withFlagSwitchView = (current: Params, view: FlagSwitchView): URLSearchParams => {
  const params = new URLSearchParams(current.toString());
  if (view === "all") params.delete("show");
  else params.set("show", view);
  return params;
};

export const showsFeatureFlag = (flag: Pick<IFeatureFlag, "isEnabled">, view: FlagSwitchView) => view === "all" || flag.isEnabled === (view === "on");

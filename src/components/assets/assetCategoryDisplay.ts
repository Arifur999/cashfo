import { Boxes, Building2, Car, Gem, Laptop, Mountain, TrendingUp, type LucideIcon } from "lucide-react";
import type { AssetCategory } from "@/lib/api";

export const ASSET_CATEGORY_LABELS: Record<AssetCategory, string> = {
  VEHICLE: "Vehicle",
  LAND: "Land",
  PROPERTY: "Property",
  JEWELLERY: "Jewellery",
  ELECTRONICS: "Electronics",
  INVESTMENT: "Investment",
  OTHER: "Other",
};

export const ASSET_CATEGORY_ICONS: Record<AssetCategory, LucideIcon> = {
  VEHICLE: Car,
  LAND: Mountain,
  PROPERTY: Building2,
  JEWELLERY: Gem,
  ELECTRONICS: Laptop,
  INVESTMENT: TrendingUp,
  OTHER: Boxes,
};

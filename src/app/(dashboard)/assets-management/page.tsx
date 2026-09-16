import { redirect } from "next/navigation";

// Redirect stub -- this used to be the whole feature's one page before it
// split into a Dashboard/Current list/Purchase & Sell/Update sub-menu
// (mirroring Balance/Savings Goals' own NavGroup shape). Kept in place
// rather than removed so an old bookmark/back-button doesn't 404.
export default function AssetsManagementPage() {
  redirect("/assets-management/dashboard");
}

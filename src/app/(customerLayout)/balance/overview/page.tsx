import { redirect } from "next/navigation";

// Balance's Overview and Wallet pages are one page now, Accounts. Old links,
// bookmarks and "Add wallet" (?new=1) land there.
export default async function OldBalancePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  redirect(params.new === "1" ? "/balance/accounts?new=1" : "/balance/accounts");
}

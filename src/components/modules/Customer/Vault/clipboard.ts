// Copying from the vault. Safari allows a clipboard write only while the
// tap that asked for it is still being handled; a write that waits for the
// server first (a password is fetched on demand) is refused there. So both
// helpers start the write at once, inside the tap.

export type CopyOutcome = "copied" | "failed" | "skipped";

// Text that is already on the page: a username, a holder's name.
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

class NothingToCopy extends Error {}

// A password still on its way from the server. Where ClipboardItem exists
// the write starts now with a promise of the text, which Safari accepts;
// elsewhere, and if that write is refused, it waits for the text and writes
// it the plain way. "skipped" means the text never came (the reveal failed,
// and said so itself).
export async function copySecret(secret: Promise<string | null>): Promise<CopyOutcome> {
  if (typeof ClipboardItem !== "undefined" && typeof navigator.clipboard?.write === "function") {
    try {
      const blob = secret.then((text) => {
        if (text === null) throw new NothingToCopy();
        return new Blob([text], { type: "text/plain" });
      });
      // Handled here too, in case the browser never takes the promise.
      blob.catch(() => undefined);
      await navigator.clipboard.write([new ClipboardItem({ "text/plain": blob })]);
      return "copied";
    } catch {
      // Falls through to the plain write below, unless there was nothing.
    }
  }
  const text = await secret;
  if (text === null) return "skipped";
  return (await copyText(text)) ? "copied" : "failed";
}

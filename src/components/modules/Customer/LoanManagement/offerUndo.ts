import { toast } from "sonner";

// How long a save's toast offers Undo; the backend takes a delete or an
// edit back for 10 minutes.
const UNDO_MS = 6000;

interface OfferUndo {
  // Already translated ("Entry saved for Hasan").
  message: string;
  // Runs once the popup is long gone, so it needs nothing from it.
  run: () => Promise<{ success: boolean }>;
  // Already translated: said when the undo worked, and its fallback error.
  done: string;
  failed: string;
  undoLabel: string;
  refresh: () => void;
}

// The loan boards' toast after every save, edit and delete: what happened,
// with Undo that puts it back as it was.
export function offerUndo({ message, run, done, failed, undoLabel, refresh }: OfferUndo) {
  toast.success(message, {
    duration: UNDO_MS,
    action: {
      label: undoLabel,
      onClick: () =>
        void run()
          .then((result) => {
            if (result.success) {
              toast.success(done);
              refresh();
            } else {
              toast.error(failed);
            }
          })
          .catch(() => toast.error(failed)),
    },
  });
}

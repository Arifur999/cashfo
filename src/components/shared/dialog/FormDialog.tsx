"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const SIZE_CLASSES = {
  sm: "sm:max-w-md",
  md: "sm:max-w-lg",
  lg: "sm:max-w-2xl",
} as const;

interface FormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: React.ReactNode;
  // Optional trigger for self-contained "Create X" dialogs.
  trigger?: React.ReactNode;
  size?: keyof typeof SIZE_CLASSES;
  children: React.ReactNode;
}

// The shell every create/edit dialog shares: header, scrollable body, and a
// guard so a half-filled form doesn't vanish on a stray outside click
// (Escape still closes it, for keyboard users).
const FormDialog = ({ open, onOpenChange, title, description, trigger, size = "md", children }: FormDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent
        className={cn("max-h-[90vh] gap-0 overflow-hidden p-0", SIZE_CLASSES[size])}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader className="border-b px-6 py-5 pr-14">
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <ScrollArea className="max-h-[calc(90vh-5.5rem)]">
          <div className="px-6 py-5">{children}</div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default FormDialog;

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/text";
import { cn } from "@/lib/utils";
import T from "../T";

interface UserInfoCellProps {
  name: string | null | undefined;
  email?: string | null;
  photo?: string | null;
  // Extra line under the email (e.g. a phone number).
  meta?: string | null;
  // A deleted or suspended person reads muted.
  muted?: boolean;
  // Some lists (Manage owners) draw just the two lines.
  avatar?: boolean;
}

// A person in a list: 34px initials, the name and the email under it.
const UserInfoCell = ({ name, email, photo, meta, muted = false, avatar = true }: UserInfoCellProps) => {
  const displayName = name?.trim();

  return (
    <div className="flex items-center gap-3">
      {avatar && (
        <Avatar className="size-8.5">
          {photo && <AvatarImage src={photo} alt="" />}
          <AvatarFallback className="bg-mint-50 text-caption font-bold text-emerald">{(displayName && getInitials(displayName)) || "?"}</AvatarFallback>
        </Avatar>
      )}
      <div className="flex min-w-0 flex-col gap-px">
        <p className={cn("truncate font-semibold", muted ? "text-ink-muted" : "text-ink")}>{displayName || <T>Unknown user</T>}</p>
        {email && <p className="truncate text-small text-ink-muted">{email}</p>}
        {meta && <p className="truncate text-caption text-ink-muted">{meta}</p>}
      </div>
    </div>
  );
};

export default UserInfoCell;

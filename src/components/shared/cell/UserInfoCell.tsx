import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/text";

interface UserInfoCellProps {
  name: string | null | undefined;
  email?: string | null;
  photo?: string | null;
  // Extra line under the email (e.g. a phone number).
  meta?: string | null;
}

const UserInfoCell = ({ name, email, photo, meta }: UserInfoCellProps) => {
  const displayName = name?.trim() || "Unknown user";

  return (
    <div className="flex items-center gap-3">
      <Avatar className="size-8">
        {photo && <AvatarImage src={photo} alt="" />}
        <AvatarFallback className="text-xs">{getInitials(displayName) || "?"}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="truncate font-medium text-foreground">{displayName}</p>
        {email && <p className="truncate text-xs text-muted-foreground">{email}</p>}
        {meta && <p className="truncate text-xs text-muted-foreground/80">{meta}</p>}
      </div>
    </div>
  );
};

export default UserInfoCell;

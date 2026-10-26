import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { initials, fullName } from '@/lib/format';
import { cn } from '@/lib/utils';

export function UserAvatar({ user, className, tone = 'accent' }) {
  return (
    <Avatar className={cn('size-9', className)}>
      {user?.photoUrl && <AvatarImage src={user.photoUrl} alt={fullName(user)} className="object-cover" />}
      <AvatarFallback className={cn('text-xs font-semibold', tone === 'accent' ? 'bg-primary-soft text-primary-soft-foreground' : 'bg-muted text-foreground-2')}>
        {initials(user)}
      </AvatarFallback>
    </Avatar>
  );
}

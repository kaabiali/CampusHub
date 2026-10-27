import { useNavigate } from 'react-router';
import { ChevronsUpDown, LogOut, Settings, UserRound } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UserAvatar } from '@/components/UserAvatar';
import { fullName } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/AuthProvider';

export const roleLabel = (user) => (user.role === 'ADMIN' ? 'Administrateur' : [user.filiere, user.niveau].filter(Boolean).join(' · ') || 'Étudiant');

// The single account control: it shows the identity in full, so it is the natural thing to click to act on it.
export function AccountCard({ collapsed, onNavigate }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const go = (to) => {
    navigate(to);
    onNavigate?.();
  };

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        aria-label={collapsed ? `${fullName(user)}, menu du compte` : 'Menu du compte'}
        className={cn(
          'flex w-full items-center gap-2.5 rounded-lg p-2 text-left transition-colors duration-150 outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-accent',
          collapsed && 'justify-center',
        )}
      >
        <UserAvatar user={user} className="size-8" />
        <span className={cn('min-w-0 flex-1 transition-[opacity,max-width] duration-200 ease-out', collapsed ? 'max-w-0 overflow-hidden opacity-0' : 'max-w-full opacity-100')}>
          <span className="block truncate text-[13px] leading-tight font-medium">{fullName(user)}</span>
          <span className="block truncate text-[11px] leading-tight text-sidebar-muted">{roleLabel(user)}</span>
        </span>
        {!collapsed && <ChevronsUpDown className="size-3.5 shrink-0 text-sidebar-muted" />}
      </DropdownMenuTrigger>
      <DropdownMenuContent side={collapsed ? 'right' : 'top'} align="start" sideOffset={8} className="w-56">
        <DropdownMenuLabel className="truncate text-xs font-normal text-muted-foreground">{user.email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => go('/profil')}>
          <UserRound /> Mon profil
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => go('/parametres')}>
          <Settings /> Paramètres
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => logout()}>
          <LogOut /> Se déconnecter
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

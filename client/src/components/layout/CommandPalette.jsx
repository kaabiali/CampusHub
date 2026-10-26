import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { LogOut, Monitor, Moon, Sun } from 'lucide-react';
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from '@/components/ui/command';
import { ACCOUNT_NAV, ADMIN_NAV, NAV } from '@/lib/nav';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

export function CommandPalette({ open, onOpenChange }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { setTheme } = useTheme();

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onOpenChange((o) => !o);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onOpenChange]);

  const run = (fn) => () => {
    onOpenChange(false);
    fn();
  };

  const pages = [...NAV, ...(user?.role === 'ADMIN' ? ADMIN_NAV : []), ...ACCOUNT_NAV];

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} title="Recherche rapide" description="Aller à une page ou lancer une action">
      <CommandInput placeholder="Aller à une page, lancer une action…" />
      <CommandList>
        <CommandEmpty>Aucun résultat.</CommandEmpty>
        <CommandGroup heading="Pages">
          {pages.map((p) => (
            <CommandItem key={p.to} value={`${p.label} ${p.keywords || ''}`} onSelect={run(() => navigate(p.to))}>
              <p.icon />
              {p.label}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Préférences">
          <CommandItem value="theme clair light" onSelect={run(() => setTheme('light'))}>
            <Sun /> Thème clair
          </CommandItem>
          <CommandItem value="theme sombre dark" onSelect={run(() => setTheme('dark'))}>
            <Moon /> Thème sombre
          </CommandItem>
          <CommandItem value="theme systeme system" onSelect={run(() => setTheme('system'))}>
            <Monitor /> Thème du système
          </CommandItem>
          <CommandItem value="deconnexion logout" onSelect={run(() => logout())}>
            <LogOut /> Se déconnecter
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

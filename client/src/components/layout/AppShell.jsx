import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';
import { Menu, Search } from 'lucide-react';
import { Brand } from '@/components/Brand';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { ADMIN_NAV, NAV } from '@/lib/nav';
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/AuthProvider';
import { CommandPalette } from './CommandPalette';
import { NotificationBell } from './NotificationBell';
import { SocketProvider } from '@/providers/SocketProvider';
import { useUnreadMessages } from '@/hooks/useConversations';
import { UserMenu } from './UserMenu';

function NavItem({ item, badge, onNavigate }) {
  return (
    <NavLink
      to={item.to}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium text-foreground-2 transition-colors duration-150 hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring',
          isActive && 'bg-primary-soft font-semibold text-primary-soft-foreground hover:bg-primary-soft hover:text-primary-soft-foreground',
        )
      }
    >
      <item.icon className="size-[18px]" strokeWidth={1.75} />
      <span className="flex-1">{item.label}</span>
      {badge > 0 && (
        <span className="rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground tabular" aria-label={`${badge} non lus`}>
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </NavLink>
  );
}

function SidebarContent({ onNavigate }) {
  const { user } = useAuth();
  const unread = useUnreadMessages();
  const badges = { '/messages': unread };
  const adminItems = user?.role === 'ADMIN' ? ADMIN_NAV : [];
  return (
    <div className="flex h-full flex-col gap-6 px-3 py-5">
      <Brand to="/accueil" className="px-2" />
      <nav aria-label="Navigation principale" className="flex flex-1 flex-col gap-0.5">
        {NAV.map((item) => (
          <NavItem key={item.to} item={item} badge={badges[item.to]} onNavigate={onNavigate} />
        ))}
        {adminItems.length > 0 && (
          <>
            <p className="mt-5 mb-1 px-2.5 text-xs font-medium text-muted-foreground">Administration</p>
            {adminItems.map((item) => (
              <NavItem key={item.to} item={item} onNavigate={onNavigate} />
            ))}
          </>
        )}
      </nav>
      <div className="border-t pt-3">
        <UserMenu />
      </div>
    </div>
  );
}

export function AppShell() {
  return (
    <SocketProvider>
      <Shell />
    </SocketProvider>
  );
}

function Shell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const { pathname } = useLocation();

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <a href="#contenu" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2 focus:shadow-md">
        Aller au contenu
      </a>
      <aside className="sticky top-0 hidden h-dvh border-r bg-card lg:block">
        <SidebarContent />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[280px] p-0">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <SheetDescription className="sr-only">Navigation principale</SheetDescription>
          <SidebarContent onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/85 px-4 backdrop-blur-md sm:px-6 lg:px-10">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Ouvrir le menu">
            <Menu />
          </Button>
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="flex h-9 w-full max-w-sm items-center gap-2 rounded-md border border-input bg-card px-3 text-sm text-muted-foreground shadow-xs transition-colors hover:border-ring/50 focus-visible:outline-2 focus-visible:outline-ring"
          >
            <Search className="size-4" />
            <span className="flex-1 truncate text-left">Rechercher, aller à…</span>
            <kbd className="hidden rounded border bg-muted px-1.5 font-mono text-[11px] sm:inline">Ctrl K</kbd>
          </button>
          <div className="ml-auto">
            <NotificationBell />
          </div>
        </header>
        <main id="contenu" key={pathname.split('/')[1]} className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-4 pt-6 pb-16 animate-fade-up sm:px-6 lg:px-10 lg:pt-8">
          <Outlet />
        </main>
      </div>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}

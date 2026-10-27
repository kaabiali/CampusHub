import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router';
import { Menu, PanelLeft, Search } from 'lucide-react';
import { BrandMark } from '@/components/Brand';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { SidebarProvider, useSidebar } from '@/providers/SidebarProvider';
import { SocketProvider } from '@/providers/SocketProvider';
import { CommandPalette } from './CommandPalette';
import { NotificationBell } from './NotificationBell';
import { Sidebar } from './Sidebar';
import { ThemeToggle } from './ThemeToggle';

export function AppShell() {
  return (
    <SocketProvider>
      <SidebarProvider>
        <Shell />
      </SidebarProvider>
    </SocketProvider>
  );
}

function Shell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const { pathname } = useLocation();
  const { collapsed, toggle } = useSidebar();
  const panelLabel = collapsed ? 'Déplier la barre latérale' : 'Réduire la barre latérale';

  return (
    <div className="flex min-h-dvh bg-background">
      <a href="#contenu" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2 focus:shadow-md">
        Aller au contenu
      </a>
      <Sidebar />

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[280px] gap-0 border-sidebar-border bg-sidebar p-0">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <SheetDescription className="sr-only">Navigation principale</SheetDescription>
          <Sidebar inSheet onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* The 2px tinted rule says which side of the app you are on: blue for students, red for administration. */}
        <header
          className={cn(
            'sticky top-0 z-30 flex h-14 items-center gap-2 border-b-2 bg-background/60 px-3 backdrop-blur-xl sm:px-4',
            pathname.startsWith('/admin') ? 'border-b-destructive/35' : 'border-b-primary/25',
          )}
        >
          <Button variant="ghost" size="icon" className="size-9 lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Ouvrir le menu">
            <Menu />
          </Button>
          <Link to="/accueil" aria-label="CampusHub, accueil" className="rounded-md lg:hidden">
            <BrandMark className="size-7" />
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="hidden size-9 text-muted-foreground hover:text-foreground lg:inline-flex"
            onClick={toggle}
            aria-label={panelLabel}
            title={panelLabel}
            aria-expanded={!collapsed}
            aria-controls="barre-laterale"
          >
            <PanelLeft className="size-4" />
          </Button>
          {/* A filled pill that reads as a field you can type into, not a button that happens to say "search". */}
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="ml-1 hidden h-10 w-full max-w-sm items-center gap-2.5 rounded-full border border-border/70 bg-muted/40 px-4 text-sm text-muted-foreground transition-colors duration-150 outline-none hover:border-primary hover:bg-muted/70 focus-visible:border-primary md:flex"
          >
            <Search className="size-4" />
            <span className="flex-1 truncate text-left">Rechercher, aller à…</span>
            <kbd className="pointer-events-none inline-flex h-6 items-center rounded-md border border-border/60 bg-background/60 px-2 font-mono text-[11px] font-medium">Ctrl K</kbd>
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="size-9 text-muted-foreground md:hidden" onClick={() => setPaletteOpen(true)} aria-label="Rechercher">
              <Search className="size-[18px]" />
            </Button>
            <ThemeToggle />
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

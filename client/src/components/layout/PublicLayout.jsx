import { useState } from 'react';
import { Link, Outlet } from 'react-router';
import { Menu } from 'lucide-react';
import { Brand } from '@/components/Brand';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { useAuth } from '@/providers/AuthProvider';

const links = [
  { href: '/#modules', label: 'Fonctionnalités' },
  { href: '/#donnees', label: 'Données' },
];

function AccountActions({ onNavigate, stacked }) {
  const { user } = useAuth();
  if (user) {
    return (
      <Button asChild onClick={onNavigate}>
        <Link to="/accueil">Ouvrir CampusHub</Link>
      </Button>
    );
  }
  return (
    <div className={stacked ? 'flex flex-col gap-2' : 'flex items-center gap-2'}>
      <Button asChild variant="ghost" onClick={onNavigate}>
        <Link to="/connexion">Connexion</Link>
      </Button>
      <Button asChild onClick={onNavigate}>
        <Link to="/inscription">Créer un compte</Link>
      </Button>
    </div>
  );
}

export function PublicLayout() {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#contenu" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2 focus:shadow-md">
        Aller au contenu
      </a>
      <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur-md">
        <nav className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-4 px-4 sm:px-6" aria-label="Navigation du site">
          <Brand />
          <div className="hidden items-center gap-6 md:flex">
            {links.map((l) => (
              <a key={l.href} href={l.href} className="text-[15px] font-medium text-foreground-2 transition-colors hover:text-foreground">
                {l.label}
              </a>
            ))}
            <AccountActions />
          </div>
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen(true)} aria-label="Ouvrir le menu">
            <Menu />
          </Button>
        </nav>
      </header>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-[280px] gap-6 p-6">
          <SheetTitle>Menu</SheetTitle>
          <SheetDescription className="sr-only">Navigation du site</SheetDescription>
          <nav className="flex flex-col gap-1">
            {links.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="rounded-md px-2 py-2 font-medium hover:bg-accent">
                {l.label}
              </a>
            ))}
          </nav>
          <AccountActions stacked onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
      <main id="contenu" className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t bg-card">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-2">
            <Brand />
            <p className="max-w-sm text-sm text-muted-foreground">Projet semestriel, 1ère année Ingénierie Data Science. Stack MERN et micro-service Python.</p>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm" aria-label="Liens du pied de page">
            <Link to="/confidentialite" className="text-foreground-2 hover:text-foreground">Confidentialité</Link>
            <Link to="/connexion" className="text-foreground-2 hover:text-foreground">Connexion</Link>
            <Link to="/inscription" className="text-foreground-2 hover:text-foreground">Créer un compte</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

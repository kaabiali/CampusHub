import { useEffect, useState } from 'react';
import { Link, Outlet } from 'react-router';
import { ArrowRight, Menu } from 'lucide-react';
import { Brand } from '@/components/Brand';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { useAuth } from '@/providers/AuthProvider';

const links = [
  { href: '/#fonctionnalites', label: 'Fonctionnalités' },
  { href: '/#donnees', label: 'Prix conseillé' },
  { href: '/#clubs', label: 'Événements' },
];

const footerColumns = [
  {
    title: 'Services',
    links: [
      { href: '/#livres', label: 'Livres d’occasion' },
      { href: '/#covoiturage', label: 'Covoiturage' },
      { href: '/#groupes', label: 'Groupes d’étude' },
      { href: '/#clubs', label: 'Événements' },
    ],
  },
  {
    title: 'Compte',
    links: [
      { to: '/connexion', label: 'Connexion' },
      { to: '/inscription', label: 'Créer un compte' },
      { to: '/mot-de-passe-oublie', label: 'Mot de passe oublié' },
    ],
  },
];

function FooterLink({ href, to, label }) {
  const className = 'transition-colors duration-150 hover:text-mint';
  return to ? (
    <Link to={to} className={className}>
      {label}
    </Link>
  ) : (
    <a href={href} className={className}>
      {label}
    </a>
  );
}

function AccountActions({ onNavigate, stacked }) {
  const { user } = useAuth();
  if (user) {
    return (
      <Button asChild variant="brand" size="lg" onClick={onNavigate}>
        <Link to="/accueil">Ouvrir CampusHub</Link>
      </Button>
    );
  }
  return (
    <div className={stacked ? 'flex flex-col gap-2' : 'flex items-center gap-6'}>
      <Link to="/connexion" onClick={onNavigate} className={stacked ? 'rounded-md px-2 py-2 font-medium hover:bg-accent' : 'nav-link'}>
        Connexion
      </Link>
      <Button asChild variant="brand" size="lg" onClick={onNavigate}>
        <Link to="/inscription">Créer un compte</Link>
      </Button>
    </div>
  );
}

export function PublicLayout() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#contenu" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2 focus:shadow-md">
        Aller au contenu
      </a>
      <div className="bg-ink">
        <div className="mx-auto flex h-10 max-w-[1200px] justify-between sm:px-6">
          <Link to="/inscription" className="group inline-flex items-center gap-2 bg-mint px-4 text-[13px] font-semibold text-ink transition-[filter] hover:brightness-105 sm:px-5 sm:text-sm">
            Étudiant ?<span className="max-sm:hidden"> Créez votre compte</span><span className="sm:hidden"> Inscription</span> <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>
          <a href="/#clubs" className="inline-flex items-center bg-brand px-4 text-[13px] font-medium text-white transition-colors hover:bg-brand-hover sm:px-5 sm:text-sm">
            <span className="max-sm:hidden">Vous gérez un club ?</span>
            <span className="sm:hidden">Un club ?</span>
          </a>
        </div>
      </div>
      <header className={`sticky top-0 z-30 bg-card transition-shadow duration-200 ${scrolled ? 'shadow-md' : ''}`}>
        <nav
          className={`mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-4 transition-[height] duration-200 ease-out-quint sm:px-6 ${scrolled ? 'h-16' : 'h-16 lg:h-[88px]'}`}
          aria-label="Navigation du site"
        >
          <Brand />
          <div className="hidden items-center gap-7 lg:flex">
            {links.map((l) => (
              <a key={l.href} href={l.href} className="nav-link">
                {l.label}
              </a>
            ))}
            <AccountActions />
          </div>
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)} aria-label="Ouvrir le menu">
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
      <footer className="bg-ink text-[#cfcfcf]">
        <div className="mx-auto grid max-w-[1200px] grid-cols-2 gap-8 px-4 pt-14 pb-8 text-sm sm:px-6 md:grid-cols-[2fr_1fr_1fr]">
          <div className="col-span-2 flex flex-col gap-4 md:col-span-1">
            <Brand inverted />
            <p className="max-w-sm leading-relaxed">Projet semestriel, 1ère année Ingénierie Data Science. Stack MERN et micro-service Python.</p>
          </div>
          {footerColumns.map((col) => (
            <nav key={col.title} className="flex flex-col gap-3" aria-label={col.title}>
              <h2 className="text-sm font-semibold text-white">{col.title}</h2>
              <ul className="flex flex-col gap-2">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <FooterLink {...l} />
                  </li>
                ))}
              </ul>
            </nav>
          ))}
          <div className="col-span-2 flex flex-wrap justify-between gap-2 border-t border-[#3e403e] pt-5 text-[13px] md:col-span-3">
            <span>© {new Date().getFullYear()} CampusHub</span>
            <span className="flex flex-wrap gap-x-5 gap-y-1">
              <Link to="/confidentialite" className="hover:text-mint">
                Confidentialité
              </Link>
              <span>Photos : Unsplash</span>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

import { Outlet } from 'react-router';
import { BookOpen, CalendarDays, CarFront, ShieldCheck } from 'lucide-react';
import { Brand } from '@/components/Brand';

const points = [
  { icon: BookOpen, text: 'Livres d’occasion avec un prix conseillé' },
  { icon: CarFront, text: 'Covoiturage vers le campus' },
  { icon: CalendarDays, text: 'Groupes de révision et événements des clubs' },
];

export function AuthLayout() {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      {/* Fixed charcoal in both themes so the mint accents keep their contrast. */}
      <aside className="relative hidden overflow-hidden bg-ink p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <svg className="pointer-events-none absolute -right-48 -bottom-40 size-[620px] opacity-30" viewBox="0 0 800 800" fill="none" aria-hidden="true">
          <path d="M400 60 740 230v340L400 740 60 570V230Z" stroke="var(--mint)" strokeWidth="3" />
          <path d="M400 150 650 275v250L400 650 150 525V275Z" stroke="var(--mint)" strokeWidth="2" />
        </svg>
        <Brand inverted className="relative" />
        <div className="relative flex max-w-md flex-col gap-8">
          <span className="text-xs font-bold tracking-[0.04em] text-mint uppercase">Un seul compte universitaire</span>
          <h1 className="-mt-4 text-4xl leading-[1.15] font-normal tracking-[-0.015em]">
            Tous les services du <strong className="font-bold">campus</strong>, au même endroit.
          </h1>
          <ul className="flex flex-col gap-3">
            {points.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-[15px] text-white/85">
                <span className="flex size-8 items-center justify-center rounded-md bg-white/10 text-mint">
                  <Icon className="size-4" strokeWidth={1.75} />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative flex items-center gap-2 text-sm text-white/70">
          <ShieldCheck className="size-4 text-mint" />
          Inscription réservée aux adresses universitaires @campus.tn
        </p>
      </aside>
      <main className="flex flex-col px-5 py-8 sm:px-10">
        <Brand className="lg:hidden" />
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-[400px] animate-fade-up">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}

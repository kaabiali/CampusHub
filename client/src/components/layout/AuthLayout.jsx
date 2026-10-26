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
      {/* Fixed brand blue in both themes: white text on #2547D0 stays above 7:1 contrast. */}
      <aside className="relative hidden overflow-hidden bg-[#2547d0] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '22px 22px', maskImage: 'linear-gradient(160deg, black 30%, transparent 85%)' }}
          aria-hidden="true"
        />
        <Brand inverted className="relative" />
        <div className="relative flex max-w-md flex-col gap-8">
          <h1 className="text-4xl leading-[1.1] font-semibold tracking-[-0.03em]">Un compte, tous les services du campus.</h1>
          <ul className="flex flex-col gap-3">
            {points.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-[15px] text-white/85">
                <span className="flex size-8 items-center justify-center rounded-md bg-white/12">
                  <Icon className="size-4" strokeWidth={1.75} />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative flex items-center gap-2 text-sm text-white/70">
          <ShieldCheck className="size-4" />
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

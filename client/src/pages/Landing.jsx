import { Link } from 'react-router';
import { ArrowRight, BookOpen, CalendarDays, CarFront, MessageCircle, Sparkles, Star, UsersRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/providers/AuthProvider';
import { PriceEstimator } from '@/components/landing/PriceEstimator';

const COVERS = [
  { t: 'ANALYSE 1', c: '#1e2a4a' },
  { t: 'PYTHON DATA', c: '#2547d0' },
  { t: 'PROBA & STATS', c: '#3f5e4b' },
  { t: 'ALGÈBRE', c: '#7a3b2e' },
];

function HeroPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[460px] pt-4 pb-10 lg:mx-0" aria-hidden="true">
      <div className="relative z-10 flex items-center gap-4 rounded-lg border bg-card p-4 shadow-lg">
        <div className="flex h-[88px] w-16 shrink-0 items-end rounded-sm bg-[#1e2a4a] p-2 text-[10px] leading-tight font-bold text-white shadow-sm">ANALYSE 1</div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="truncate font-semibold">Analyse 1, cours et exercices</p>
          <p className="text-sm text-muted-foreground">Mathématiques · état Bon</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <span className="font-mono text-base tabular">18 DT</span>
            <span className="inline-flex items-center gap-1 rounded-md bg-success-soft px-2 py-0.5 text-xs font-semibold text-success">
              <Sparkles className="size-3" /> Conseillé 17 à 20 DT
            </span>
          </div>
        </div>
      </div>
      <div className="relative z-20 -mt-3 ml-8 flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-lg sm:ml-14">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-center gap-1 py-1" aria-hidden="true">
              <span className="size-2 rounded-full border-2 border-primary" />
              <span className="h-5 w-0.5 bg-input" />
              <span className="size-2 rounded-full bg-primary" />
            </div>
            <div className="flex flex-col gap-2.5 text-sm">
              <span>
                <span className="mr-2 font-mono tabular text-muted-foreground">07:45</span>
                <strong className="font-semibold">Ariana</strong>
              </span>
              <span>
                <span className="mr-2 font-mono tabular text-muted-foreground">08:20</span>
                <strong className="font-semibold">Campus</strong>
              </span>
            </div>
          </div>
          <span className="font-mono text-base tabular">3 DT</span>
        </div>
        <div className="flex items-center justify-between border-t pt-3 text-sm">
          <span className="flex items-center gap-2 text-muted-foreground">
            <span className="flex size-6 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-foreground-2">SM</span>
            Skander M. · <Star className="size-3.5 fill-current text-warning" /> 4,9
          </span>
          <span className="rounded-md bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground">2 places</span>
        </div>
      </div>
      <div className="relative z-30 -mt-3 mr-6 flex items-center gap-3 rounded-lg border bg-card p-3.5 shadow-lg sm:-ml-4">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary-soft-foreground">
          <UsersRound className="size-[18px]" strokeWidth={1.75} />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-medium text-primary">Recommandé pour vous</p>
          <p className="truncate text-sm font-semibold">Groupe Probabilités, révision du partiel</p>
        </div>
      </div>
    </div>
  );
}

function Tile({ className = '', children, to }) {
  return (
    <Link
      to={to}
      className={`group relative flex flex-col overflow-hidden rounded-xl border p-6 transition-[transform,box-shadow,border-color] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:p-7 ${className}`}
    >
      {children}
    </Link>
  );
}

function TileText({ icon: Icon, title, text, inverted }) {
  return (
    <div className="flex flex-col gap-2">
      <Icon className={`size-6 ${inverted ? 'text-white' : 'text-primary'}`} strokeWidth={1.75} />
      <h3 className="mt-2 text-xl font-semibold">{title}</h3>
      <p className={`max-w-[46ch] text-[15px] leading-relaxed ${inverted ? 'text-white/80' : 'text-foreground-2'}`}>{text}</p>
    </div>
  );
}

export default function Landing() {
  const { user } = useAuth();
  const moduleLink = user ? '/accueil' : '/inscription';

  return (
    <>
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 text-foreground/[0.07]"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
            backgroundSize: '24px 24px',
            maskImage: 'radial-gradient(ellipse 70% 60% at 70% 40%, black, transparent)',
          }}
          aria-hidden="true"
        />
        <div className="relative mx-auto grid max-w-[1200px] items-center gap-12 px-4 pt-14 pb-16 sm:px-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:pt-24 lg:pb-24">
          <div className="flex flex-col items-start gap-6">
            <span className="inline-flex items-center gap-2 rounded-md border bg-card px-2.5 py-1 text-[13px] font-medium text-foreground-2 shadow-xs">
              <span className="size-1.5 rounded-full bg-success" /> Réservé aux étudiants @campus.tn
            </span>
            <h1 className="text-[40px] leading-[1.04] font-semibold tracking-[-0.035em] sm:text-5xl lg:text-[58px]">Toute la vie du campus, au même endroit.</h1>
            <p className="max-w-[52ch] text-lg leading-relaxed text-foreground-2">
              Livres d’occasion, covoiturage, groupes de révision et événements des clubs. Fini les annonces perdues dans dix groupes WhatsApp.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="h-11 px-5 text-[15px]">
                <Link to={user ? '/accueil' : '/inscription'}>{user ? 'Ouvrir CampusHub' : 'Créer un compte'}</Link>
              </Button>
              <a href="#modules" className="group inline-flex h-11 items-center gap-1.5 px-2 text-[15px] font-semibold text-foreground-2 hover:text-foreground">
                Voir les services <ArrowRight className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" />
              </a>
            </div>
          </div>
          <HeroPreview />
        </div>
      </section>

      <section id="modules" className="mx-auto flex max-w-[1200px] scroll-mt-20 flex-col gap-10 px-4 pt-8 pb-24 sm:px-6">
        <div className="flex max-w-2xl flex-col gap-3">
          <h2 className="text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">Cinq services, un seul compte universitaire.</h2>
          <p className="text-foreground-2">Chaque service partage le même profil : vos matières servent à vous recommander ce qui compte pour vous.</p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
          <Tile to={moduleLink} className="bg-card md:col-span-4 md:min-h-[300px]">
            <div className="flex h-full flex-col justify-between gap-8 sm:flex-row sm:items-end">
              <TileText icon={BookOpen} title="Marketplace de livres" text="Publiez vos manuels avec photos, filtrez par matière et contactez le vendeur. Un prix conseillé vous aide à fixer le bon tarif." />
              <div className="flex shrink-0 items-end self-center sm:self-end" aria-hidden="true">
                {COVERS.map((b, i) => (
                  <div
                    key={b.t}
                    className="-ml-6 flex h-32 w-[88px] items-end rounded-sm p-2.5 text-[11px] leading-tight font-bold text-white shadow-md transition-transform duration-200 ease-out first:ml-0 group-hover:-translate-y-1"
                    style={{ background: b.c, transform: `rotate(${(i - 1.5) * 4}deg)`, transitionDelay: `${i * 30}ms` }}
                  >
                    {b.t}
                  </div>
                ))}
              </div>
            </div>
          </Tile>
          <Tile to={moduleLink} className="border-transparent bg-[#2547d0] text-white md:col-span-2">
            <div className="flex h-full flex-col justify-between gap-8">
              <TileText icon={CarFront} title="Covoiturage" text="Proposez un trajet, réservez une place, notez le conducteur." inverted />
              <div className="flex items-center gap-2 font-mono text-sm text-white/90" aria-hidden="true">
                <span>La Marsa</span>
                <span className="h-px flex-1 bg-white/40" />
                <span>Campus</span>
              </div>
            </div>
          </Tile>
          <Tile to={moduleLink} className="bg-card md:col-span-2">
            <div className="flex h-full flex-col justify-between gap-8">
              <TileText icon={UsersRound} title="Groupes d’étude" text="Rejoignez un groupe par matière, planifiez des séances, partagez vos PDF." />
              <div className="flex items-center" aria-hidden="true">
                {['MC', 'YB', 'OG', 'RJ'].map((i) => (
                  <span key={i} className="-ml-2 flex size-9 items-center justify-center rounded-full border-2 border-card bg-muted text-xs font-semibold text-foreground-2 first:ml-0">
                    {i}
                  </span>
                ))}
                <span className="ml-3 text-sm text-muted-foreground">6 membres</span>
              </div>
            </div>
          </Tile>
          <Tile to={moduleLink} className="border-transparent bg-primary-soft md:col-span-2">
            <div className="flex h-full flex-col justify-between gap-8">
              <TileText icon={CalendarDays} title="Événements" text="Les clubs publient, vous vous inscrivez, un rappel arrive la veille." />
              <div className="flex items-center gap-3" aria-hidden="true">
                <div className="flex w-12 flex-col items-center rounded-md bg-card py-1.5 shadow-xs">
                  <span className="text-[11px] font-semibold text-primary uppercase">Nov</span>
                  <span className="text-xl leading-none font-bold">05</span>
                </div>
                <span className="text-sm font-medium text-foreground-2">Hackathon Data For Good</span>
              </div>
            </div>
          </Tile>
          <Tile to={moduleLink} className="bg-card md:col-span-2">
            <div className="flex h-full flex-col justify-between gap-8">
              <TileText icon={MessageCircle} title="Messagerie" text="Discutez avec un vendeur ou un conducteur, en direct." />
              <div className="flex flex-col gap-1.5 text-[13px]" aria-hidden="true">
                <span className="self-start rounded-lg rounded-bl-sm border bg-background px-3 py-1.5">Toujours disponible ?</span>
                <span className="self-end rounded-lg rounded-br-sm bg-primary px-3 py-1.5 text-primary-foreground">Oui, demain 12:30 ?</span>
              </div>
            </div>
          </Tile>
        </div>
      </section>

      <section id="donnees" className="scroll-mt-16 border-y bg-card">
        <div className="mx-auto grid max-w-[1200px] items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:py-24">
          <PriceEstimator />
          <div className="flex flex-col gap-5 lg:order-first">
            <h2 className="text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">Les données au service des étudiants.</h2>
            <p className="max-w-[52ch] leading-relaxed text-foreground-2">
              Un modèle de régression estime le prix d’un livre d’occasion à partir de la matière, de l’état, de l’année et du prix neuf. Un filtrage par contenu propose les groupes et
              événements proches de vos matières.
            </p>
            <div className="flex flex-wrap gap-2">
              {['Random Forest', 'TF-IDF + similarité cosinus', 'Agrégations MongoDB'].map((t) => (
                <span key={t} className="rounded-md bg-primary-soft px-2.5 py-1 text-[13px] font-semibold text-primary-soft-foreground">
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-4 py-20 sm:px-6">
        <div className="relative flex flex-col items-start justify-between gap-6 overflow-hidden rounded-xl bg-[#2547d0] p-8 text-white sm:p-12 md:flex-row md:items-center">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.12]"
            style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '22px 22px', maskImage: 'linear-gradient(90deg, transparent, black)' }}
            aria-hidden="true"
          />
          <h2 className="relative max-w-[24ch] text-3xl font-semibold tracking-[-0.03em]">Rejoignez CampusHub avec votre e-mail universitaire.</h2>
          <Button asChild size="lg" className="relative h-11 bg-white px-5 text-[15px] text-[#1a36a6] hover:bg-white/90">
            <Link to={user ? '/accueil' : '/inscription'}>{user ? 'Ouvrir CampusHub' : 'Créer un compte'}</Link>
          </Button>
        </div>
      </section>
    </>
  );
}

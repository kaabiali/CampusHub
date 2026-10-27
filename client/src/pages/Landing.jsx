import { useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/providers/AuthProvider';
import { PriceEstimator } from '@/components/landing/PriceEstimator';
import { PublicEvents } from '@/components/landing/PublicEvents';
import './landing.css';

function useReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const root = ref.current;
    if (!root || !('IntersectionObserver' in window)) return;
    root.classList.add('lp-js');
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' },
    );
    root.querySelectorAll('[data-rise], .lp-collage').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return ref;
}

function Eyebrow({ children, onDark, ...props }) {
  return (
    <span className={`block text-xs font-bold tracking-[0.04em] uppercase ${onDark ? 'text-mint' : 'text-primary'}`} {...props}>
      {children}
    </span>
  );
}

function PhoneMockup() {
  const events = [
    { t: 'Nuit de la robotique', m: ['Aujourd’hui · 19:00 à 23:00', 'Amphi A · Club Robotique'], tags: [['live', '● En direct'], ['ok', 'Inscrit']], thumb: { label: '42 inscrits' } },
    { t: 'Atelier CV et LinkedIn', m: ['Lun. 27 oct. · 12:30', 'Salle polyvalente · Club Carrières'], tags: [['', 'Gratuit']], thumb: { img: '/img/study-desk.jpg' } },
    { t: 'Échange de livres', m: ['Ven. 31 oct. · 15:00', 'Foyer · Bureau des étudiants'], tags: [['', 'Plusieurs jours']], thumb: { img: '/img/book-open.jpg' } },
  ];
  return (
    <div className="lp-phone-wrap justify-self-center py-10" aria-hidden="true">
      <div className="lp-phone">
        <div className="flex h-full flex-col overflow-hidden rounded-[31px] bg-[#f2f4f8] text-[11px] text-[#1f2120]">
          <div className="bg-brand px-4 pt-3 pb-2.5 text-white">
            <div className="flex justify-between text-[10px] font-semibold opacity-90">
              <span>9:41</span>
              <span>5G</span>
            </div>
            <p className="mt-3 text-base font-semibold">Événements</p>
            <div className="mt-2.5 flex gap-3.5 text-[10px]">
              <span className="border-b-2 border-white pb-1.5 font-semibold">Tous</span>
              <span className="pb-1.5">Mes événements</span>
              <span className="pb-1.5">Enregistrés</span>
            </div>
          </div>
          <div className="flex gap-1.5 px-3 pt-2.5 pb-1 text-[9.5px]">
            {['Filtres', 'À venir', 'En direct', 'Clubs'].map((f) => (
              <span key={f} className={`rounded-full border px-2 py-0.5 ${f === 'En direct' ? 'border-brand bg-brand text-white' : 'border-[#e4e6e8] bg-white'}`}>
                {f}
              </span>
            ))}
          </div>
          {events.map((e) => (
            <div key={e.t} className="mx-3 mt-2 grid grid-cols-[1fr_54px] gap-2 rounded-[10px] bg-white p-2.5 shadow-[0_1px_3px_rgb(17_24_39/0.08)]">
              <div>
                <b className="mb-0.5 block text-[11.5px]">{e.t}</b>
                <div className="text-[9.5px] leading-normal text-[#5f6461]">
                  {e.m[0]}
                  <br />
                  {e.m[1]}
                </div>
                <div className="mt-1.5 flex gap-1">
                  {e.tags.map(([kind, label]) => (
                    <span key={label} className={`lp-tag ${kind} !text-[9px]`}>
                      {label}
                    </span>
                  ))}
                </div>
              </div>
              {e.thumb.img ? (
                <div className="lp-photo size-[54px]" style={{ backgroundImage: `url('${e.thumb.img}')` }} />
              ) : (
                <div className="grid size-[54px] place-items-end justify-center rounded-lg bg-[#2b3a67] pb-1 text-[8.5px] font-bold text-white">{e.thumb.label}</div>
              )}
            </div>
          ))}
          <div className="mt-auto grid grid-cols-5 border-t border-[#e4e6e8] bg-white px-1 pt-2 pb-3.5 text-center text-[8.5px] text-[#5f6461]">
            {['Accueil', 'Livres', 'Trajets', 'Événements', 'Groupes'].map((t) => (
              <span key={t} className={t === 'Événements' ? 'font-bold text-brand' : ''}>
                <i className="mx-auto mb-0.5 block size-4 rounded-[5px] border-[1.6px] border-current" />
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Feature({ id, dark, flip, eyebrow, title, text, cta, to, children }) {
  return (
    <section id={id} className={`scroll-mt-20 overflow-hidden py-18 sm:py-24 ${dark ? 'bg-ink text-white' : 'bg-card dark:bg-background'}`} aria-labelledby={`${id}-h`}>
      <div className="mx-auto grid max-w-[1200px] items-center gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16">
        <div className={flip ? 'lg:order-2' : undefined}>
          <Eyebrow onDark={dark} data-rise="">
            {eyebrow}
          </Eyebrow>
          <h2 id={`${id}-h`} data-rise="" style={{ '--d': 1 }} className="mt-3.5 max-w-[15em] text-2xl leading-[1.3] font-semibold sm:text-[28px]">
            {title}
          </h2>
          <p data-rise="" style={{ '--d': 2 }} className={`mt-4 max-w-[34em] text-[15px] leading-[1.7] ${dark ? 'text-[#e6e6e6]' : 'text-foreground-2'}`}>
            {text}
          </p>
          <div data-rise="" style={{ '--d': 3 }} className="mt-7">
            <Button asChild variant="brand" size="xl">
              <Link to={to}>
                {cta} <ArrowRight />
              </Link>
            </Button>
          </div>
        </div>
        <div className="lp-collage" aria-hidden="true">
          {children}
        </div>
      </div>
    </section>
  );
}

const card = (d, pos) => ({ '--d': d, ...pos });

export default function Landing() {
  const { user } = useAuth();
  const ref = useReveal();
  const signup = user ? '/accueil' : '/inscription';
  const module = (path) => (user ? path : '/inscription');

  return (
    <div ref={ref}>
      <section className="lp-hero relative overflow-hidden bg-[#111] text-white" aria-labelledby="hero-h">
        <div className="lp-hero-bg" aria-hidden="true" />
        <svg className="absolute top-1/2 -right-20 z-[1] size-[820px] -translate-y-1/2 opacity-35" viewBox="0 0 800 800" fill="none" aria-hidden="true">
          <path d="M400 60 740 230v340L400 740 60 570V230Z" stroke="var(--mint)" strokeWidth="3" />
          <path d="M400 150 650 275v250L400 650 150 525V275Z" stroke="var(--mint)" strokeWidth="2" />
        </svg>
        <div className="relative z-[2] mx-auto grid max-w-[1200px] items-center gap-10 px-4 pt-16 sm:px-6 lg:min-h-[590px] lg:grid-cols-[1.15fr_1fr] lg:pt-0">
          <div>
            <h1 id="hero-h" className="text-[36px] leading-[1.17] font-normal tracking-[-0.015em] sm:text-[44px] lg:text-[52px]">
              CampusHub : toute votre vie{' '}
              <strong className="relative font-bold whitespace-nowrap">
                étudiante
                <svg className="lp-squiggle" viewBox="0 0 300 22" preserveAspectRatio="none" aria-hidden="true">
                  <path d="M3 12 C 60 4, 120 4, 180 9 S 270 16, 297 7" />
                  <path d="M14 18 C 80 12, 160 13, 290 15" />
                </svg>
              </strong>{' '}
              au même endroit
            </h1>
            <p className="mt-8 max-w-[34em] text-[17px] leading-[1.45] text-[#f2f2f2] sm:text-xl">
              Livres d’occasion, covoiturage vers le campus, groupes de révision et événements des clubs. Fini les annonces perdues dans dix groupes WhatsApp.
            </p>
            <div className="mt-8 flex flex-wrap gap-4 sm:mt-12 sm:gap-5">
              <Button asChild variant="white" size="xl" className="max-sm:w-full max-sm:justify-between">
                <a href="#fonctionnalites">
                  Découvrir CampusHub <ArrowRight />
                </a>
              </Button>
              <Button asChild variant="brand" size="xl" className="max-sm:w-full max-sm:justify-between">
                <Link to={signup}>
                  {user ? 'Ouvrir CampusHub' : 'Créer un compte'} <ArrowRight />
                </Link>
              </Button>
            </div>
          </div>
          <PhoneMockup />
        </div>
      </section>

      <section id="fonctionnalites" className="mx-auto max-w-[1200px] scroll-mt-20 px-4 pt-18 pb-14 text-center sm:px-6 sm:pt-28 sm:pb-22">
        <Eyebrow data-rise="">Tout en un</Eyebrow>
        <h2 data-rise="" style={{ '--d': 1 }} className="mx-auto mt-3.5 max-w-[22em] text-[28px] leading-[1.25] font-semibold sm:text-4xl">
          Tout ce qu’il vous faut pour vivre votre campus à fond
        </h2>
        <p data-rise="" style={{ '--d': 2 }} className="mt-3.5 text-muted-foreground">
          Cinq services, un seul compte universitaire.
        </p>
        <p data-rise="" style={{ '--d': 3 }} className="mx-auto mt-7 max-w-[50em] leading-relaxed text-foreground-2">
          Les étudiants vérifiés du campus échangent leurs livres, partagent leurs trajets, révisent ensemble et suivent les événements des clubs. Chaque service partage le même
          profil : vos matières servent à vous recommander ce qui compte pour vous.
        </p>
      </section>

      <Feature
        id="livres"
        dark
        eyebrow="Livres d’occasion"
        title="Achetez et vendez vos livres au juste prix"
        text="Publiez vos manuels avec photos, filtrez par matière et contactez le vendeur. Un modèle de régression vous propose un prix conseillé selon la matière, l’état, l’année et le prix neuf."
        cta="Explorer les livres"
        to={module('/livres')}
      >
        <div className="lp-card" style={card(0, { left: 0, top: 30, width: 300 })}>
          <div className="lp-photo h-[130px]" style={{ backgroundImage: "url('/img/book-open.jpg')" }} />
          <h3 className="mt-3">Analyse 1, cours et exercices</h3>
          <div className="lp-m">Mathématiques · état bon</div>
          <div className="mt-2.5 flex items-center justify-between">
            <span className="lp-price">18 DT</span>
            <span className="lp-tag ok">Conseillé 17 à 20 DT</span>
          </div>
        </div>
        <div className="lp-card" style={card(1, { right: 0, top: 0, width: 250 })}>
          <h3>
            Prix conseillé <span className="lp-m font-medium">Probabilités</span>
          </h3>
          {[
            ['Neuf', '26 DT'],
            ['Très bon', '21 DT'],
            ['Bon', '19 DT'],
            ['Acceptable', '13 DT'],
          ].map(([k, v]) => (
            <div key={k} className={`lp-row ${k === 'Bon' ? '-mx-3.5 bg-[#e8effd] px-3.5' : ''}`}>
              <span>{k}</span>
              <b className={`ml-auto ${k === 'Bon' ? 'text-[#0049db]' : ''}`}>{v}</b>
            </div>
          ))}
        </div>
        <div className="lp-card" style={card(2, { right: 30, top: 285, width: 280 })}>
          <div className="lp-row !border-0 !p-0">
            <span className="lp-avatar">YB</span>
            <div>
              <b>Yasmine B.</b>
              <div className="lp-m">Vendeuse · note 4,9</div>
            </div>
          </div>
          <div className="lp-chat">
            <span className="lp-bubble">Toujours disponible ? Je peux passer au foyer à midi.</span>
          </div>
          <div className="lp-chat">
            <span className="lp-bubble me">Oui, à 12h15 devant la biblio.</span>
          </div>
        </div>
      </Feature>

      <Feature
        id="covoiturage"
        flip
        eyebrow="Covoiturage"
        title="Allez en cours à plusieurs, pour quelques dinars"
        text="Proposez un trajet ou réservez une place vers le campus. La réservation est confirmée en temps réel, vous discutez avec le conducteur et vous le notez après le trajet."
        cta="Explorer le covoiturage"
        to={module('/covoiturage')}
      >
        <div className="lp-card" style={card(0, { left: 0, top: 20, width: 330 })}>
          <h3>
            Trajets vers le campus <span className="lp-m font-medium">Demain</span>
          </h3>
          {[
            ['07:45', 'Ariana → Campus', 'Karim M. · 2 places', '3 DT'],
            ['08:10', 'Bardo → Campus', 'Salma T. · 1 place', '2 DT'],
            ['08:30', 'La Marsa → Campus', 'Omar H. · 3 places', '4 DT'],
          ].map(([h, r, w, p]) => (
            <div key={h} className="lp-row">
              <b className="w-11 tabular">{h}</b>
              <div className="flex-1">
                {r}
                <div className="lp-m">{w}</div>
              </div>
              <b>{p}</b>
            </div>
          ))}
        </div>
        <div className="lp-card lp-ticket" data-label="RÉSERVATION" style={card(1, { right: 0, top: 110, width: 270 })}>
          <h3 className="mt-1">Ariana → Campus</h3>
          <div className="lp-m">Demain · départ 07:45 · arrivée 08:20</div>
          <div className="lp-row mt-2">
            <span className="lp-avatar" style={{ '--c': '#1c6b43' }}>
              KM
            </span>
            <div className="flex-1">
              <b>Karim M.</b>
              <div className="lp-m">Clio grise · note 4,8</div>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="lp-tag ok">Place confirmée</span>
            <b>3 DT</b>
          </div>
        </div>
        <div className="lp-card" style={card(2, { left: 40, top: 290, width: 240 })}>
          <div className="lp-m">Économisé ce mois</div>
          <div className="lp-price text-2xl">27 DT</div>
          <div className="lp-progress">
            <i style={{ '--w': '68%' }} />
          </div>
          <div className="lp-m mt-1.5">9 trajets partagés</div>
        </div>
      </Feature>

      <Feature
        id="groupes"
        dark
        eyebrow="Groupes d’étude"
        title="Révisez mieux, ensemble"
        text="Rejoignez un groupe par matière, planifiez des séances et partagez vos PDF avec les membres. Les groupes proches de vos matières vous sont recommandés."
        cta="Explorer les groupes"
        to={module('/groupes')}
      >
        <div className="lp-card" style={card(0, { left: 0, top: 10, width: 290 })}>
          <h3>
            Révision Analyse 1 <span className="lp-tag">Maths</span>
          </h3>
          <div className="lp-m">Mercredi 14:00 · Bibliothèque, salle B2</div>
          <div className="mt-3 flex items-center justify-between">
            <div className="lp-avatars">
              {[
                ['YB', '#0049db'],
                ['AK', '#7a4fd1'],
                ['SM', '#1c6b43'],
                ['RL', '#b4531b'],
              ].map(([i, c]) => (
                <span key={i} className="lp-avatar" style={{ '--c': c }}>
                  {i}
                </span>
              ))}
            </div>
            <span className="lp-m">8 sur 10</span>
          </div>
          <div className="lp-progress mt-2.5">
            <i style={{ '--w': '80%' }} />
          </div>
          <span className="mt-3 flex h-9 items-center justify-center rounded-[4px] bg-[#0049db] text-[13px] font-semibold text-white">Rejoindre le groupe</span>
        </div>
        <div className="lp-card" style={card(1, { right: 0, top: 60, width: 240 })}>
          <h3>Fichiers partagés</h3>
          <div className="lp-row">
            <span className="lp-tag">PDF</span>
            <span>Chapitre 4, intégrales</span>
          </div>
          <div className="lp-row">
            <span className="lp-tag">PDF</span>
            <span>Annales 2025 corrigées</span>
          </div>
          <div className="lp-row">
            <span className="lp-tag">PDF</span>
            <span>Fiche formules</span>
          </div>
        </div>
        <div className="lp-card" style={card(2, { left: 70, top: 280, width: 300 })}>
          <h3>Prochaine séance</h3>
          <div className="lp-m">Chapitres 3 et 4, avant le partiel du 7 novembre</div>
          <div className="lp-progress mt-2.5">
            <i style={{ '--w': '60%' }} />
          </div>
          <div className="lp-m mt-1.5">6 membres confirmés</div>
        </div>
      </Feature>

      <Feature
        id="clubs"
        flip
        eyebrow="Événements et clubs"
        title="Ne ratez plus aucun événement de club"
        text="Les clubs publient leurs événements et gèrent la capacité. Vous vous inscrivez en un clic et un rappel arrive la veille."
        cta="Explorer les événements"
        to={module('/evenements')}
      >
        <div className="lp-card" style={card(0, { left: 0, top: 0, width: 250 })}>
          <h3>Recommandé pour vous</h3>
          <div className="lp-photo h-[90px]" style={{ backgroundImage: "url('/img/study-desk.jpg')" }} />
          <b className="mt-2.5 block">Atelier CV et LinkedIn</b>
          <div className="lp-m">Lun. 27 oct. · 12:30 · Salle polyvalente</div>
        </div>
        <div className="lp-card lp-ticket" data-label="INSCRIPTION" style={card(1, { right: 0, top: 60, width: 300 })}>
          <h3 className="mt-1">Nuit de la robotique</h3>
          <div className="lp-m">Jeudi 30 octobre · 19:00 · Amphi A</div>
          <div className="mt-3 grid grid-cols-[1fr_auto] items-center gap-3">
            <div>
              <div className="lp-m">Participante</div>
              <b>Yasmine Ben Salah</b>
              <div className="lp-m mt-1.5">Rappel</div>
              <b>Mercredi 19:00</b>
            </div>
            <span className="lp-tag ok">Inscrite</span>
          </div>
        </div>
        <div className="lp-card" style={card(2, { left: 30, top: 250, width: 260 })}>
          <h3>
            Inscriptions <span className="lp-m font-medium">en direct</span>
          </h3>
          <div className="flex items-baseline gap-2">
            <span className="lp-price text-[28px]">42</span>
            <span className="lp-m">sur 60 places</span>
          </div>
          <div className="lp-progress">
            <i style={{ '--w': '70%' }} />
          </div>
        </div>
      </Feature>

      <Feature
        id="messagerie"
        dark
        eyebrow="Messagerie"
        title="Toutes vos conversations du campus au même endroit"
        text="Discutez avec un vendeur ou un conducteur en direct, sans partager votre numéro. Les notifications arrivent en temps réel."
        cta="Explorer la messagerie"
        to={module('/messages')}
      >
        <div className="lp-card" style={card(0, { left: 0, top: 20, width: 260 })}>
          <h3>
            Messages <span className="lp-tag">3 non lus</span>
          </h3>
          {[
            ['KM', '#1c6b43', 'Karim M.', 'Je vous attends à la station TGM'],
            ['YB', '#0049db', 'Yasmine B.', 'Le livre est toujours dispo'],
            ['SK', '#b4531b', 'Skander M.', 'Merci pour le trajet'],
          ].map(([i, c, n, m]) => (
            <div key={i} className="lp-row">
              <span className="lp-avatar" style={{ '--c': c }}>
                {i}
              </span>
              <div className="min-w-0 flex-1">
                <b>{n}</b>
                <div className="lp-m truncate">{m}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="lp-card" style={card(1, { right: 0, top: 90, width: 300 })}>
          <h3>
            Karim M. <span className="lp-m font-medium">Trajet de demain</span>
          </h3>
          <div className="lp-chat">
            <span className="lp-bubble">Bonjour, départ 07:45 devant la station TGM.</span>
          </div>
          <div className="lp-chat">
            <span className="lp-bubble me">Parfait, j’y serai à 07:40.</span>
          </div>
          <div className="lp-chat">
            <span className="lp-bubble">À demain.</span>
          </div>
        </div>
      </Feature>

      <section id="donnees" className="scroll-mt-20 px-4 py-20 sm:px-6 sm:py-24">
        <div className="relative mx-auto grid max-w-[1000px] items-center gap-10 overflow-hidden rounded-md bg-brand px-6 py-12 text-white sm:px-12 sm:py-14 lg:grid-cols-[1fr_minmax(0,440px)]">
          <div className="pointer-events-none absolute top-1/2 left-[72%] hidden h-[560px] lg:block w-[300px] -translate-1/2 rounded-[44px] border-[14px] border-[#0f1b4d] opacity-55" aria-hidden="true" />
          <div className="relative flex flex-col gap-4">
            <Eyebrow onDark data-rise="">
              Les données au service des étudiants
            </Eyebrow>
            <h2 data-rise="" style={{ '--d': 1 }} className="text-[28px] leading-[1.25] font-semibold">
              Le bon prix pour votre livre, estimé en direct
            </h2>
            <p data-rise="" style={{ '--d': 2 }} className="max-w-[40ch] leading-relaxed text-white/85">
              Un Random Forest entraîné sur les annonces estime le prix d’un livre d’occasion. Modifiez les champs : l’estimation se met à jour.
            </p>
          </div>
          <div className="relative text-foreground">
            <PriceEstimator />
          </div>
        </div>
      </section>

      <PublicEvents />

      <section className="mx-auto max-w-[1200px] px-4 py-20 sm:px-6 sm:pb-24">
        <div className="rounded-md bg-ink px-6 py-14 text-center text-white sm:py-16">
          <Eyebrow onDark>C’est parti</Eyebrow>
          <h2 className="mt-3.5 text-[28px] font-semibold sm:text-[32px]">Rejoignez CampusHub avec votre e-mail universitaire</h2>
          <p className="mx-auto mt-4 max-w-[40em] text-[#e6e6e6]">L’inscription est réservée aux adresses @campus.tn et prend moins d’une minute.</p>
          <Button asChild variant="brand" size="xl" className="mt-7">
            <Link to={signup}>
              {user ? 'Ouvrir CampusHub' : 'Créer un compte'} <ArrowRight />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { BookOpen, Plus, Search, SearchX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ViewSwitch } from '@/components/ViewSwitch';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { Pagination } from '@/components/Pagination';
import { BookCard, BookCardSkeleton } from '@/components/books/BookCard';
import { BookFormSheet } from '@/components/books/BookFormSheet';
import { useDebounced } from '@/hooks/useDebounced';
import { get } from '@/lib/api';
import { ETAT_LABELS, ETATS } from '@/lib/books';
import { plural } from '@/lib/format';

const ALL = 'toutes';
const SORT_LABELS = { recent: 'Plus récentes', prix_asc: 'Prix croissant', prix_desc: 'Prix décroissant' };

export default function Livres() {
  const [params, setParams] = useSearchParams();
  const [publishing, setPublishing] = useState(() => params.get('publier') === '1');
  const [q, setQ] = useState(params.get('q') || '');
  const debouncedQ = useDebounced(q, 300);

  const mine = params.get('vue') === 'mes-annonces';
  const categorie = params.get('categorie') || ALL;
  const etats = params.get('etat') ? params.get('etat').split(',') : [];
  const prixMax = params.get('prixMax') || '';
  const tri = params.get('tri') || 'recent';
  const page = Number(params.get('page')) || 1;

  const update = (changes, { keepPage } = {}) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const [k, v] of Object.entries(changes)) {
          if (v === '' || v === null || v === undefined || v === ALL || (Array.isArray(v) && !v.length)) next.delete(k);
          else next.set(k, Array.isArray(v) ? v.join(',') : v);
        }
        if (!keepPage) next.delete('page');
        return next;
      },
      { replace: true },
    );

  useEffect(() => {
    if (debouncedQ !== (params.get('q') || '')) update({ q: debouncedQ.trim() });
  }, [debouncedQ]);

  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: () => get('/categories').then((r) => r.categories), staleTime: Infinity });

  const filters = {
    q: params.get('q') || undefined,
    categorie: categorie === ALL ? undefined : categorie,
    etat: etats.length ? etats.join(',') : undefined,
    prixMax: prixMax || undefined,
    tri,
    page,
    limit: 12,
    vendeur: mine ? 'moi' : undefined,
  };
  const { data, isPending, isError, refetch, isPlaceholderData } = useQuery({
    queryKey: ['annonces', filters],
    queryFn: () => get('/annonces', filters),
    placeholderData: keepPreviousData,
  });

  const hasFilters = Boolean(filters.q || filters.categorie || filters.etat || filters.prixMax);

  return (
    <>
      <PageHeader title="Marketplace de livres" description="Achetez et vendez vos manuels entre étudiants du campus.">
        <Button onClick={() => setPublishing(true)}>
          <Plus /> Publier une annonce
        </Button>
      </PageHeader>

      <ViewSwitch
        label="Annonces affichées"
        value={mine ? 'mine' : 'all'}
        options={[
          { value: 'all', label: 'Toutes les annonces', to: '/livres' },
          { value: 'mine', label: 'Mes annonces', to: '/livres?vue=mes-annonces' },
        ]}
      />

      <section aria-label="Filtres" className="grid gap-3 rounded-lg border bg-card p-4 shadow-xs md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_120px_minmax(0,1fr)]">
        <label className="relative">
          <span className="sr-only">Rechercher</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Titre, auteur, matière" className="pl-9" type="search" />
        </label>
        <Select value={categorie} onValueChange={(v) => update({ categorie: v })}>
          <SelectTrigger className="w-full" aria-label="Catégorie">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Toutes les catégories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c._id} value={c._id}>
                {c.nom}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input inputMode="decimal" value={prixMax} onChange={(e) => update({ prixMax: e.target.value.replace(/[^\d.]/g, '') })} placeholder="Prix max" aria-label="Prix maximum en dinars" />
        <Select value={tri} onValueChange={(v) => update({ tri: v === 'recent' ? null : v })}>
          <SelectTrigger className="w-full" aria-label="Trier par">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(SORT_LABELS).map(([v, l]) => (
              <SelectItem key={v} value={v}>
                {l}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <ToggleGroup type="multiple" value={etats} onValueChange={(v) => update({ etat: v })} aria-label="État du livre" className="flex flex-wrap justify-start gap-1.5 md:col-span-4">
          {ETATS.map((e) => (
            <ToggleGroupItem
              key={e}
              value={e}
              className="h-8 rounded-full border border-input px-3 text-[13px] data-[state=on]:border-foreground data-[state=on]:bg-foreground data-[state=on]:text-background"
            >
              {ETAT_LABELS[e]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </section>

      <div className="flex min-h-5 items-center justify-between text-sm text-muted-foreground" aria-live="polite">
        {data && <span>{plural(data.total, 'annonce')}</span>}
        {hasFilters && (
          <button
            type="button"
            className="font-medium text-primary hover:underline"
            onClick={() => {
              setQ('');
              update({ q: null, categorie: null, etat: null, prixMax: null });
            }}
          >
            Effacer les filtres
          </button>
        )}
      </div>

      {isError ? (
        <EmptyState icon={SearchX} title="Impossible de charger les annonces" description="Vérifiez votre connexion puis réessayez." action={<Button variant="outline" onClick={() => refetch()}>Réessayer</Button>} />
      ) : isPending ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-4">
          {Array.from({ length: 8 }, (_, i) => (
            <BookCardSkeleton key={i} />
          ))}
        </div>
      ) : data.annonces.length === 0 ? (
        mine ? (
          <EmptyState icon={BookOpen} title="Vous n’avez pas encore d’annonce" description="Publiez un manuel en une minute : le prix conseillé vous aide à fixer le bon tarif." action={<Button onClick={() => setPublishing(true)}><Plus /> Publier une annonce</Button>} />
        ) : hasFilters ? (
          <EmptyState icon={SearchX} title="Aucun livre ne correspond" description="Élargissez la recherche ou retirez un filtre." />
        ) : (
          <EmptyState icon={BookOpen} title="Aucune annonce pour le moment" description="Soyez le premier à publier un manuel." action={<Button onClick={() => setPublishing(true)}><Plus /> Publier une annonce</Button>} />
        )
      ) : (
        <div className={`grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-4 transition-opacity duration-150 ${isPlaceholderData ? 'opacity-60' : ''}`}>
          {data.annonces.map((b) => (
            <BookCard key={b._id} book={b} showStatus={mine} />
          ))}
        </div>
      )}

      {data && <Pagination page={data.page} pages={data.pages} onChange={(p) => update({ page: p }, { keepPage: true })} />}
      <BookFormSheet open={publishing} onOpenChange={(o) => { setPublishing(o); if (!o && params.has('publier')) setParams((prev) => { const n = new URLSearchParams(prev); n.delete('publier'); return n; }, { replace: true }); }} />
    </>
  );
}

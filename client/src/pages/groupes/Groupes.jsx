import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Plus, Search, SearchX, UsersRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { Pagination } from '@/components/Pagination';
import { GroupCard, GroupCardSkeleton } from '@/components/groups/GroupCard';
import { GroupFormSheet } from '@/components/groups/GroupFormSheet';
import { useDebounced } from '@/hooks/useDebounced';
import { useJoinGroup } from '@/hooks/useJoinGroup';
import { get } from '@/lib/api';
import { plural } from '@/lib/format';

const grid = 'grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4';

export default function Groupes() {
  const [params, setParams] = useSearchParams();
  const [creating, setCreating] = useState(false);
  const [q, setQ] = useState(params.get('q') || '');
  const debouncedQ = useDebounced(q, 300);
  const page = Number(params.get('page')) || 1;
  const join = useJoinGroup();

  useEffect(() => {
    if (debouncedQ === (params.get('q') || '')) return;
    setParams(debouncedQ.trim() ? { q: debouncedQ.trim() } : {}, { replace: true });
  }, [debouncedQ]);

  const mine = useQuery({ queryKey: ['groupes', 'mes-groupes'], queryFn: () => get('/groupes/mes-groupes') });
  const filters = { q: params.get('q') || undefined, page, limit: 12 };
  const explore = useQuery({ queryKey: ['groupes', 'explorer', filters], queryFn: () => get('/groupes', filters), placeholderData: keepPreviousData });

  return (
    <>
      <PageHeader title="Groupes d’étude" description="Révisez à plusieurs, par matière.">
        <Button onClick={() => setCreating(true)}>
          <Plus /> Créer un groupe
        </Button>
      </PageHeader>

      <section className="flex flex-col gap-3" aria-labelledby="mes-groupes">
        <h2 id="mes-groupes" className="font-semibold">
          Mes groupes
        </h2>
        {mine.isPending ? (
          <div className={grid}>
            <GroupCardSkeleton />
            <GroupCardSkeleton />
          </div>
        ) : mine.data.groupes.length === 0 ? (
          <EmptyState icon={UsersRound} title="Vous n’êtes dans aucun groupe" description="Rejoignez un groupe ci-dessous ou créez le vôtre pour réviser une matière à plusieurs." />
        ) : (
          <div className={grid}>
            {mine.data.groupes.map((g) => (
              <GroupCard key={g._id} group={g} />
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="explorer">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="explorer" className="font-semibold">
            Explorer
            {explore.data && <span className="ml-2 text-sm font-normal text-muted-foreground">{plural(explore.data.total, 'groupe')}</span>}
          </h2>
          <label className="relative w-full sm:w-72">
            <span className="sr-only">Rechercher un groupe</span>
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Matière, nom du groupe" className="pl-9" />
          </label>
        </div>
        {explore.isPending ? (
          <div className={grid}>{Array.from({ length: 6 }, (_, i) => <GroupCardSkeleton key={i} />)}</div>
        ) : explore.data.groupes.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title={filters.q ? 'Aucun groupe ne correspond' : 'Aucun groupe pour le moment'}
            description={filters.q ? 'Essayez un autre mot-clé, ou créez ce groupe vous-même.' : 'Créez le premier groupe de révision du campus.'}
            action={<Button variant="outline" onClick={() => setCreating(true)}><Plus /> Créer un groupe</Button>}
          />
        ) : (
          <div className={grid}>
            {explore.data.groupes.map((g) => (
              <GroupCard key={g._id} group={g} onJoin={() => join.mutate(g._id)} joining={join.isPending && join.variables === g._id} />
            ))}
          </div>
        )}
        {explore.data && <Pagination page={explore.data.page} pages={explore.data.pages} onChange={(p) => setParams((prev) => { const n = new URLSearchParams(prev); n.set('page', p); return n; })} />}
      </section>
      <GroupFormSheet open={creating} onOpenChange={setCreating} />
    </>
  );
}

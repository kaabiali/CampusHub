import { Link, useSearchParams } from 'react-router';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ArrowDownRight, ArrowRight, ArrowUpRight, Flag, Minus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader } from '@/components/PageHeader';
import { ChartCard, ColumnChart, RankBars } from '@/components/admin/charts';
import { get } from '@/lib/api';
import { cn } from '@/lib/utils';

const PERIODS = { 7: '7 derniers jours', 30: '30 derniers jours', semestre: 'Ce semestre (120 jours)' };
const fmtNumber = new Intl.NumberFormat('fr-FR');
const dayLabel = (iso) => new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${iso}T12:00:00Z`));
const weekday = (iso) => new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' }).format(new Date(`${iso}T12:00:00Z`)).replace('.', '');

function Delta({ value, previousLabel }) {
  if (value === null || value === undefined) return <span className="text-[13px] text-muted-foreground">Aucune activité sur la période précédente</span>;
  const Icon = value > 0 ? ArrowUpRight : value < 0 ? ArrowDownRight : Minus;
  return (
    <span className={cn('inline-flex items-center gap-1 text-[13px] font-medium', value > 0 ? 'text-success' : value < 0 ? 'text-destructive' : 'text-muted-foreground')}>
      <Icon className="size-3.5" aria-hidden="true" />
      {value > 0 ? '+' : ''}
      {String(value).replace('.', ',')} % <span className="font-normal text-muted-foreground">{previousLabel}</span>
    </span>
  );
}

function Kpi({ label, kpi, previousLabel, children }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-lg border bg-card px-5 py-4 shadow-xs">
      <span className="text-[13px] text-muted-foreground">{label}</span>
      {kpi ? <span className="text-[28px] leading-none font-semibold tracking-tight">{fmtNumber.format(kpi.valeur)}</span> : <span className="h-7 w-14 rounded bg-muted animate-pulse" />}
      {children ?? (kpi ? <Delta value={kpi.evolution} previousLabel={previousLabel} /> : <span className="h-4 w-24 rounded bg-muted/70 animate-pulse" />)}
    </div>
  );
}

export default function AdminDashboard() {
  const [params, setParams] = useSearchParams();
  const periode = params.get('periode') || '30';
  const { data, isPlaceholderData } = useQuery({ queryKey: ['admin', 'stats', periode], queryFn: () => get('/admin/stats', { periode }), placeholderData: keepPreviousData });
  const previousLabel = `vs les ${data?.periode.jours ?? ''} jours précédents`;
  const k = data?.kpis;
  const pending = k?.signalementsEnAttente;

  return (
    <>
      <PageHeader title="Administration" description="Activité de la plateforme et modération. Données agrégées, sans information personnelle.">
        <Select value={periode} onValueChange={(v) => setParams(v === '30' ? {} : { periode: v })}>
          <SelectTrigger className="w-56" aria-label="Période">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(PERIODS).map(([v, l]) => (
              <SelectItem key={v} value={v}>
                {l}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </PageHeader>

      <section className={cn('grid grid-cols-2 gap-3 transition-opacity lg:grid-cols-4', isPlaceholderData && 'opacity-60')} aria-label="Indicateurs">
        <Kpi label="Utilisateurs actifs" kpi={k?.utilisateursActifs} previousLabel={previousLabel} />
        <Kpi label="Annonces publiées" kpi={k?.annoncesPubliees} previousLabel={previousLabel} />
        <Kpi label="Trajets" kpi={k?.trajets} previousLabel={previousLabel} />
        <Kpi label="Signalements en attente" kpi={pending}>
          {pending && (
            <Link to="/admin/moderation" className={cn('inline-flex items-center gap-1 text-[13px] font-medium', pending.valeur ? 'text-warning' : 'text-muted-foreground')}>
              <Flag className="size-3.5" aria-hidden="true" />
              {pending.valeur ? `À traiter${pending.delaiMoyenHeures !== null ? ` · délai moyen ${String(pending.delaiMoyenHeures).replace('.', ',')} h` : ''}` : 'Aucun en attente'}
              {pending.valeur > 0 && <ArrowRight className="size-3.5" />}
            </Link>
          )}
        </Kpi>
      </section>

      {!data ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <div className="h-72 rounded-lg bg-muted/70 animate-pulse" />
          <div className="h-72 rounded-lg bg-muted/70 animate-pulse" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start">
            <ChartCard
              title="Utilisateurs actifs par jour"
              subtitle={`${PERIODS[periode]} · ${fmtNumber.format(k.nouveauxInscrits.valeur)} nouveaux inscrits`}
              dimmed={isPlaceholderData}
              rows={data.actifsParJour}
              columns={[
                { key: 'jour', label: 'Jour', format: dayLabel },
                { key: 'utilisateurs', label: 'Utilisateurs', numeric: true },
              ]}
            >
              <ColumnChart data={data.actifsParJour} x="jour" y="utilisateurs" unit="actifs" tickFormatter={data.periode.jours <= 7 ? weekday : dayLabel} labelFormatter={dayLabel} />
            </ChartCard>
            <ChartCard
              title="Matières les plus demandées"
              subtitle="Nombre d’étudiants qui suivent la matière"
              rows={data.matieresDemandees}
              columns={[
                { key: 'matiere', label: 'Matière' },
                { key: 'etudiants', label: 'Étudiants', numeric: true },
              ]}
            >
              {data.matieresDemandees.length ? <RankBars data={data.matieresDemandees} label="matiere" value="etudiants" unit="étudiants" /> : <p className="py-8 text-center text-sm text-muted-foreground">Aucune matière renseignée dans les profils.</p>}
            </ChartCard>
          </div>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-start">
            <ChartCard title="Trajets les plus fréquents" subtitle={PERIODS[periode]}>
              {data.trajetsFrequents.length ? (
                <ol className="flex flex-col">
                  {data.trajetsFrequents.map((t, i) => (
                    <li key={`${t.depart}-${t.arrivee}`} className="flex items-center gap-3 border-t py-2.5 text-sm first:border-t-0">
                      <span className="w-4 text-xs text-muted-foreground tabular">{i + 1}</span>
                      <span className="min-w-0 flex-1 truncate">
                        <strong className="font-semibold">{t.depart}</strong> → {t.arrivee}
                      </span>
                      <span className="text-right text-muted-foreground tabular">
                        {t.trajets} trajet{t.trajets > 1 ? 's' : ''} · {t.places} place{t.places > 1 ? 's' : ''}
                      </span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">Aucun trajet sur la période.</p>
              )}
            </ChartCard>
            <ChartCard
              title="Pics d’activité"
              subtitle="Messages envoyés par heure de la journée (heure de Tunis)"
              dimmed={isPlaceholderData}
              rows={data.activiteParHeure}
              columns={[
                { key: 'heure', label: 'Heure', format: (h) => `${String(h).padStart(2, '0')} h` },
                { key: 'messages', label: 'Messages', numeric: true },
              ]}
            >
              <ColumnChart data={data.activiteParHeure} x="heure" y="messages" unit="messages" height={200} tickFormatter={(h) => `${h}h`} labelFormatter={(h) => `${String(h).padStart(2, '0')} h – ${String((h + 1) % 24).padStart(2, '0')} h`} interval={2} />
            </ChartCard>
          </div>
        </>
      )}
    </>
  );
}

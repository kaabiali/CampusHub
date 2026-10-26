import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BarChart3, Table2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const AXIS = { fill: 'var(--muted-foreground)', fontSize: 12 };

// Every chart has a table twin so no value is reachable only by hovering.
export function ChartCard({ title, subtitle, rows, columns, children, className, dimmed }) {
  const [asTable, setAsTable] = useState(false);
  return (
    <section className={cn('flex flex-col gap-4 rounded-lg border bg-card p-5 shadow-xs', className)} aria-label={title}>
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">{title}</h2>
          {subtitle && <p className="text-[13px] text-muted-foreground">{subtitle}</p>}
        </div>
        {rows && (
          <button
            type="button"
            onClick={() => setAsTable((t) => !t)}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-pressed={asTable}
          >
            {asTable ? <BarChart3 className="size-3.5" /> : <Table2 className="size-3.5" />}
            {asTable ? 'Graphique' : 'Tableau'}
          </button>
        )}
      </header>
      <div className={cn('transition-opacity duration-150', dimmed && 'opacity-50')}>
        {asTable ? (
          <div className="max-h-72 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card text-left text-xs text-muted-foreground">
                <tr>
                  {columns.map((c) => (
                    <th key={c.key} className={cn('pb-2 font-medium', c.numeric && 'text-right')}>
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-t">
                    {columns.map((c) => (
                      <td key={c.key} className={cn('py-1.5', c.numeric && 'text-right tabular')}>
                        {c.format ? c.format(r[c.key], r) : r[c.key]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          children
        )}
      </div>
    </section>
  );
}

export function ChartTooltip({ active, payload, label, unit, formatLabel }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="text-xs text-muted-foreground">{formatLabel ? formatLabel(label) : label}</p>
      <p className="mt-0.5 flex items-center gap-2 font-semibold">
        <span className="size-2 rounded-sm bg-chart-1" aria-hidden="true" />
        {payload[0].value} {unit}
      </p>
    </div>
  );
}

// Labels only the tallest bar: a value on every bar is noise, the axis and tooltip carry the rest.
// Recharts 3 renders this as a component with the bar geometry in `viewBox`; its `index` counts only
// non-empty bars, so the peak is matched by value (ties are all labelled, which stays truthful).
function PeakLabel({ peak }) {
  return function Label({ viewBox, value }) {
    if (!value || value !== peak || !viewBox) return null;
    const { x, y, width, height } = viewBox;
    const horizontal = height < width;
    return (
      <text
        x={horizontal ? x + width + 6 : x + width / 2}
        y={horizontal ? y + height / 2 : y - 6}
        textAnchor={horizontal ? 'start' : 'middle'}
        dominantBaseline={horizontal ? 'central' : 'auto'}
        className="fill-foreground text-xs font-semibold"
      >
        {value}
      </text>
    );
  };
}

export function ColumnChart({ data, x, y, unit, height = 220, tickFormatter, labelFormatter, interval }) {
  const peak = Math.max(0, ...data.map((d) => d[y]));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 20, right: 4, bottom: 0, left: -18 }} barCategoryGap={2}>
        <CartesianGrid vertical={false} stroke="var(--border)" strokeWidth={1} />
        <XAxis dataKey={x} tick={AXIS} tickLine={false} axisLine={{ stroke: 'var(--border)' }} tickFormatter={tickFormatter} interval={interval ?? 'preserveStartEnd'} minTickGap={8} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} width={48} />
        <Tooltip cursor={{ fill: 'var(--accent)' }} content={<ChartTooltip unit={unit} formatLabel={labelFormatter} />} />
        <Bar dataKey={y} fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false}>
          <LabelList dataKey={y} content={PeakLabel({ peak })} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function RankBars({ data, label, value, unit }) {
  const height = Math.max(120, data.length * 34 + 8);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 36, bottom: 0, left: 0 }} barCategoryGap={8}>
        <XAxis type="number" hide allowDecimals={false} />
        <YAxis type="category" dataKey={label} tick={{ ...AXIS, fill: 'var(--foreground)' }} tickLine={false} axisLine={false} width={120} />
        <Tooltip cursor={{ fill: 'var(--accent)' }} content={<ChartTooltip unit={unit} />} />
        <Bar dataKey={value} fill="var(--chart-1)" radius={[0, 4, 4, 0]} maxBarSize={20} isAnimationActive={false}>
          <LabelList dataKey={value} position="right" className="fill-foreground text-xs font-semibold" />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

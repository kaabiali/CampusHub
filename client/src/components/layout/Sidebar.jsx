import { useLayoutEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { Settings } from 'lucide-react';
import { BrandMark } from '@/components/Brand';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useUnreadMessages } from '@/hooks/useConversations';
import { ADMIN_NAV, NAV_SECTIONS, resolveActive } from '@/lib/nav';
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/AuthProvider';
import { useSidebar } from '@/providers/SidebarProvider';
import { AccountCard } from './AccountCard';

const SETTINGS_ITEM = { to: '/parametres', label: 'Paramètres', icon: Settings };
const WIDTH_EXPANDED = 248;
const WIDTH_COLLAPSED = 72;
const clip = (collapsed) => cn('transition-[opacity,max-width] duration-200 ease-out', collapsed ? 'max-w-0 overflow-hidden opacity-0' : 'max-w-full opacity-100');

function NavRow({ item, active, collapsed, badge = 0, onHover, onNavigate, filled }) {
  const Icon = item.icon;
  const link = (
    <Link
      to={item.to}
      data-nav={item.to}
      aria-current={active ? 'page' : undefined}
      onMouseEnter={() => onHover?.(item.to)}
      onFocus={() => onHover?.(item.to)}
      onClick={onNavigate}
      className={cn(
        'relative flex h-9 items-center rounded-lg text-[13.5px] font-medium transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ring',
        collapsed ? 'justify-center' : 'gap-[11px] px-2.5',
        active ? 'text-sidebar-foreground' : 'text-sidebar-muted hover:text-sidebar-foreground',
        // Rows outside the main nav have no travelling pill, so they paint their own.
        filled && (active ? 'bg-primary/[0.14]' : 'hover:bg-primary/[0.09]'),
      )}
    >
      {/* "You are here" stays on the active row even while the pill follows the pointer elsewhere. */}
      {active && <span aria-hidden="true" className="absolute inset-y-[7px] -left-3 w-[3px] rounded-r-full bg-primary" />}
      <Icon className={cn('relative size-4 shrink-0 transition-opacity duration-150', active ? 'text-primary' : 'opacity-85')} strokeWidth={1.9} />
      <span className={cn('relative min-w-0 truncate', clip(collapsed), !collapsed && 'flex-1')}>{item.label}</span>
      {badge > 0 && (
        <span
          aria-label={`${badge} non lus`}
          className={cn(
            'relative shrink-0 rounded-full text-center text-[11px] font-bold tabular',
            active ? 'bg-primary text-primary-foreground' : 'border border-input bg-muted text-sidebar-muted',
            collapsed ? 'max-w-0 overflow-hidden opacity-0' : 'min-w-[18px] px-1.5 py-px',
          )}
        >
          {badge > 99 ? '99+' : badge}
        </span>
      )}
      {collapsed && badge > 0 && <span aria-hidden="true" className="absolute top-1.5 right-2.5 size-2 rounded-full bg-primary ring-2 ring-sidebar" />}
    </Link>
  );
  if (!collapsed) return link;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={10}>
        {item.label}
        {badge > 0 ? ` · ${badge}` : ''}
      </TooltipContent>
    </Tooltip>
  );
}

// One pill travels between rows instead of each row fading its own background: it rests on the active row and follows the pointer.
function usePill(navRef, target, collapsed) {
  const [pill, setPill] = useState({ top: 0, height: 36, visible: false, animate: false });
  const placed = useRef(false);
  useLayoutEffect(() => {
    const el = target ? navRef.current?.querySelector(`[data-nav="${target}"]`) : null;
    if (!el) {
      setPill((p) => ({ ...p, visible: false }));
      return;
    }
    setPill({ top: el.offsetTop, height: el.offsetHeight, visible: true, animate: placed.current });
    placed.current = true;
  }, [navRef, target, collapsed]);
  return pill;
}

export function Sidebar({ inSheet = false, onNavigate }) {
  const { user } = useAuth();
  const sidebar = useSidebar();
  const collapsed = inSheet ? false : sidebar.collapsed;
  const { pathname } = useLocation();
  const unread = useUnreadMessages();
  const sections = [...NAV_SECTIONS, ...(user?.role === 'ADMIN' ? [{ title: 'Administration', items: ADMIN_NAV }] : [])];
  const active = resolveActive([...sections.flatMap((s) => s.items), SETTINGS_ITEM], pathname);
  const [hovered, setHovered] = useState(null);
  const navRef = useRef(null);
  const target = hovered ?? active;
  const pill = usePill(navRef, target, collapsed);
  const badges = { '/messages': unread };

  return (
    <TooltipProvider delayDuration={0} skipDelayDuration={0}>
      <aside
        id={inSheet ? undefined : 'barre-laterale'}
        aria-label="Barre latérale"
        style={inSheet ? undefined : { width: collapsed ? WIDTH_COLLAPSED : WIDTH_EXPANDED }}
        className={cn(
          'flex shrink-0 flex-col bg-sidebar text-sidebar-foreground',
          // Width is the only animated property: animating the contents too would reflow text mid-flight.
          inSheet ? 'h-full w-full' : 'sticky top-0 hidden h-dvh border-r border-sidebar-border transition-[width] duration-[280ms] ease-[cubic-bezier(0.32,0.72,0,1)] lg:flex',
        )}
      >
        <div className="flex h-14 shrink-0 items-center border-b border-sidebar-border px-3">
          <Link
            to="/accueil"
            onClick={onNavigate}
            aria-label="CampusHub, accueil"
            className={cn('flex min-w-0 items-center gap-2.5 rounded-md text-lg tracking-[-0.02em] outline-none focus-visible:ring-2 focus-visible:ring-ring', collapsed && 'w-full justify-center')}
          >
            <BrandMark className="size-8" />
            <span className={cn('truncate', clip(collapsed))}>
              <b className="font-bold">Campus</b>Hub
            </span>
          </Link>
        </div>

        <nav ref={navRef} aria-label="Navigation principale" className="relative flex flex-1 flex-col overflow-x-hidden overflow-y-auto p-3" onMouseLeave={() => setHovered(null)} onBlur={() => setHovered(null)}>
          <span
            aria-hidden="true"
            className={cn('pointer-events-none absolute inset-x-3 top-0 rounded-lg', pill.animate && 'transition-[transform,opacity,background-color] duration-[260ms] ease-[cubic-bezier(0.32,0.72,0,1)]')}
            style={{
              height: pill.height,
              transform: `translateY(${pill.top}px)`,
              opacity: pill.visible ? 1 : 0,
              // Same blue at two strengths, so the pill shifts weight rather than colour as it travels.
              backgroundColor: `color-mix(in oklab, var(--primary) ${target === active ? 14 : 9}%, transparent)`,
            }}
          />
          {sections.map((section, i) => (
            <div key={section.title ?? i} className={cn('flex flex-col gap-px', i > 0 && 'mt-4')}>
              {section.title && !collapsed && <h2 className="mb-1 px-2.5 text-[11px] font-medium text-sidebar-muted">{section.title}</h2>}
              {section.items.map((item) => (
                <NavRow key={item.to} item={item} active={item.to === active} collapsed={collapsed} badge={badges[item.to]} onHover={setHovered} onNavigate={onNavigate} />
              ))}
            </div>
          ))}
        </nav>

        <div className="flex flex-col gap-px border-t border-sidebar-border p-3">
          <NavRow item={SETTINGS_ITEM} active={active === SETTINGS_ITEM.to} collapsed={collapsed} onNavigate={onNavigate} filled />
          <AccountCard collapsed={collapsed} onNavigate={onNavigate} />
        </div>
      </aside>
    </TooltipProvider>
  );
}

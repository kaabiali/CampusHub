import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTheme } from '@/providers/ThemeProvider';

// One click to the other mode. The icon shows the mode you would get, which is what makes an unlabelled toggle readable.
// "Système" stays available in Paramètres › Apparence.
export function ThemeToggle({ className }) {
  const { resolved, setTheme } = useTheme();
  const next = resolved === 'dark' ? 'light' : 'dark';
  const label = next === 'dark' ? 'Passer en mode sombre' : 'Passer en mode clair';
  return (
    <Button variant="ghost" size="icon" className={cn('size-9 rounded-md text-muted-foreground hover:text-foreground', className)} onClick={() => setTheme(next)} aria-label={label} title={label}>
      {next === 'dark' ? <Moon className="size-[18px]" /> : <Sun className="size-[18px]" />}
    </Button>
  );
}

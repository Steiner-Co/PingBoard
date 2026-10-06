"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/icon";
import { Sun } from "@phosphor-icons/react/dist/icons/Sun";
import { Moon } from "@phosphor-icons/react/dist/icons/Moon";

// no-op fallback for browsers that don't support startViewTransition
interface ThemeSwitchProps {
  /** @default 16 */
  iconSize?: number;
  className?: string;
}

function ThemeSwitch({ iconSize = 16, className }: ThemeSwitchProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Theme switching is a 100+/day control; the previous full-screen circular
  // view-transition wipe was the largest motion in the product and over-
  // stated the moment. Just swap the theme — the icon crossfade already
  // signals the change.
  const toggle = () => {
    const next = resolvedTheme === 'dark' ? 'light' : 'dark';
    setTheme(next);
  };

  const isDark = resolvedTheme === 'dark';

  if (!mounted) {
    // placeholder to prevent layout shift before hydration
    return <div aria-hidden className={cn('size-7 rounded-md', className)} />;
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        'relative flex items-center justify-center size-7 rounded-md',
        'cursor-pointer text-muted-foreground outline-none',
        'transition-[background-color,transform] duration-150 ease-out',
        'hover:bg-accent hover:text-foreground active:scale-[0.97]',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        className,
      )}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {/* mode="wait" so exit completes before enter — clean crossfade, no
          layout shift. Icons are absolute so the overlap costs no layout. */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={isDark ? 'moon' : 'sun'}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="absolute inset-0 flex items-center justify-center"
        >
          {isDark ? (
            <Icon icon={Moon} size={iconSize} />
          ) : (
            <Icon icon={Sun} size={iconSize} />
          )}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}

export { ThemeSwitch, type ThemeSwitchProps };

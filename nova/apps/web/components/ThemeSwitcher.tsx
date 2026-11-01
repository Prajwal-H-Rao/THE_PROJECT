"use client";

import { useTheme } from "@/components/ThemeProvider";
import { Button } from "@/components/ui/button";

export function ThemeSwitcher() {
  const { theme, resolvedTheme, setTheme } = useTheme();

  return (
    <div className="flex items-center gap-2" role="group" aria-label="Theme selection">
      <Button
        variant={theme === "light" ? "default" : "ghost"}
        size="icon"
        onClick={() => setTheme("light")}
        aria-pressed={theme === "light"}
        title="Light mode"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
        <span className="sr-only">Light mode</span>
      </Button>

      <Button
        variant={theme === "dark" ? "default" : "ghost"}
        size="icon"
        onClick={() => setTheme("dark")}
        aria-pressed={theme === "dark"}
        title="Dark mode"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
          />
        </svg>
        <span className="sr-only">Dark mode</span>
      </Button>

      <Button
        variant={theme === "system" ? "default" : "ghost"}
        size="icon"
        onClick={() => setTheme("system")}
        aria-pressed={theme === "system"}
        title="System preference"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
        <span className="sr-only">System preference</span>
      </Button>

      <span className="text-xs text-muted-foreground hidden sm:inline">
        ({resolvedTheme})
      </span>
    </div>
  );
}
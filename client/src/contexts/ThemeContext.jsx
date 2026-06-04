import React, { createContext, useContext, useState, useEffect } from 'react';
const ThemeContext = createContext();
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
export const ThemeProvider = ({
  children
}) => {
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'system';
    const savedTheme = localStorage.getItem('findme-theme');
    if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system')) {
      return savedTheme;
    }
    return 'system';
  });
  const getAppliedTheme = () => {
    if (theme === 'system') {
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return theme;
  };
  const [appliedTheme, setAppliedTheme] = useState(getAppliedTheme);
  useEffect(() => {
    localStorage.setItem('findme-theme', theme);
    const root = document.documentElement;
    const newAppliedTheme = getAppliedTheme();
    setAppliedTheme(newAppliedTheme);
    if (newAppliedTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = () => {
      if (theme === 'system') {
        const newAppliedTheme = getAppliedTheme();
        setAppliedTheme(newAppliedTheme);
        if (newAppliedTheme === 'dark') {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
      }
    };
    if (theme === 'system') {
      mediaQuery.addEventListener('change', handleSystemThemeChange);
      return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
    }
  }, [theme]);
  const toggleTheme = () => {
    setTheme(prevTheme => {
      if (prevTheme === 'light') return 'dark';
      if (prevTheme === 'dark') return 'system';
      return 'light';
    });
  };
  const setThemeDirectly = newTheme => {
    if (['light', 'dark', 'system'].includes(newTheme)) {
      setTheme(newTheme);
    }
  };
  const value = {
    theme,
    appliedTheme,
    toggleTheme,
    setTheme: setThemeDirectly,
    isDark: appliedTheme === 'dark',
    isLight: appliedTheme === 'light',
    isSystem: theme === 'system'
  };
  return <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>;
};
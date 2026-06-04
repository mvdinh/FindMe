import React, { useState, useEffect } from 'react';
import HRSidebarPanel from '../components/HRNavbar';
import { lockHrBodyScroll, unlockHrBodyScroll } from '../hrBodyScrollLock';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Menu } from 'lucide-react';

const HRLayout = ({ children }) => {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  useEffect(() => {
    if (!mobileDrawerOpen) return undefined;
    lockHrBodyScroll();
    return () => {
      unlockHrBodyScroll();
    };
  }, [mobileDrawerOpen]);

  return (
    <div className="flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-background md:flex-row md:h-screen transition-colors duration-300">
      <header
        className="sticky top-0 z-20 flex h-[3.25rem] min-h-[3.25rem] shrink-0 items-center gap-3 border-b border-border bg-card px-3 pt-[env(safe-area-inset-top,0px)] md:hidden"
        style={{ paddingLeft: 'max(0.75rem, env(safe-area-inset-left, 0px))', paddingRight: 'max(0.75rem, env(safe-area-inset-right, 0px))' }}
      >
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => setMobileDrawerOpen(true)}
          className="min-h-11 min-w-11 touch-manipulation rounded-xl border-border"
          aria-label="Mở menu điều hướng"
        >
          <Menu className="size-6" />
        </Button>
        <span className="min-w-0 truncate font-['Open_Sans'] text-base font-bold tracking-tight text-primary">
          findme · Nhân sự
        </span>
      </header>

      <aside className="sticky top-0 z-30 hidden h-screen w-64 shrink-0 flex-col overflow-visible border-r border-border bg-card md:flex">
        <HRSidebarPanel />
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain focus:outline-none [-webkit-overflow-scrolling:touch] touch-pan-y">
          {children}
        </main>
        <footer
          className="shrink-0 border-t border-border bg-card px-3 py-2.5 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] transition-colors duration-300 sm:px-4"
          style={{ paddingLeft: 'max(0.75rem, env(safe-area-inset-left, 0px))', paddingRight: 'max(0.75rem, env(safe-area-inset-right, 0px))' }}
        >
          <p className="text-center font-['Roboto'] text-[11px] text-muted-foreground sm:text-xs">
            <span className="font-semibold text-primary">findme</span>
            <span className="mx-2 text-border">|</span>© {new Date().getFullYear()} · Bảo lưu mọi quyền
          </p>
        </footer>
      </div>

      <Sheet open={mobileDrawerOpen} onOpenChange={setMobileDrawerOpen}>
        <SheetContent
          side="left"
          showCloseButton
          className="flex h-[100dvh] max-h-[100dvh] w-[min(100%,20rem)] flex-col gap-0 overflow-hidden border-r border-border bg-card p-0 data-[side=left]:sm:max-w-[20rem]"
          style={{
            paddingTop: 'env(safe-area-inset-top, 0px)',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            paddingLeft: 'env(safe-area-inset-left, 0px)'
          }}
        >
          <HRSidebarPanel onNavigate={() => setMobileDrawerOpen(false)} />
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default HRLayout;

import React, { useEffect, useLayoutEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
const findmeLogo = '/logo.png';
import ThemeToggle from '../../components/common/ThemeToggle';
const HOME_SECTION_TRANG_CHU = 'trang-chu';
const HOME_SECTION_NOI_LAM_VIEC = 'noi-lam-viec-ban-dang-tim-kiem';
const HOME_SECTION_DAI_NGO = 'bien-giac-mo-thanh-hien-thuc';
const HOME_SECTION_SU_KIEN = 'su-kien';
const HEADER_SCROLL_OFFSET = 96;
const getHomeNavActiveKey = () => {
  const line = window.scrollY + HEADER_SCROLL_OFFSET;
  const heroEl = document.getElementById(HOME_SECTION_TRANG_CHU);
  const daiEl = document.getElementById(HOME_SECTION_DAI_NGO);
  const suEl = document.getElementById(HOME_SECTION_SU_KIEN);
  if (!heroEl) return 'home';
  const heroEnd = heroEl.offsetTop + heroEl.offsetHeight;
  if (line < heroEnd) return 'home';
  const daiTop = daiEl?.offsetTop ?? Infinity;
  const suTop = suEl?.offsetTop ?? Infinity;
  if (line >= suTop) return 'su-kien';
  if (line >= daiTop) return 'dai-ngo';
  return null;
};
const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [navActive, setNavActive] = useState(() => (typeof window !== 'undefined' && window.location.pathname.startsWith('/jobs') ? 'jobs' : null));
  const location = useLocation();
  useLayoutEffect(() => {
    if (location.pathname !== '/') {
      setNavActive(location.pathname.startsWith('/jobs') ? 'jobs' : null);
      return;
    }
    setNavActive(getHomeNavActiveKey());
  }, [location.pathname]);
  useEffect(() => {
    if (location.pathname !== '/') return;
    const tick = () => setNavActive(getHomeNavActiveKey());
    window.addEventListener('scroll', tick, {
      passive: true
    });
    window.addEventListener('resize', tick);
    return () => {
      window.removeEventListener('scroll', tick);
      window.removeEventListener('resize', tick);
    };
  }, [location.pathname]);
  const navDesktopClass = key => `transition-colors font-['Open_Sans'] ${navActive === key ? 'text-red-600 dark:text-red-400' : 'text-gray-800 dark:text-gray-200 opacity-90 hover:text-red-600 dark:hover:text-red-400'}`;
  const navMobileClass = key => `block px-3 py-2 rounded-lg font-['Open_Sans'] transition-colors ${navActive === key ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 font-semibold' : 'text-gray-800 dark:text-gray-200 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-700 dark:hover:text-red-300'}`;
  const scrollToTrangChu = () => {
    if (location.pathname === '/') {
      document.getElementById(HOME_SECTION_TRANG_CHU)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  };
  const scrollToNoiLamViec = () => {
    if (location.pathname === '/') {
      document.getElementById(HOME_SECTION_NOI_LAM_VIEC)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  };
  const scrollToDaiNgo = () => {
    if (location.pathname === '/') {
      document.getElementById(HOME_SECTION_DAI_NGO)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  };
  const scrollToSuKien = () => {
    if (location.pathname === '/') {
      document.getElementById(HOME_SECTION_SU_KIEN)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  };
  return <header className="fixed inset-x-0 top-0 z-50 border-0 bg-transparent backdrop-blur-xl transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-6">
        <div className="h-16 grid grid-cols-2 md:grid-cols-[auto_1fr_auto] items-center gap-4">
          {}
          <div className="flex items-center">
            <Link to={`/#${HOME_SECTION_NOI_LAM_VIEC}`} onClick={scrollToNoiLamViec} className="flex items-center gap-2">
              <img src={findmeLogo} alt="findme" className="w-8 h-8" />
              <span className="text-xl font-bold text-red-600 dark:text-red-400 font-['Open_Sans'] transition-colors duration-300">FINDME</span>
            </Link>
          </div>

          {}
          <nav className="hidden md:flex justify-center">
            <div className="flex items-center gap-6 text-sm font-semibold font-['Open_Sans']">
              <Link to={`/#${HOME_SECTION_TRANG_CHU}`} onClick={scrollToTrangChu} className={navDesktopClass('home')} aria-current={navActive === 'home' ? 'page' : undefined}>
                Trang chủ
              </Link>
              <Link to={`/#${HOME_SECTION_NOI_LAM_VIEC}`} onClick={scrollToNoiLamViec} className={navDesktopClass(null)}>
                Về FINDME
              </Link>
              <Link to="/jobs" className={navDesktopClass('jobs')} aria-current={navActive === 'jobs' ? 'page' : undefined}>
                Tuyển dụng
              </Link>
              <Link to={`/#${HOME_SECTION_DAI_NGO}`} onClick={scrollToDaiNgo} className={navDesktopClass('dai-ngo')} aria-current={navActive === 'dai-ngo' ? 'page' : undefined}>
                Đãi ngộ
              </Link>
              <Link to={`/#${HOME_SECTION_SU_KIEN}`} onClick={scrollToSuKien} className={navDesktopClass('su-kien')} aria-current={navActive === 'su-kien' ? 'page' : undefined}>
                Sự kiện
              </Link>
              <span className="opacity-90 text-gray-800 dark:text-gray-200">Liên hệ</span>
            </div>
          </nav>

          {}
          <div className="flex items-center justify-end gap-2">
            <div className="hidden md:flex items-center gap-3">
              <ThemeToggle className="shrink-0" />
              <Link to="/login" className="px-5 py-2 rounded-full border border-red-600 bg-red-600 text-xs font-bold tracking-wide text-white hover:bg-red-700 hover:border-red-700 transition-colors font-['Open_Sans']">
                ĐĂNG NHẬP
              </Link>
            </div>

            <button className="md:hidden inline-flex items-center justify-center p-2 rounded-lg border border-white/30 bg-black/20 transition-colors duration-300" onClick={() => setIsMobileMenuOpen(v => !v)} aria-label={isMobileMenuOpen ? 'Đóng menu' : 'Mở menu'} aria-expanded={isMobileMenuOpen} aria-controls="mobile-menu">
              <svg className="w-6 h-6 text-red-700 dark:text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMobileMenuOpen ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {}
      {isMobileMenuOpen && <div id="mobile-menu" className="md:hidden border-t border-white/20 bg-black/40 backdrop-blur-md transition-colors duration-300">
          <div className="max-w-7xl mx-auto px-6 py-4 space-y-4">
            <nav className="space-y-2">
              <Link to={`/#${HOME_SECTION_TRANG_CHU}`} onClick={() => {
              scrollToTrangChu();
              setIsMobileMenuOpen(false);
            }} className={navMobileClass('home')}>
                Trang chủ
              </Link>
              <Link to={`/#${HOME_SECTION_NOI_LAM_VIEC}`} onClick={() => {
              scrollToNoiLamViec();
              setIsMobileMenuOpen(false);
            }} className={navMobileClass(null)}>
                Về FINDME
              </Link>
              <Link to="/jobs" onClick={() => setIsMobileMenuOpen(false)} className={navMobileClass('jobs')}>
                Tuyển dụng
              </Link>
              <Link to={`/#${HOME_SECTION_DAI_NGO}`} onClick={() => {
              scrollToDaiNgo();
              setIsMobileMenuOpen(false);
            }} className={navMobileClass('dai-ngo')}>
                Đãi ngộ
              </Link>
              <Link to={`/#${HOME_SECTION_SU_KIEN}`} onClick={() => {
              scrollToSuKien();
              setIsMobileMenuOpen(false);
            }} className={navMobileClass('su-kien')}>
                Sự kiện
              </Link>
            </nav>
            <div className="pt-4 border-t border-red-100 dark:border-red-900/60 space-y-3">
              <div className="grid grid-cols-1 gap-3">
                <Link to="/login" onClick={() => setIsMobileMenuOpen(false)} className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors font-['Open_Sans'] text-center font-semibold">
                  ĐĂNG NHẬP
                </Link>
              </div>
            </div>
          </div>
        </div>}
    </header>;
};
export default Navbar;
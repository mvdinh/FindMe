import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import ThemeToggle from '../../components/common/ThemeToggle';
import NotificationDropdown from '../../components/notifications/NotificationDropdown';
import {
  Briefcase,
  Users,
  Building2,
  LogOut,
  User,
  Settings
} from 'lucide-react';

const findmeLogo = '/logo.png';

const HRSidebarPanel = ({ onNavigate }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const navigationItems = [
    { name: 'Tổng quan', href: '/recruiter/dashboard' },
    { name: 'Tin tuyển dụng', href: '/recruiter/jobs' },
    { name: 'Hồ sơ ứng viên', href: '/recruiter/applications' },
    { name: 'Quản lý tài khoản', href: '/recruiter/profile' }
  ];

  const closeMobile = () => {
    if (typeof onNavigate === 'function') onNavigate();
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    closeMobile();
  };

  const p = location.pathname;
  const profileActive = p === '/recruiter/profile' || p.startsWith('/recruiter/profile');

  const isItemActive = item => {
    if (item.href === '/recruiter/dashboard') return p === '/recruiter/dashboard';
    return p === item.href || (item.href !== '/recruiter/dashboard' && p.startsWith(item.href));
  };

  return (
    <div className="flex h-full min-h-0 flex-col border-border bg-sidebar text-sidebar-foreground">
      <div className="shrink-0 border-b border-border p-4">
        <Link
          to="/recruiter/dashboard"
          onClick={closeMobile}
          className="flex items-start gap-3 rounded-lg p-1 transition-colors hover:bg-sidebar-accent/80"
        >
          <div className="flex-shrink-0 rounded-lg bg-card p-0.5 ring-1 ring-border">
            <img className="h-9 w-auto" src={findmeLogo} alt="findme" />
          </div>
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="font-['Open_Sans'] text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Tuyển dụng doanh nghiệp
            </span>
            <span className="truncate font-['Open_Sans'] text-lg font-bold text-primary">
              FINDME
              <Badge variant="secondary" className="ml-1.5 align-middle text-[9px] font-bold">
                Nhân sự
              </Badge>
            </span>
          </div>
        </Link>
      </div>

      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-3">
        {navigationItems.map(item => {
          const isActive = isItemActive(item);
          return (
            <Button
              key={item.name}
              variant={isActive ? 'default' : 'ghost'}
              className={cn(
                "h-auto min-h-11 w-full touch-manipulation justify-start px-3 py-2.5 font-['Roboto'] text-sm font-semibold",
                !isActive && 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )}
              asChild
            >
              <Link to={item.href} onClick={closeMobile}>
                <span className="truncate">{item.name}</span>
              </Link>
            </Button>
          );
        })}
      </nav>

      <div className="shrink-0 space-y-3 border-t border-border bg-sidebar/50 p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="font-['Roboto'] text-xs text-muted-foreground">Giao diện</span>
          <ThemeToggle className="shrink-0" />
        </div>

        <div className="w-full">
          <NotificationDropdown isSidebar={true} />
        </div>

        <Link
          to="/recruiter/profile"
          onClick={closeMobile}
          className={cn(
            'flex w-full items-center gap-3 rounded-lg border-2 px-2 py-2 text-left transition-all',
            profileActive
              ? 'border-primary/50 bg-sidebar-accent'
              : 'border-transparent hover:border-border'
          )}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted ring-1 ring-border">
            {user?.profilePicture || user?.avatar ? (
              <img
                src={user.profilePicture || user.avatar}
                alt=""
                className="h-full w-full object-cover"
                onError={e => {
                  e.target.style.display = 'none';
                  if (e.target.nextElementSibling) e.target.nextElementSibling.style.display = 'flex';
                }}
              />
            ) : null}
            <div
              className="flex h-full w-full items-center justify-center"
              style={{ display: user?.profilePicture || user?.avatar ? 'none' : 'flex' }}
            >
              {user?.firstName && user?.lastName ? (
                <span className="font-['Roboto'] text-xs font-bold uppercase text-primary">
                  {user.firstName.charAt(0)}
                  {user.lastName.charAt(0)}
                </span>
              ) : (
                <User className="size-5 text-muted-foreground" />
              )}
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-['Open_Sans'] text-sm font-semibold text-foreground">
              {user?.firstName && user?.lastName ? `${user.lastName} ${user.firstName}` : 'Nhân sự tuyển dụng'}
            </p>
            <p className="truncate font-['Roboto'] text-[11px] text-muted-foreground">{user?.email || 'Chưa có thư điện tử'}</p>
          </div>
        </Link>

        <Separator />

        <Button
          type="button"
          variant="outline"
          className="h-auto min-h-11 w-full touch-manipulation gap-2 border-primary/25 py-2.5 font-['Roboto'] text-sm font-semibold text-primary hover:bg-primary/10"
          onClick={handleLogout}
        >
          <LogOut className="size-5 shrink-0" />
          Đăng xuất
        </Button>
      </div>
    </div>
  );
};

export default HRSidebarPanel;

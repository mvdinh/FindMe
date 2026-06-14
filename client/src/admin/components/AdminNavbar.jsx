import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useApiRequest } from "../../hooks/useApiRequest";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import ThemeToggle from "../../components/common/ThemeToggle";
import NotificationDropdown from "../../components/notifications/NotificationDropdown";
import {
  Briefcase,
  Users,
  Building2,
  LogOut,
  User,
  Settings,
} from "lucide-react";

const findmeLogo = "/logo.png";

const AdminNavbarPanel = ({ onNavigate }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { makeJsonRequest } = useApiRequest();

  const [pendingCompanies, setPendingCompanies] = useState(0);
  const [pendingJobRequests, setPendingJobRequests] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const fetchCounts = async () => {
      try {
        const [compRes, reqRes] = await Promise.all([
          makeJsonRequest("/api/admin/companies?status=pending"),
          makeJsonRequest("/api/admin/job-status-requests?limit=1"),
        ]);
        if (!isMounted) return;
        if (compRes?.counts?.pending !== undefined) {
          setPendingCompanies(compRes.counts.pending);
        }
        if (reqRes?.pagination?.totalItems !== undefined) {
          setPendingJobRequests(reqRes.pagination.totalItems);
        }
      } catch (err) {
        console.error("Failed to fetch admin sidebar counts", err);
      }
    };
    fetchCounts();
    // Poll every 30 seconds
    const interval = setInterval(fetchCounts, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const navigationItems = [
    {
      name: "Quản lý Nhà tuyển dụng",
      href: "/admin/companies",
      count: pendingCompanies,
    },
    { name: "Quản lý tin tuyển dụng", href: "/admin/jobs" },
    {
      name: "Duyệt yêu cầu tuyển dụng",
      href: "/admin/job-status-requests",
      count: pendingJobRequests,
    },
  ];

  const closeMobile = () => {
    if (typeof onNavigate === "function") onNavigate();
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
    closeMobile();
  };

  const p = location.pathname;
  const profileActive = p === "/admin" || p === "/admin/companies";

  const isItemActive = (item) => {
    if (item.href === "/admin/companies")
      return p === "/admin" || p === "/admin/companies";
    return (
      p === item.href ||
      (item.href !== "/admin/dashboard" && p.startsWith(item.href))
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col border-border bg-sidebar text-sidebar-foreground">
      <div className="shrink-0 border-b border-border p-4">
        <Link
          to="/admin/companies"
          onClick={closeMobile}
          className="flex items-start gap-3 rounded-lg p-1 transition-colors hover:bg-sidebar-accent/80"
        >
          <div className="flex-shrink-0 rounded-lg bg-card p-0.5 ring-1 ring-border">
            <img className="h-9 w-auto" src={findmeLogo} alt="findme" />
          </div>
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="font-['Open_Sans'] text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Quản trị hệ thống
            </span>
            <span className="truncate font-['Open_Sans'] text-lg font-bold text-primary">
              FINDME
              <Badge
                variant="secondary"
                className="ml-1.5 align-middle text-[9px] font-bold"
              >
                Quản trị
              </Badge>
            </span>
          </div>
        </Link>
      </div>

      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-3">
        {navigationItems.map((item) => {
          const isActive = isItemActive(item);
          return (
            <Button
              key={item.name}
              variant={isActive ? "default" : "ghost"}
              className={cn(
                "h-auto min-h-11 w-full touch-manipulation justify-start px-3 py-2.5 font-['Roboto'] text-sm font-semibold",
                !isActive &&
                  "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
              asChild
            >
              <Link
                to={item.href}
                onClick={closeMobile}
                className="flex flex-1 items-center justify-between min-w-0"
              >
                <span className="truncate">{item.name}</span>
                {item.count > 0 && !isActive && (
                  <span
                    className={cn(
                      "ml-2 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold shrink-0",
                      "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
                    )}
                  >
                    {item.count > 99 ? "99+" : item.count}
                  </span>
                )}
              </Link>
            </Button>
          );
        })}
      </nav>

      <div className="shrink-0 flex flex-col gap-1 border-t border-border bg-sidebar/50 p-3">
        <div className="flex w-full items-center">
          <NotificationDropdown isSidebar={true} />
        </div>

        <Link
          to="/admin/companies"
          onClick={closeMobile}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-all",
            profileActive
              ? "border-primary/50 bg-sidebar-accent"
              : "border-transparent",
          )}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted ring-1 ring-border">
            {user?.profilePicture || user?.avatar ? (
              <img
                src={user.profilePicture || user.avatar}
                alt=""
                className="h-full w-full object-cover"
                onError={(e) => {
                  e.target.style.display = "none";
                  if (e.target.nextElementSibling)
                    e.target.nextElementSibling.style.display = "flex";
                }}
              />
            ) : null}
            <div
              className="flex h-full w-full items-center justify-center"
              style={{
                display: user?.profilePicture || user?.avatar ? "none" : "flex",
              }}
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
              {user?.firstName && user?.lastName
                ? `${user.lastName} ${user.firstName}`
                : "Quản trị viên"}
            </p>
            <p className="truncate font-['Roboto'] text-[11px] text-muted-foreground">
              {user?.email || "Chưa có thư điện tử"}
            </p>
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

export default AdminNavbarPanel;

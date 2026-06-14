import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { useNotifications } from "../../contexts/NotificationsContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NotificationDropdown = ({ isSidebar = false }) => {
  const navigate = useNavigate();
  const { unreadCount, items, markAllRead, markRead } = useNotifications();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {isSidebar ? (
          <button className="relative flex w-full items-center justify-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold border border-border outline-transparent hover:bg-accent hover:text-accent-foreground transition-all data-[state=open]:outline-primary/50 data-[state=open]:bg-accent">
            <div className="relative shrink-0">
              <Bell className="size-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[9px] font-bold text-white ring-2 ring-background">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </div>
            <span
              className={unreadCount > 0 ? "font-bold text-foreground" : ""}
            >
              Thông báo
            </span>
            {unreadCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-100 px-1 text-[10px] font-bold text-red-600">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>
        ) : (
          <button className="relative p-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors focus:outline-none">
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[9px] font-bold text-white ring-2 ring-background">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align={isSidebar ? "start" : "end"}
        side={isSidebar ? "right" : "bottom"}
        sideOffset={8}
        className="w-80 sm:w-[400px] rounded-xl bg-white shadow-2xl p-0 border border-gray-100 z-[100]"
      >
        {/* Header */}
        <div className="px-5 py-3 flex items-center justify-between border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-900 font-['Open_Sans'] text-base">
              Thông báo
            </span>
            {unreadCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={(e) => {
                e.preventDefault();
                markAllRead();
              }}
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold font-['Roboto'] rounded px-2 py-1 hover:bg-blue-50 transition-colors"
            >
              Đánh dấu tất cả đã đọc
            </button>
          )}
        </div>

        {/* List */}
        <div className="max-h-[360px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200">
          {items && items.length > 0 ? (
            items.slice(0, 10).map((notification) => (
              <div
                key={notification._id || notification.id}
                className={`relative px-5 py-4 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer ${
                  !notification.read ? "bg-blue-50/60" : ""
                }`}
                onClick={() => {
                  if (!notification.read)
                    markRead(notification._id || notification.id);
                  const navLink = notification.actionUrl || notification.link;
                  if (navLink) navigate(navLink);
                }}
              >
                {!notification.read && (
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-blue-500" />
                )}
                <p
                  className={`text-sm font-['Roboto'] leading-snug ${
                    !notification.read
                      ? "font-bold text-gray-900"
                      : "font-medium text-gray-700"
                  }`}
                >
                  {notification.title || notification.message}
                </p>
                {notification.title && notification.message && (
                  <p className="text-[13px] text-gray-500 mt-1.5 leading-relaxed line-clamp-3">
                    {notification.message}
                  </p>
                )}
                <p className="text-[11px] text-gray-400 mt-2">
                  {new Date(notification.createdAt).toLocaleDateString("vi-VN")}
                </p>
              </div>
            ))
          ) : (
            <div className="px-5 py-8 text-center text-sm text-gray-500 font-['Roboto']">
              Bạn chưa có thông báo nào.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 text-center bg-gray-50/50 rounded-b-xl">
          <Link
            to="/notifications"
            className="text-sm font-medium text-gray-700 hover:text-red-600 transition-colors"
          >
            Xem tất cả thông báo
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationDropdown;

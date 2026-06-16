import React, { useState, useEffect } from "react";
import HRSidebarPanel from "../components/RecruiterNavbar";
import {
  lockRecruiterBodyScroll,
  unlockRecruiterBodyScroll,
} from "../recruiterBodyScrollLock";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Menu, AlertCircle, Clock } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import RecruiterCompanySetup from "../components/RecruiterCompanySetup";

const RecruiterLayout = ({ children }) => {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const { apiRequest } = useAuth();
  const [company, setCompany] = useState(null);
  const [loadingCompany, setLoadingCompany] = useState(true);
  const navigate = useNavigate();

  const [isSettingUpCompany, setIsSettingUpCompany] = useState(false);

  useEffect(() => {
    fetchCompany();
  }, []);

  const fetchCompany = async (silent = false) => {
    try {
      if (!silent) setLoadingCompany(true);
      const response = await apiRequest("/api/companies/me");
      const data = await response.json();

      if (response.ok && data.success) {
        setCompany(data.data);
      } else {
        setCompany(null);
      }
    } catch (err) {
      console.error("Error fetching company:", err);
      setCompany(null);
    } finally {
      if (!silent) setLoadingCompany(false);
    }
  };

  useEffect(() => {
    if (!mobileDrawerOpen) return undefined;
    lockRecruiterBodyScroll();
    return () => {
      unlockRecruiterBodyScroll();
    };
  }, [mobileDrawerOpen]);

  return (
    <div className="flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-background md:flex-row md:h-screen transition-colors duration-300">
      <header
        className="sticky top-0 z-20 flex h-[3.25rem] min-h-[3.25rem] shrink-0 items-center gap-3 border-b border-border bg-card px-3 pt-[env(safe-area-inset-top,0px)] md:hidden"
        style={{
          paddingLeft: "max(0.75rem, env(safe-area-inset-left, 0px))",
          paddingRight: "max(0.75rem, env(safe-area-inset-right, 0px))",
        }}
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
        <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain focus:outline-none [-webkit-overflow-scrolling:touch] touch-pan-y relative bg-gray-50/30">
          {isSettingUpCompany ? (
            <RecruiterCompanySetup
              onComplete={(newCompany) => {
                setIsSettingUpCompany(false);
                setCompany(newCompany);
                fetchCompany(true);
              }}
            />
          ) : (
            <>
              {(!loadingCompany && !company) || (company && company.verificationStatus !== 'approved') ? (
                <div className="max-w-7xl mx-auto w-full px-3 sm:px-4 md:px-6 lg:px-8 pt-4 sm:pt-6 md:pt-8 pb-0">
                  {!loadingCompany && !company && (
                  <Alert className="mb-4 bg-blue-50 border-blue-200 text-blue-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex gap-3">
                    <AlertCircle className="size-5 text-blue-600 mt-0.5 shrink-0" />
                    <div>
                      <AlertTitle className="text-blue-900 font-bold">
                        Chưa thiết lập doanh nghiệp
                      </AlertTitle>
                      <AlertDescription className="text-blue-800/90 mt-1">
                        Bạn cần cung cấp thông tin và giấy phép kinh doanh để có
                        thể bắt đầu đăng tin tuyển dụng.
                      </AlertDescription>
                    </div>
                  </div>
                  <Button
                    onClick={() => navigate("/recruiter/profile?tab=company")}
                    className="bg-blue-600 hover:bg-blue-700 text-white shrink-0 w-full sm:w-auto"
                  >
                    Thiết lập ngay
                  </Button>
                </Alert>
              )}

              {company?.verificationStatus === "pending" && (
                <Alert className="mb-4 bg-amber-50 border-amber-200 text-amber-800">
                  <Clock className="size-4 text-amber-600" />
                  <AlertTitle>Đang chờ duyệt doanh nghiệp</AlertTitle>
                  <AlertDescription>
                    Doanh nghiệp của bạn đang được quản trị viên xét duyệt. Bạn
                    chưa thể đăng tin tuyển dụng trong thời gian này.
                  </AlertDescription>
                </Alert>
              )}

              {company?.verificationStatus === "rejected" && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="size-4" />
                  <AlertTitle>Đăng ký doanh nghiệp bị từ chối</AlertTitle>
                  <AlertDescription>
                    Lý do: {company.rejectionReason} <br />
                    Vui lòng vào{" "}
                    <a
                      href="/recruiter/profile"
                      className="font-bold underline"
                    >
                      Quản lý tài khoản → Thông tin doanh nghiệp
                    </a>{" "}
                    để chỉnh sửa và gửi lại.
                  </AlertDescription>
                </Alert>
              )}

              {company?.verificationStatus === "locked" && (
                <Alert className="mb-4 bg-red-50 border-red-300 text-red-900">
                  <AlertCircle className="size-4 text-red-600" />
                  <AlertTitle className="text-red-900 font-bold">
                    Tài khoản doanh nghiệp bị khóa
                  </AlertTitle>
                  <AlertDescription className="text-red-800">
                    Lý do: {company.lockReason || "Vi phạm quy định hệ thống"}{" "}
                    <br />
                    Bạn không thể đăng tin tuyển dụng mới. Vui lòng vào{" "}
                    <a
                      href="/recruiter/profile"
                      className="font-bold underline"
                    >
                      Quản lý tài khoản → Thông tin doanh nghiệp
                    </a>{" "}
                    để gửi yêu cầu mở khóa.
                  </AlertDescription>
                </Alert>
              )}

                </div>
              ) : null}

              {children}
            </>
          )}
        </main>
        <footer
          className="shrink-0 border-t border-border bg-card px-3 py-2.5 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] transition-colors duration-300 sm:px-4"
          style={{
            paddingLeft: "max(0.75rem, env(safe-area-inset-left, 0px))",
            paddingRight: "max(0.75rem, env(safe-area-inset-right, 0px))",
          }}
        >
          <p className="text-center font-['Roboto'] text-[11px] text-muted-foreground sm:text-xs">
            <span className="font-semibold text-primary">findme</span>
            <span className="mx-2 text-border">|</span>©{" "}
            {new Date().getFullYear()} · Bảo lưu mọi quyền
          </p>
        </footer>
      </div>

      <Sheet open={mobileDrawerOpen} onOpenChange={setMobileDrawerOpen}>
        <SheetContent
          side="left"
          showCloseButton
          className="flex h-[100dvh] max-h-[100dvh] w-[min(100%,20rem)] flex-col gap-0 overflow-hidden border-r border-border bg-card p-0 data-[side=left]:sm:max-w-[20rem]"
          style={{
            paddingTop: "env(safe-area-inset-top, 0px)",
            paddingBottom: "env(safe-area-inset-bottom, 0px)",
            paddingLeft: "env(safe-area-inset-left, 0px)",
          }}
        >
          <HRSidebarPanel onNavigate={() => setMobileDrawerOpen(false)} />
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default RecruiterLayout;

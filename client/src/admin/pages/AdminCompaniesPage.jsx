import React, { useState, useEffect } from "react";
import AdminLayout from "../layout/AdminLayout";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Building2,
  CheckCircle2,
  XCircle,
  Clock,
  Lock,
  Unlock,
  Eye,
  AlertTriangle,
  Search,
  MapPin,
  Mail,
  Phone,
  Globe,
  Briefcase,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import ConfirmDialog from "@/components/common/ConfirmDialog";

const STATUS_TABS = [
  { key: "", label: "Tất cả" },
  { key: "pending", label: "Chờ duyệt", color: "text-amber-600" },
  { key: "approved", label: "Đã phê duyệt", color: "text-emerald-600" },
  { key: "rejected", label: "Bị từ chối", color: "text-red-600" },
  { key: "locked", label: "Bị khóa", color: "text-red-600" },
];

const statusBadge = (status) => {
  const map = {
    pending: {
      label: "Chờ duyệt",
      cls: "bg-amber-100 text-amber-800 border-amber-200",
    },
    approved: {
      label: "Đã phê duyệt",
      cls: "bg-emerald-100 text-emerald-800 border-emerald-200",
    },
    rejected: {
      label: "Bị từ chối",
      cls: "bg-red-100 text-red-800 border-red-200",
    },
    locked: {
      label: "Bị khóa",
      cls: "bg-red-100 text-red-800 border-red-200",
    },
  };
  const m = map[status] || {
    label: status,
    cls: "bg-muted text-muted-foreground",
  };
  return (
    <Badge variant="outline" className={`${m.cls} font-['Roboto'] text-xs`}>
      {m.label}
    </Badge>
  );
};

const AdminCompaniesPage = () => {
  const { apiRequest } = useAuth();
  const toast = useToast();
  const [companies, setCompanies] = useState([]);
  const [counts, setCounts] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    locked: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Dialogs
  const [rejectDialog, setRejectDialog] = useState({
    open: false,
    companyId: null,
    reason: "",
  });
  const [lockDialog, setLockDialog] = useState({
    open: false,
    companyId: null,
    reason: "",
  });
  const [detailDialog, setDetailDialog] = useState({
    open: false,
    company: null,
  });
  const [confirmApprove, setConfirmApprove] = useState(null);
  const [confirmUnlock, setConfirmUnlock] = useState(null);

  useEffect(() => {
    fetchCompanies();
  }, [activeTab]);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      setError(null);
      const url = activeTab
        ? `/api/admin/companies?status=${activeTab}`
        : "/api/admin/companies";
      const response = await apiRequest(url);
      const data = await response.json();

      if (data.success) {
        setCompanies(data.data);
        if (data.counts) setCounts(data.counts);
      } else {
        setError(data.message || "Không thể tải danh sách công ty");
      }
    } catch (err) {
      console.error("Error fetching companies:", err);
      setError("Đã có lỗi xảy ra. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (companyId) => {
    try {
      const response = await apiRequest(
        `/api/admin/companies/${companyId}/approve`,
        { method: "PUT" },
      );
      const data = await response.json();
      if (data.success) {
        toast.success("Đã duyệt doanh nghiệp thành công!");
        fetchCompanies();
      } else {
        toast.error(data.message || "Có lỗi xảy ra");
      }
    } catch (err) {
      toast.error("Đã có lỗi xảy ra");
    }
    setConfirmApprove(null);
  };

  const handleRejectSubmit = async () => {
    if (!rejectDialog.reason.trim()) {
      toast.error("Vui lòng nhập lý do từ chối");
      return;
    }
    try {
      const response = await apiRequest(
        `/api/admin/companies/${rejectDialog.companyId}/reject`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rejectionReason: rejectDialog.reason }),
        },
      );
      const data = await response.json();
      if (data.success) {
        toast.success("Đã từ chối doanh nghiệp.");
        setRejectDialog({ open: false, companyId: null, reason: "" });
        fetchCompanies();
      } else {
        toast.error(data.message || "Có lỗi xảy ra");
      }
    } catch (err) {
      toast.error("Đã có lỗi xảy ra");
    }
  };

  const handleLockSubmit = async () => {
    if (!lockDialog.reason.trim()) {
      toast.error("Vui lòng nhập lý do khóa");
      return;
    }
    try {
      const response = await apiRequest(
        `/api/admin/companies/${lockDialog.companyId}/lock`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lockReason: lockDialog.reason }),
        },
      );
      const data = await response.json();
      if (data.success) {
        toast.success(
          "Đã khóa doanh nghiệp. Tất cả tin tuyển dụng đang hiển thị đã bị ẩn.",
        );
        setLockDialog({ open: false, companyId: null, reason: "" });
        fetchCompanies();
      } else {
        toast.error(data.message || "Có lỗi xảy ra");
      }
    } catch (err) {
      toast.error("Đã có lỗi xảy ra");
    }
  };

  const handleUnlock = async (companyId) => {
    try {
      const response = await apiRequest(
        `/api/admin/companies/${companyId}/unlock`,
        { method: "PUT" },
      );
      const data = await response.json();
      if (data.success) {
        toast.success("Đã mở khóa doanh nghiệp.");
        fetchCompanies();
      } else {
        toast.error(data.message || "Có lỗi xảy ra");
      }
    } catch (err) {
      toast.error("Đã có lỗi xảy ra");
    }
    setConfirmUnlock(null);
  };

  const viewDetail = async (companyId) => {
    try {
      const response = await apiRequest(`/api/admin/companies/${companyId}`);
      const data = await response.json();
      if (data.success) {
        setDetailDialog({ open: true, company: data.data });
      }
    } catch (err) {
      toast.error("Không thể tải chi tiết doanh nghiệp");
    }
  };

  const totalAll =
    counts.pending + counts.approved + counts.rejected + counts.locked;

  const filteredCompanies = companies.filter(
    (c) =>
      c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.taxCode?.includes(searchQuery) ||
      c.email?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold font-['Open_Sans']">
            Quản lý Doanh Nghiệp
          </h1>
          <p className="text-muted-foreground mt-1">
            Duyệt, khóa và quản lý tất cả doanh nghiệp trên hệ thống
          </p>
        </div>

        {/* Tabs & Search */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-4">
          <div className="flex flex-wrap gap-2">
            {STATUS_TABS.map((tab) => (
              <Button
                key={tab.key}
                variant={activeTab === tab.key ? "default" : "outline"}
                size="sm"
                className="font-['Roboto'] gap-2"
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
                <Badge
                  variant="secondary"
                  className="ml-1 text-[10px] px-1.5 py-0 font-bold"
                >
                  {tab.key === "" ? totalAll : counts[tab.key] || 0}
                </Badge>
              </Button>
            ))}
          </div>
          <div className="relative w-full md:w-72 shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Tìm theo tên công ty, MST, Email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 font-['Roboto'] bg-white shadow-sm"
            />
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-6 flex items-start gap-4">
                  <Skeleton className="h-16 w-16 rounded-lg" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-5 w-1/4" />
                    <Skeleton className="h-4 w-1/3" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredCompanies.length > 0 ? (
          <div className="space-y-4">
            {filteredCompanies.map((company) => (
              <Card
                key={company._id}
                className="overflow-hidden hover:shadow-md transition-shadow"
              >
                <CardContent className="p-5">
                  <div className="flex flex-col md:flex-row gap-4">
                    {/* Logo + Info */}
                    <div className="flex-1 flex items-start gap-4">
                      <div className="h-16 w-16 shrink-0 rounded-lg border bg-muted/50 flex items-center justify-center overflow-hidden">
                        {company.logo ? (
                          <img
                            src={company.logo}
                            alt={company.name}
                            className="max-h-full max-w-full object-contain"
                          />
                        ) : (
                          <Building2 className="size-8 text-muted-foreground/50" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-3 flex-wrap">
                          <h3 className="font-bold text-lg font-['Open_Sans'] truncate">
                            {company.name}
                          </h3>
                          {statusBadge(company.verificationStatus)}
                          {company.jobRejectionCount > 0 && (
                            <Badge
                              variant="outline"
                              className="text-xs border-orange-300 text-orange-700 bg-orange-50"
                            >
                              <AlertTriangle className="size-3 mr-1" />{" "}
                              {company.jobRejectionCount} tin bị từ chối
                            </Badge>
                          )}
                          {company.unlockRequestedAt &&
                            company.verificationStatus === "locked" && (
                              <Badge
                                variant="outline"
                                className="text-xs border-blue-300 text-blue-700 bg-blue-50 animate-pulse"
                              >
                                Yêu cầu mở khóa
                              </Badge>
                            )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm text-muted-foreground">
                          <div>
                            <span className="font-medium text-foreground">
                              MST:
                            </span>{" "}
                            {company.taxCode || "N/A"}
                          </div>
                          <div>
                            <span className="font-medium text-foreground">
                              Lĩnh vực:
                            </span>{" "}
                            {company.industry || "N/A"}
                          </div>
                          <div>
                            <span className="font-medium text-foreground">
                              Người đại diện:
                            </span>{" "}
                            {company.createdBy?.lastName}{" "}
                            {company.createdBy?.firstName}
                          </div>
                          <div>
                            <span className="font-medium text-foreground">
                              Địa chỉ:
                            </span>{" "}
                            {company.address || "N/A"}
                          </div>
                        </div>
                        {company.verificationStatus === "rejected" &&
                          company.rejectionReason && (
                            <p className="text-xs text-red-600 mt-1">
                              Lý do từ chối: {company.rejectionReason}
                            </p>
                          )}
                        {company.verificationStatus === "locked" &&
                          company.lockReason && (
                            <p className="text-xs text-gray-600 mt-1">
                              Lý do khóa: {company.lockReason}
                            </p>
                          )}
                        {company.unlockRequestMessage &&
                          company.verificationStatus === "locked" && (
                            <p className="text-xs text-blue-600 mt-1 italic">
                              Lời nhắn mở khóa: "{company.unlockRequestMessage}"
                            </p>
                          )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="shrink-0 flex flex-row md:flex-col gap-2 justify-end md:justify-center border-t md:border-t-0 md:border-l pt-3 md:pt-0 md:pl-4 border-border">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-xs"
                        onClick={() => viewDetail(company._id)}
                      >
                        <Eye className="size-3.5" /> Chi tiết
                      </Button>

                      {company.verificationStatus === "pending" && (
                        <>
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 gap-1.5 text-xs"
                            onClick={() => setConfirmApprove(company._id)}
                          >
                            <CheckCircle2 className="size-3.5" /> Duyệt
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="gap-1.5 text-xs"
                            onClick={() =>
                              setRejectDialog({
                                open: true,
                                companyId: company._id,
                                reason: "",
                              })
                            }
                          >
                            <XCircle className="size-3.5" /> Từ chối
                          </Button>
                        </>
                      )}

                      {company.verificationStatus === "approved" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 text-xs text-red-600 hover:bg-red-50"
                          onClick={() =>
                            setLockDialog({
                              open: true,
                              companyId: company._id,
                              reason: "",
                            })
                          }
                        >
                          <Lock className="size-3.5" /> Khóa
                        </Button>
                      )}

                      {company.verificationStatus === "locked" && (
                        <Button
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700 gap-1.5 text-xs"
                          onClick={() => setConfirmUnlock(company._id)}
                        >
                          <Unlock className="size-3.5" /> Mở khóa
                        </Button>
                      )}

                      {company.verificationStatus === "rejected" && (
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 gap-1.5 text-xs"
                          onClick={() => setConfirmApprove(company._id)}
                        >
                          <CheckCircle2 className="size-3.5" /> Duyệt lại
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="bg-muted/30 border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Building2 className="size-16 text-muted-foreground/30 mb-4" />
              <h3 className="text-xl font-medium text-foreground mb-2">
                Không tìm thấy doanh nghiệp nào
              </h3>
              <p className="text-muted-foreground">
                Vui lòng thử tìm kiếm với từ khóa khác hoặc thay đổi bộ lọc
                trạng thái.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog
        open={rejectDialog.open}
        onOpenChange={(open) =>
          !open && setRejectDialog({ ...rejectDialog, open: false })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Từ chối doanh nghiệp</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Vui lòng cung cấp lý do từ chối để Nhà tuyển dụng có thể cập nhật
              lại thông tin:
            </p>
            <Textarea
              placeholder="Ví dụ: Giấy phép kinh doanh không hợp lệ, Mã số thuế không đúng..."
              value={rejectDialog.reason}
              onChange={(e) =>
                setRejectDialog({ ...rejectDialog, reason: e.target.value })
              }
              className="min-h-[100px]"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectDialog({ ...rejectDialog, open: false })}
            >
              Hủy
            </Button>
            <Button variant="destructive" onClick={handleRejectSubmit}>
              Xác nhận từ chối
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lock Dialog */}
      <Dialog
        open={lockDialog.open}
        onOpenChange={(open) =>
          !open && setLockDialog({ ...lockDialog, open: false })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Khóa doanh nghiệp</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Alert className="bg-amber-50 border-amber-200">
              <AlertTriangle className="size-4 text-amber-600" />
              <AlertDescription className="text-amber-800 text-sm">
                Khi bị khóa, doanh nghiệp sẽ không thể đăng tin mới và tất cả
                tin đang hiển thị sẽ bị ẩn khỏi hệ thống.
              </AlertDescription>
            </Alert>
            <Textarea
              placeholder="Nhập lý do khóa doanh nghiệp..."
              value={lockDialog.reason}
              onChange={(e) =>
                setLockDialog({ ...lockDialog, reason: e.target.value })
              }
              className="min-h-[100px]"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setLockDialog({ ...lockDialog, open: false })}
            >
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={handleLockSubmit}
              className="gap-2"
            >
              <Lock className="size-4" /> Xác nhận khóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog
        open={detailDialog.open}
        onOpenChange={(open) =>
          !open && setDetailDialog({ ...detailDialog, open: false })
        }
      >
        <DialogContent className="sm:max-w-5xl md:max-w-6xl max-h-[90vh] overflow-hidden flex flex-col p-0 border-0 shadow-2xl">
          <div className="px-6 py-5 border-b flex-shrink-0 bg-muted/10">
            <DialogHeader>
              <DialogTitle className="text-xl font-['Open_Sans'] text-foreground">
                Hồ sơ Doanh nghiệp
              </DialogTitle>
            </DialogHeader>
          </div>

          {detailDialog.company && (
            <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-background">
              {/* Header Profile */}
              <div className="flex flex-col md:flex-row items-start gap-6">
                <div className="h-28 w-28 shrink-0 rounded-xl border bg-white shadow-sm flex items-center justify-center overflow-hidden p-2">
                  {detailDialog.company.logo ? (
                    <img
                      src={detailDialog.company.logo}
                      alt=""
                      className="max-h-full object-contain"
                    />
                  ) : (
                    <Building2 className="size-12 text-muted-foreground/40" />
                  )}
                </div>
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-2xl font-bold font-['Open_Sans']">
                      {detailDialog.company.name}
                    </h3>
                    {statusBadge(detailDialog.company.verificationStatus)}
                  </div>
                  <div className="text-sm text-muted-foreground flex flex-wrap items-center gap-x-5 gap-y-2 font-['Roboto'] mt-2">
                    <span className="flex items-center gap-1.5">
                      <Briefcase className="size-4 text-primary" />{" "}
                      {detailDialog.company.industry ||
                        "Chưa cập nhật lĩnh vực"}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="font-semibold text-foreground/70">
                        Quy mô:
                      </span>{" "}
                      {detailDialog.company.size || "N/A"}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="font-semibold text-foreground/70">
                        MST:
                      </span>{" "}
                      <span className="font-medium text-foreground">
                        {detailDialog.company.taxCode || "N/A"}
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                {/* Left Column: Contact & Info */}
                <div className="space-y-6">
                  <div className="space-y-4">
                    <h4 className="font-semibold text-xs uppercase tracking-widest text-muted-foreground font-['Roboto'] border-b pb-2">
                      Thông tin liên hệ
                    </h4>
                    <div className="space-y-3 text-sm font-['Roboto']">
                      <div className="flex items-start gap-3">
                        <MapPin className="size-4 mt-0.5 text-muted-foreground shrink-0" />
                        <span className="leading-relaxed">
                          {detailDialog.company.address ||
                            "Chưa cập nhật địa chỉ"}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Phone className="size-4 text-muted-foreground shrink-0" />
                        <span>
                          {detailDialog.company.phone || "Chưa cập nhật SĐT"}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Mail className="size-4 text-muted-foreground shrink-0" />
                        <span>
                          {detailDialog.company.email || "Chưa cập nhật Email"}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Globe className="size-4 text-muted-foreground shrink-0" />
                        {detailDialog.company.website ? (
                          <a
                            href={detailDialog.company.website}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary font-medium hover:underline truncate"
                          >
                            {detailDialog.company.website}
                          </a>
                        ) : (
                          <span className="text-muted-foreground">
                            Chưa có website
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {detailDialog.company.createdBy && (
                    <div className="bg-primary/5 p-4 rounded-xl border border-primary/10">
                      <h4 className="font-semibold text-xs mb-3 uppercase tracking-widest text-primary/70 font-['Roboto']">
                        Người đại diện
                      </h4>
                      <div className="text-sm">
                        <p className="font-medium text-foreground">
                          {detailDialog.company.createdBy.lastName}{" "}
                          {detailDialog.company.createdBy.firstName}
                        </p>
                        <p className="text-muted-foreground mt-1 flex items-center gap-1.5">
                          <Mail className="size-3.5" />
                          {detailDialog.company.createdBy.email}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    <h4 className="font-semibold text-xs uppercase tracking-widest text-muted-foreground font-['Roboto'] border-b pb-2">
                      Tổng quan
                    </h4>
                    <p className="text-sm text-foreground/80 leading-relaxed font-['Roboto'] whitespace-pre-wrap">
                      {detailDialog.company.description ||
                        "Chưa có mô tả chi tiết về doanh nghiệp."}
                    </p>
                  </div>
                </div>

                {/* Right Column: Files & Stats */}
                <div className="space-y-6">
                  <div className="space-y-4">
                    <h4 className="font-semibold text-xs uppercase tracking-widest text-muted-foreground font-['Roboto'] border-b pb-2">
                      Giấy phép kinh doanh
                    </h4>
                    {detailDialog.company.businessLicenseFile ? (
                      <div className="rounded-xl overflow-hidden border bg-muted/10 shadow-sm">
                        {detailDialog.company.businessLicenseFile.startsWith(
                          "data:image",
                        ) ||
                        detailDialog.company.businessLicenseFile.match(
                          /\.(jpeg|jpg|gif|png)$/i,
                        ) != null ? (
                          <div className="relative group">
                            <img
                              src={detailDialog.company.businessLicenseFile}
                              alt="Giấy phép KD"
                              className="w-full object-cover max-h-[200px]"
                            />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <a
                                href={detailDialog.company.businessLicenseFile}
                                target="_blank"
                                rel="noreferrer"
                                className="text-white text-sm font-medium hover:underline flex items-center gap-2 px-4 py-2 rounded-full border border-white/30 backdrop-blur-sm"
                              >
                                <Eye className="size-4" /> Xem toàn màn hình
                              </a>
                            </div>
                          </div>
                        ) : detailDialog.company.businessLicenseFile.startsWith(
                            "data:application/pdf",
                          ) ||
                          detailDialog.company.businessLicenseFile.match(
                            /\.pdf$/i,
                          ) != null ? (
                          <div className="p-6 flex flex-col items-center justify-center text-center gap-3">
                            <div className="size-12 rounded-full bg-red-100 flex items-center justify-center">
                              <span className="text-red-600 font-bold text-xs">
                                PDF
                              </span>
                            </div>
                            <a
                              href={detailDialog.company.businessLicenseFile}
                              download="giay_phep_kd.pdf"
                              className="text-primary font-medium hover:underline text-sm font-['Roboto']"
                            >
                              Tải xuống Giấy phép (PDF)
                            </a>
                          </div>
                        ) : (
                          <div className="p-4 text-center">
                            <a
                              href={detailDialog.company.businessLicenseFile}
                              target="_blank"
                              rel="noreferrer"
                              className="text-primary font-medium hover:underline text-sm font-['Roboto']"
                            >
                              📄 Xem file đính kèm
                            </a>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-6 rounded-xl border border-dashed bg-muted/30 text-center text-muted-foreground text-sm font-['Roboto'] flex flex-col items-center gap-2">
                        <AlertTriangle className="size-8 text-muted-foreground/40" />
                        Chưa cập nhật giấy phép
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl border bg-card shadow-sm text-center">
                      <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider font-['Roboto']">
                        Tin tuyển dụng
                      </p>
                      <p className="text-3xl font-bold text-primary mt-2 font-['Open_Sans']">
                        {detailDialog.company.jobs?.length || 0}
                      </p>
                    </div>
                    <div className="p-4 rounded-xl border bg-destructive/5 border-destructive/20 text-center">
                      <p className="text-xs text-destructive/80 font-semibold uppercase tracking-wider font-['Roboto']">
                        Tin bị từ chối
                      </p>
                      <p className="text-3xl font-bold text-destructive mt-2 font-['Open_Sans']">
                        {detailDialog.company.jobRejectionCount || 0}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm Dialogs */}
      <ConfirmDialog
        open={confirmApprove !== null}
        onClose={() => setConfirmApprove(null)}
        onConfirm={() => handleApprove(confirmApprove)}
        title="Duyệt doanh nghiệp"
        confirmLabel="Xác nhận"
        description="Bạn có chắc chắn muốn duyệt doanh nghiệp này? Nhà tuyển dụng sẽ được phép đăng tin tuyển dụng."
      />
      <ConfirmDialog
        open={confirmUnlock !== null}
        onClose={() => setConfirmUnlock(null)}
        onConfirm={() => handleUnlock(confirmUnlock)}
        title="Mở khóa doanh nghiệp"
        description="Bạn có chắc chắn muốn mở khóa doanh nghiệp này? Nhà tuyển dụng sẽ được hoạt động bình thường trở lại."
      />
    </AdminLayout>
  );
};

export default AdminCompaniesPage;

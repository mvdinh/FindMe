import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import AdminLayout from "../layout/AdminLayout";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Calendar,
  Briefcase,
  MapPin,
  Clock,
  Banknote,
  GraduationCap,
  Users,
  CheckCircle2,
  XCircle,
  FileText,
  UserCircle,
  Building2,
} from "lucide-react";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { formatDateVN } from "@/utils/dateFormat";

const AdminJobDetailsPage = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { apiRequest } = useAuth();
  const toast = useToast();

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmStatus, setConfirmStatus] = useState(null);

  useEffect(() => {
    fetchJobDetail();
  }, [jobId]);

  const fetchJobDetail = async () => {
    try {
      setLoading(true);
      const res = await apiRequest(`/api/admin/jobs/${jobId}`);
      const data = await res.json();
      if (data.job) {
        setJob(data.job);
      } else {
        toast.error("Không tìm thấy tin tuyển dụng");
      }
    } catch (err) {
      console.error(err);
      toast.error("Không thể tải chi tiết tin tuyển dụng");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (status) => {
    try {
      setActionLoading(true);
      const res = await apiRequest(`/api/admin/jobs/${jobId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.job) {
        toast.success(
          `Đã cập nhật trạng thái thành ${status === "active" ? "Đang hoạt động" : "Đã đóng"}`,
        );
        setJob((prev) => ({ ...prev, status: data.job.status }));
      } else {
        toast.error(data.error || "Cập nhật thất bại");
      }
    } catch (err) {
      toast.error("Đã có lỗi xảy ra");
    } finally {
      setActionLoading(false);
      setConfirmStatus(null);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "active":
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
            Đang hoạt động
          </Badge>
        );
      case "closed":
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200">
            Đã đóng
          </Badge>
        );
      case "draft":
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-200">
            Bản nháp
          </Badge>
        );
      case "pending_approval":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
            Chờ phê duyệt
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-slate-100 text-slate-800 border-slate-200">
            Bị từ chối
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-32 w-full" />
          <div className="grid grid-cols-3 gap-6">
            <Skeleton className="h-64 col-span-2" />
            <Skeleton className="h-64 col-span-1" />
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!job) {
    return (
      <AdminLayout>
        <div className="p-8 text-center">
          <h2 className="text-xl font-semibold">Không tìm thấy dữ liệu</h2>
          <Button variant="link" onClick={() => navigate("/admin/jobs")}>
            Quay lại danh sách
          </Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6 font-['Roboto']">
        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            className="gap-2"
            onClick={() => navigate("/admin/jobs")}
          >
            <ArrowLeft className="size-4" /> Quay lại
          </Button>
          <div className="flex gap-2">
            {job.status !== "active" && (
              <Button
                onClick={() => setConfirmStatus("active")}
                disabled={actionLoading}
                className="bg-emerald-600 hover:bg-emerald-700 gap-2"
              >
                <CheckCircle2 className="size-4" /> Duyệt / Kích hoạt
              </Button>
            )}
            {job.status === "active" && (
              <Button
                onClick={() => setConfirmStatus("closed")}
                disabled={actionLoading}
                variant="destructive"
                className="gap-2"
              >
                <XCircle className="size-4" /> Đóng tin
              </Button>
            )}
          </div>
        </div>

        {/* Header Title */}
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between bg-white p-6 rounded-xl border shadow-sm">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold font-['Open_Sans'] text-slate-900">
                {job.title}
              </h1>
              {getStatusBadge(job.status)}
            </div>
            <p className="text-slate-500 flex items-center gap-2">
              <Building2 className="size-4" />{" "}
              {job.company?.name || "Chưa cập nhật công ty"}
            </p>
          </div>
          <div className="flex flex-col gap-1 text-sm text-slate-600 border-l pl-4 border-slate-200">
            <span className="flex items-center gap-2">
              <UserCircle className="size-4" /> <strong>HR:</strong>{" "}
              {job.postedBy}
            </span>
            <span className="flex items-center gap-2">
              <Calendar className="size-4" /> <strong>Ngày đăng:</strong>{" "}
              {formatDateVN(job.createdAt)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="size-5 text-primary" /> Chi tiết công
                  việc
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-y-4 text-sm">
                  <div>
                    <span className="text-slate-500 block mb-1">Mức lương</span>
                    <span className="font-semibold text-emerald-600">
                      {job.salaryRange?.min ? job.salaryRange.min : ""}
                      {job.salaryRange?.min && job.salaryRange?.max
                        ? " - "
                        : ""}
                      {job.salaryRange?.max ? job.salaryRange.max : ""}
                      {job.salaryRange?.currency
                        ? ` ${job.salaryRange.currency}`
                        : ""}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-1">
                      Hạn nộp hồ sơ
                    </span>
                    <span className="font-medium">
                      {formatDateVN(job.applicationDeadline) || "Không có"}
                    </span>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-2">Địa điểm làm việc</h3>
                  <p className="text-sm text-slate-700 flex gap-2">
                    <MapPin className="size-4 mt-0.5 text-slate-400" />{" "}
                    {job.location || "Chưa cập nhật"}
                  </p>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-2">Mô tả công việc</h3>
                  <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed bg-slate-50 p-4 rounded-lg">
                    {job.description || "Chưa có mô tả"}
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-2">Yêu cầu công việc</h3>
                  <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed bg-slate-50 p-4 rounded-lg">
                    {job.requirements || "Chưa có yêu cầu"}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="size-5 text-primary" /> Thống kê ứng tuyển
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-slate-50 p-4 rounded-lg text-center">
                    <div className="text-3xl font-bold text-primary">
                      {job.applicationStats?.total || 0}
                    </div>
                    <div className="text-sm text-slate-500 mt-1">
                      Tổng hồ sơ
                    </div>
                  </div>

                  <div className="space-y-2 border-t pt-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Đã mời phỏng vấn</span>
                      <span className="font-medium">
                        {job.applicationStats?.interviewScheduled || 0}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Đạt phỏng vấn</span>
                      <span className="font-medium text-emerald-600">
                        {job.applicationStats?.interviewPassed || 0}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Kỹ năng yêu cầu</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {job.skills && job.skills.length > 0 ? (
                    job.skills.map((skill, i) => (
                      <Badge
                        key={i}
                        variant="secondary"
                        className="font-normal"
                      >
                        {skill}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-slate-500">
                      Không có yêu cầu kỹ năng cụ thể
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmStatus !== null}
        onClose={() => setConfirmStatus(null)}
        title={
          confirmStatus === "active"
            ? "Xác nhận duyệt tin"
            : "Xác nhận đóng tin"
        }
        description={
          confirmStatus === "active"
            ? "Bạn có chắc chắn muốn duyệt và hiển thị tin tuyển dụng này cho ứng viên?"
            : "Bạn có chắc chắn muốn đóng tin tuyển dụng này? Ứng viên sẽ không thể nộp hồ sơ mới."
        }
        onConfirm={() => handleUpdateStatus(confirmStatus)}
      />
    </AdminLayout>
  );
};

export default AdminJobDetailsPage;

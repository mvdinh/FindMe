import React, { useState, useEffect, useCallback } from "react";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Eye,
  Lock,
  LockOpen,
  Loader2,
} from "lucide-react";
import AdminLayout from "../layout/AdminLayout";
import AdminModal from "../components/AdminModal";
import Pagination from "@/components/common/Pagination";
import {
  ADMIN_PAGE,
  ADMIN_PAGE_HEADER,
  ADMIN_H1,
  ADMIN_SUBTITLE,
  ADMIN_NATIVE_FIELD,
  HR_TABLE_WRAP,
} from "../adminLayoutClasses";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useApiRequest } from "../../hooks/useApiRequest";
import { useAuth } from "../../contexts/AuthContext";
import { formatDateTimeVN } from "@/utils/dateFormat";

const ROLE_LABEL = {
  applicant: "Ứng viên",
  recruiter: "Nhà tuyển dụng",
  admin: "Quản trị",
};

const STATUS_LABEL = {
  pending_verification: "Chờ xác minh",
  active: "Hoạt động",
  suspended: "Tạm khóa",
  inactive: "Không hoạt động",
};

const nativeField =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-input/30 font-['Roboto']";

const AdminAccountsPage = () => {
  const { makeJsonRequest } = useApiRequest();
  const { user: authUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    totalItems: 0,
    limit: 20,
  });
  const [viewing, setViewing] = useState(null);
  const [busyUserId, setBusyUserId] = useState(null);

  const buildQuery = useCallback(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(limit));
    if (search.trim()) params.set("search", search.trim());
    if (roleFilter) params.set("role", roleFilter);
    if (statusFilter) params.set("accountStatus", statusFilter);
    if (activeFilter === "true" || activeFilter === "false")
      params.set("isActive", activeFilter);
    return `?${params.toString()}`;
  }, [page, limit, search, roleFilter, statusFilter, activeFilter]);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await makeJsonRequest(`/api/admin/users${buildQuery()}`);
      if (res?.success && Array.isArray(res.data)) {
        setUsers(res.data);
        if (res.pagination) setPagination(res.pagination);
      } else {
        setUsers([]);
      }
    } catch (e) {
      console.error(e);
      setError(e.message || "Không tải được danh sách tài khoản.");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [makeJsonRequest, buildQuery]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const closeView = () => {
    setViewing(null);
  };

  const openView = async (row) => {
    setViewing({ id: row.id, skeleton: true });
    try {
      const res = await makeJsonRequest(`/api/admin/users/${row.id}`);
      if (res?.success && res.data) {
        setViewing(res.data);
      } else {
        setViewing(null);
      }
    } catch (e) {
      console.error(e);
      setViewing(null);
      setError(e.message || "Không tải được chi tiết.");
    }
  };

  const toggleLoginActive = async (row) => {
    const next = row.isActive === false;
    const self = authUser?.id && String(authUser.id) === String(row.id);
    if (self && !next) return;
    setBusyUserId(String(row.id));
    setError(null);
    try {
      await makeJsonRequest(`/api/admin/users/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: next }),
      });
      await loadUsers();
    } catch (e) {
      setError(
        e.response?.data?.message || e.message || "Không cập nhật được.",
      );
    } finally {
      setBusyUserId(null);
    }
  };

  return (
    <AdminLayout>
      <div className={ADMIN_PAGE}>
        <div className={ADMIN_PAGE_HEADER}>
          <div className="min-w-0 flex-1">
            <h1 className={ADMIN_H1}>Quản lý tài khoản</h1>
            <p className={ADMIN_SUBTITLE}>
              Xem danh sách Nhà tuyển dụng và ứng viên trong phạm vi được phép; bật/tắt đăng
              nhập khi cần (không quản lý tài khoản quản trị).
            </p>
          </div>
        </div>

        <Card className="mb-6 shadow-sm">
          <CardContent className="flex flex-col flex-wrap gap-3 p-4 lg:flex-row lg:items-end">
            <div className="min-w-[200px] flex-1 space-y-2">
              <Label className="font-['Roboto'] text-xs">Tìm kiếm</Label>
              <Input
                type="search"
                value={search}
                onChange={(e) => {
                  setPage(1);
                  setSearch(e.target.value);
                }}
                placeholder="Email, tên, SĐT..."
                className="font-['Roboto']"
              />
            </div>
            <div className="w-full space-y-2 sm:w-40">
              <Label className="font-['Roboto'] text-xs">Vai trò</Label>
              <select
                value={roleFilter}
                onChange={(e) => {
                  setPage(1);
                  setRoleFilter(e.target.value);
                }}
                className={ADMIN_NATIVE_FIELD}
              >
                <option value="">Tất cả</option>
                <option value="applicant">Ứng viên</option>
                <option value="recruiter">Nhà tuyển dụng</option>
              </select>
            </div>
            <div className="w-full space-y-2 sm:w-44">
              <Label className="font-['Roboto'] text-xs">Trạng thái TK</Label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setPage(1);
                  setStatusFilter(e.target.value);
                }}
                className={ADMIN_NATIVE_FIELD}
              >
                <option value="">Tất cả</option>
                <option value="pending_verification">Chờ xác minh</option>
                <option value="active">Hoạt động</option>
                <option value="suspended">Tạm khóa</option>
                <option value="inactive">Không hoạt động</option>
              </select>
            </div>
            <div className="w-full space-y-2 sm:w-40">
              <Label className="font-['Roboto'] text-xs">Kích hoạt</Label>
              <select
                value={activeFilter}
                onChange={(e) => {
                  setPage(1);
                  setActiveFilter(e.target.value);
                }}
                className={ADMIN_NATIVE_FIELD}
              >
                <option value="">Tất cả</option>
                <option value="true">Đang bật</option>
                <option value="false">Đang tắt</option>
              </select>
            </div>
            <Button
              type="button"
              className="font-['Roboto']"
              onClick={() => loadUsers()}
            >
              Làm mới
            </Button>
          </CardContent>
        </Card>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle />
            <AlertTitle>Lỗi</AlertTitle>
            <AlertDescription className="font-['Roboto']">
              {error}
            </AlertDescription>
          </Alert>
        )}

        <Card className="overflow-hidden shadow-sm">
          {loading ? (
            <div className="space-y-2 p-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className={HR_TABLE_WRAP}>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    {[
                      "STT",
                      "Họ tên",
                      "Email",
                      "Vai trò",
                      "Trạng thái",
                      "Thao tác",
                    ].map((h, i) => (
                      <TableHead
                        key={h}
                        className={cn(
                          "px-4 py-3 text-xs font-semibold uppercase tracking-wider font-['Roboto'] text-muted-foreground",
                          i === 0 && "w-12 text-center",
                        )}
                      >
                        {h}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.length === 0 ? (
                    <TableRow className="hover:bg-transparent">
                      <TableCell
                        colSpan={6}
                        className="px-4 py-12 text-center text-sm text-muted-foreground font-['Roboto']"
                      >
                        Không có tài khoản phù hợp.
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((row, index) => (
                      <TableRow key={row.id}>
                        <TableCell className="px-4 py-3 text-center font-['Roboto'] text-sm tabular-nums text-muted-foreground">
                          {(page - 1) * limit + index + 1}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-sm font-['Roboto']">
                          {row.firstName} {row.lastName}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-sm font-['Roboto'] text-muted-foreground">
                          {row.email}
                        </TableCell>
                        <TableCell className="px-4 py-3 font-['Roboto']">
                          <Badge
                            variant="secondary"
                            className="font-['Roboto'] font-normal"
                          >
                            {ROLE_LABEL[row.role] || row.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-4 py-3 font-['Roboto'] whitespace-normal">
                          <div className="flex flex-col gap-1">
                            <Badge
                              variant="outline"
                              className={cn(
                                "font-normal w-fit",
                                row.accountStatus === "active"
                                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
                                  : row.accountStatus === "inactive" ||
                                      row.accountStatus === "suspended"
                                    ? "border-destructive/30 bg-destructive/10 text-destructive"
                                    : "border-border bg-muted text-muted-foreground",
                              )}
                            >
                              {STATUS_LABEL[row.accountStatus] ||
                                row.accountStatus}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon-sm"
                              title="Xem chi tiết"
                              aria-label="Xem chi tiết"
                              onClick={() => openView(row)}
                              disabled={!!busyUserId}
                            >
                              <Eye className="size-4" strokeWidth={2} />
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon-sm"
                              className={
                                row.isActive !== false
                                  ? "border-amber-200 text-amber-700 dark:border-amber-800 dark:text-amber-400"
                                  : "border-emerald-200 text-emerald-700 dark:border-emerald-800 dark:text-emerald-400"
                              }
                              title={
                                row.isActive !== false
                                  ? "Vô hiệu hóa đăng nhập"
                                  : "Kích hoạt đăng nhập"
                              }
                              aria-label={
                                row.isActive !== false
                                  ? "Vô hiệu hóa đăng nhập"
                                  : "Kích hoạt đăng nhập"
                              }
                              onClick={() => toggleLoginActive(row)}
                              disabled={
                                !!busyUserId ||
                                (authUser?.id &&
                                  String(authUser.id) === String(row.id) &&
                                  row.isActive !== false)
                              }
                            >
                              {busyUserId === String(row.id) ? (
                                <Loader2
                                  className="size-4 animate-spin"
                                  strokeWidth={2}
                                />
                              ) : row.isActive !== false ? (
                                <Lock className="size-4" strokeWidth={2} />
                              ) : (
                                <LockOpen className="size-4" strokeWidth={2} />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={(p) => setPage(p)}
            loading={loading}
            totalItems={pagination.totalItems}
            limit={pagination.limit || limit}
            itemLabel="tài khoản"
          />
        </Card>
      </div>

      <AdminModal
        open={!!viewing}
        onClose={closeView}
        title="Chi tiết tài khoản"
        subtitle={viewing && !viewing.skeleton ? viewing.email : undefined}
        size="md"
        footer={
          <div className="flex justify-end">
            <Button
              type="button"
              className="px-5 py-2.5 text-sm"
              onClick={closeView}
            >
              Đóng
            </Button>
          </div>
        }
      >
        {viewing?.skeleton ? (
          <div className="flex justify-center py-12">
            <Loader2
              className="h-8 w-8 animate-spin text-primary"
              strokeWidth={2}
            />
          </div>
        ) : viewing ? (
          <div className="space-y-3 font-['Roboto'] text-sm">
            <dl className="grid grid-cols-2 gap-x-3 gap-y-2">
              <dt className="text-muted-foreground">Họ tên</dt>
              <dd className="text-foreground">
                {viewing.firstName} {viewing.lastName}
              </dd>
              <dt className="text-muted-foreground">Vai trò</dt>
              <dd className="text-foreground">
                {ROLE_LABEL[viewing.role] || viewing.role}
              </dd>
              <dt className="text-muted-foreground">Điện thoại</dt>
              <dd className="text-foreground">{viewing.phone || "—"}</dd>
              <dt className="text-muted-foreground">Trạng thái TK</dt>
              <dd className="text-foreground">
                {STATUS_LABEL[viewing.accountStatus] || viewing.accountStatus}
              </dd>
              <dt className="text-muted-foreground">Đăng nhập</dt>
              <dd className="text-foreground">
                {viewing.isActive !== false ? "Đang bật" : "Đã tắt"}
              </dd>
            </dl>
          </div>
        ) : null}
      </AdminModal>
    </AdminLayout>
  );
};

export default AdminAccountsPage;

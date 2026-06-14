import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import AdminLayout from "../layout/AdminLayout";
import AdminModal from "../components/AdminModal";
import {
  ADMIN_PAGE,
  ADMIN_PAGE_HEADER,
  ADMIN_H1,
  ADMIN_SUBTITLE,
  HR_TABLE_WRAP,
} from "../adminLayoutClasses";
import Pagination from "@/components/common/Pagination";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useApiRequest } from "../../hooks/useApiRequest";
import { formatDateTimeVN } from "@/utils/dateFormat";
import { AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const statusVi = {
  active: "Đang hoạt động",
  closed: "Đã đóng",
  draft: "Chờ phê duyệt",
};

const JobStatusRequestsPage = () => {
  const navigate = useNavigate();
  const { makeJsonRequest } = useApiRequest();
  const [items, setItems] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    limit: 20,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionId, setActionId] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectNote, setRejectNote] = useState("");

  const pageLimit = pagination.limit || 20;
  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const qs = new URLSearchParams({
        page: String(currentPage),
        limit: "20",
      }).toString();
      const res = await makeJsonRequest(`/api/admin/job-status-requests?${qs}`);
      if (res.success) {
        const rows = Array.isArray(res.data) ? res.data : [];
        setItems(rows);
        if (res.pagination) {
          const p = res.pagination;
          setPagination({
            currentPage: p.currentPage ?? currentPage,
            totalPages: Math.max(1, p.totalPages ?? 1),
            totalItems: p.totalItems ?? rows.length,
            limit: p.limit ?? 20,
            hasNextPage: !!p.hasNextPage,
            hasPrevPage: !!p.hasPrevPage,
          });
        }
      } else {
        setError(res.message || "Không tải được danh sách");
      }
    } catch {
      setError("Không tải được danh sách yêu cầu");
    } finally {
      setLoading(false);
    }
  }, [makeJsonRequest, currentPage]);

  useEffect(() => {
    load();
  }, [load]);

  const approve = async (id) => {
    try {
      setActionId(id);
      setError(null);
      const res = await makeJsonRequest(
        `/api/admin/job-status-requests/${id}/approve`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        },
      );
      if (res.success) {
        await load();
      } else {
        setError(res.message || "Duyệt thất bại");
      }
    } catch (e) {
      setError(e?.message || "Duyệt thất bại");
    } finally {
      setActionId(null);
    }
  };

  const openReject = (row) => {
    setRejectModal(row);
    setRejectNote("");
  };

  const submitReject = async () => {
    if (!rejectModal?.id) return;
    const note = rejectNote.trim();
    if (note.length < 5) {
      setError("Lý do từ chối cần tối thiểu 5 ký tự.");
      return;
    }
    try {
      setActionId(rejectModal.id);
      setError(null);
      const res = await makeJsonRequest(
        `/api/admin/job-status-requests/${rejectModal.id}/reject`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reviewNote: note }),
        },
      );
      if (res.success) {
        setRejectModal(null);
        setRejectNote("");
        await load();
      } else {
        setError(res.message || "Từ chối thất bại");
      }
    } catch (e) {
      setError(e?.message || "Từ chối thất bại");
    } finally {
      setActionId(null);
    }
  };

  return (
    <AdminLayout>
      <div className={ADMIN_PAGE}>
        <div className={ADMIN_PAGE_HEADER}>
          <div className="min-w-0 flex-1">
            <h1 className={ADMIN_H1}>Kiểm duyệt tin tuyển dụng</h1>
            <p className={ADMIN_SUBTITLE}>
              Kiểm duyệt tin tuyển dụng của các doanh nghiệp
            </p>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle />
            <AlertTitle>Lỗi</AlertTitle>
            <AlertDescription className="flex flex-wrap items-center gap-2">
              {error}
              <Button
                type="button"
                variant="link"
                className="h-auto p-0 text-destructive"
                onClick={() => setError(null)}
              >
                Đóng
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {loading ? (
          <Card>
            <CardContent className="space-y-3 pt-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </CardContent>
          </Card>
        ) : pagination.totalItems === 0 ? (
          <Card>
            <CardContent className="py-12 text-center font-['Roboto'] text-sm text-muted-foreground">
              Không có yêu cầu nào đang chờ duyệt.
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-sm">
            <CardContent className="p-0">
              <div className={HR_TABLE_WRAP}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 text-center font-['Roboto']">
                        STT
                      </TableHead>
                      <TableHead className="font-['Roboto']">
                        Nhà tuyển dụng
                      </TableHead>
                      <TableHead className="font-['Roboto']">
                        Tin tuyển dụng
                      </TableHead>
                      <TableHead className="font-['Roboto']">
                        Ngày tạo yêu cầu
                      </TableHead>
                      <TableHead className="text-right font-['Roboto']">
                        Thao tác
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((row, index) => (
                      <TableRow
                        key={row.id}
                        className="cursor-pointer hover:bg-muted/50 transition-colors group"
                        title="Xem chi tiết việc làm"
                        onClick={() => navigate(`/admin/jobs/${row.jobId}`)}
                      >
                        <TableCell className="text-center font-['Roboto'] text-sm tabular-nums text-muted-foreground">
                          {index + 1}
                        </TableCell>
                        <TableCell className="font-['Roboto']">
                          <div className="font-medium">
                            {row.companyName || row.requestedByName || "—"}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[200px] font-['Roboto']">
                          <div className="truncate font-medium">
                            {row.jobTitle}
                          </div>
                        </TableCell>
                        <TableCell className="font-['Roboto']">
                          <div className="text-sm">
                            {row.createdAt
                              ? formatDateTimeVN(row.createdAt)
                              : ""}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            size="sm"
                            className="mr-2 bg-emerald-600 text-white hover:bg-emerald-700"
                            disabled={actionId === row.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              approve(row.id);
                            }}
                          >
                            {actionId === row.id ? "..." : "Duyệt"}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            disabled={actionId === row.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              openReject(row);
                            }}
                          >
                            Từ chối
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <Pagination
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                onPageChange={(p) => setCurrentPage(p)}
                loading={loading}
                totalItems={pagination.totalItems}
                limit={pageLimit}
                itemLabel="yêu cầu"
              />
            </CardContent>
          </Card>
        )}
      </div>

      <AdminModal
        open={!!rejectModal}
        onClose={() => !actionId && setRejectModal(null)}
        title="Từ chối yêu cầu"
        subtitle={rejectModal?.jobTitle}
        size="md"
        closeOnBackdrop={!actionId}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={!!actionId}
              onClick={() => setRejectModal(null)}
            >
              Hủy
            </Button>
            <Button
              type="button"
              disabled={!!actionId || rejectNote.trim().length < 5}
              onClick={submitReject}
            >
              {actionId ? "Đang gửi..." : "Xác nhận từ chối"}
            </Button>
          </div>
        }
      >
        <div className="space-y-2">
          <Label htmlFor="reject-note" className="font-['Roboto']">
            Lý do từ chối
          </Label>
          <Textarea
            id="reject-note"
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            rows={4}
            placeholder="Tối thiểu 5 ký tự"
            className="font-['Roboto']"
          />
        </div>
      </AdminModal>
    </AdminLayout>
  );
};

export default JobStatusRequestsPage;

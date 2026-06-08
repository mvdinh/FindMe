import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../layout/AdminLayout';
import AdminModal from '../components/AdminModal';
import { ADMIN_PAGE, ADMIN_PAGE_HEADER, ADMIN_H1, ADMIN_SUBTITLE, HR_TABLE_WRAP } from '../adminLayoutClasses';
import Pagination from '@/components/common/Pagination';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useApiRequest } from '../../hooks/useApiRequest';
import { formatDateVN } from '../adminDateFormat';
import { AlertCircle, ChevronLeft, ChevronRight, Copy, Eye, EyeOff, KeyRound, Pencil, Trash2, UserCheck, UserX } from 'lucide-react';
import { cn } from '@/lib/utils';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { useToast } from '@/contexts/ToastContext';
const HRManagementPage = () => {
  const toast = useToast();
  const [hrToDelete, setHrToDelete] = useState(null);
  const {
    makeJsonRequest
  } = useApiRequest();
  const [hrs, setHrs] = useState([]);
  const [hrPage, setHrPage] = useState(1);
  const [hrPagination, setHrPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    limit: 20,
    hasNextPage: false,
    hasPrevPage: false
  });
  const [hrSummary, setHrSummary] = useState({
    activeHR: 0,
    totalJobsPosted: 0,
    interviewScheduled: 0,
    interviewPassed: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingHR, setEditingHR] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [newHR, setNewHR] = useState({
    firstName: '',
    lastName: '',
    email: '',
    department: '',
    customDepartment: '',
    password: ''
  });
  const departmentOptions = ['Nhân sự', 'Kỹ thuật', 'Marketing', 'Kinh doanh', 'Tài chính', 'Vận hành', 'Chăm sóc khách hàng', 'Quản lý sản phẩm', 'Đảm bảo chất lượng', 'Nghiên cứu & Phát triển'];
  const loadHRUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const qs = new URLSearchParams({
        page: String(hrPage),
        limit: '20'
      });
      const response = await makeJsonRequest(`/api/admin/hr?${qs}`);
      if (Array.isArray(response)) {
        setHrs(response);
        setHrPagination(prev => ({
          ...prev,
          totalItems: response.length,
          totalPages: 1
        }));
      } else if (response?.success && Array.isArray(response.data)) {
        setHrs(response.data);
        if (response.pagination) {
          const p = response.pagination;
          setHrPagination({
            currentPage: p.currentPage ?? hrPage,
            totalPages: Math.max(1, p.totalPages ?? 1),
            totalItems: p.totalItems ?? response.data.length,
            limit: p.limit ?? 20,
            hasNextPage: !!p.hasNextPage,
            hasPrevPage: !!p.hasPrevPage
          });
        }
        if (response.summary) {
          setHrSummary({
            activeHR: response.summary.activeHR ?? 0,
            totalJobsPosted: response.summary.totalJobsPosted ?? 0,
            interviewScheduled: response.summary.interviewScheduled ?? 0,
            interviewPassed: response.summary.interviewPassed ?? 0
          });
        }
      } else {
        setHrs([]);
      }
    } catch (error) {
      console.error('Error loading HR users:', error);
      setError('Không thể tải danh sách HR. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, [makeJsonRequest, hrPage]);

  useEffect(() => {
    loadHRUsers();
  }, [loadHRUsers]);
  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };
  const handleGeneratePassword = () => {
    const generatedPassword = generatePassword();
    setNewHR({
      ...newHR,
      password: generatedPassword
    });
  };
  const handleCopyPassword = () => {
    if (newHR.password) {
      navigator.clipboard.writeText(newHR.password);
      toast.success('Đã sao chép mật khẩu vào bộ nhớ tạm!');
    }
  };
  const handleAddHR = async () => {
    const department = newHR.department === 'custom' ? newHR.customDepartment : newHR.department;
    if (newHR.firstName && newHR.lastName && newHR.email && department && newHR.password) {
      try {
        setSubmitting(true);
        setError(null);
        const response = await makeJsonRequest('/api/admin/hr', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            firstName: newHR.firstName,
            lastName: newHR.lastName,
            email: newHR.email,
            department: department,
            password: newHR.password
          })
        });
        if (response && response.hr) {
          await loadHRUsers();
          setNewHR({
            firstName: '',
            lastName: '',
            email: '',
            department: '',
            customDepartment: '',
            password: ''
          });
          setShowAddModal(false);
          setShowPassword(false);
          toast.success('Đã tạo tài khoản HR thành công!');
        }
      } catch (error) {
        console.error('Error creating HR user:', error);
        toast.error(error.message || 'Không thể tạo tài khoản HR. Vui lòng thử lại.');
      } finally {
        setSubmitting(false);
      }
    } else {
      console.error('Validation Error: Please fill in all required fields including first name, last name, email, department and password');
    }
  };
  const handleEditHR = hr => {
    setEditingHR(hr);
    const isCustomDepartment = !departmentOptions.includes(hr.department);
    const nameParts = hr.name.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    setNewHR({
      firstName: firstName,
      lastName: lastName,
      email: hr.email,
      department: isCustomDepartment ? 'custom' : hr.department,
      customDepartment: isCustomDepartment ? hr.department : '',
      password: ''
    });
    setShowAddModal(true);
  };
  const handleUpdateHR = async () => {
    const department = newHR.department === 'custom' ? newHR.customDepartment : newHR.department;
    if (newHR.firstName && newHR.lastName && department && editingHR) {
      try {
        setSubmitting(true);
        setError(null);
        const updateData = {
          firstName: newHR.firstName,
          lastName: newHR.lastName,
          department: department
        };
        const response = await makeJsonRequest(`/api/admin/hr/${editingHR.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updateData)
        });
        if (response && response.hr) {
          setHrs(hrs.map(hr => hr.id === editingHR.id ? response.hr : hr));
          setEditingHR(null);
          setNewHR({
            firstName: '',
            lastName: '',
            email: '',
            department: '',
            customDepartment: '',
            password: ''
          });
          setShowAddModal(false);
          setShowPassword(false);
          toast.success('Đã cập nhật thông tin HR thành công!');
        }
      } catch (error) {
        console.error('Error updating HR user:', error);
        toast.error(error.message || 'Không thể cập nhật tài khoản HR. Vui lòng thử lại.');
      } finally {
        setSubmitting(false);
      }
    } else {
      console.error('Validation Error: Please fill in all required fields (first name, last name, department)');
    }
  };
  const handleRemoveHR = async hrId => {
    setHrToDelete(hrId);
  };
  const confirmDeleteHR = async () => {
    if (!hrToDelete) return;
    try {
      setError(null);
      await makeJsonRequest(`/api/admin/hr/${hrToDelete}`, {
        method: 'DELETE'
      });
      await loadHRUsers();
      toast.success('Đã xóa tài khoản HR thành công!');
    } catch (error) {
      console.error('Error removing HR user:', error);
      toast.error(error.message || 'Không thể xóa tài khoản HR. Vui lòng thử lại.');
    } finally {
      setHrToDelete(null);
    }
  };
  const handleToggleStatus = async hrId => {
    try {
      setError(null);
      const hr = hrs.find(h => h.id === hrId);
      const newStatus = hr.status === 'active' ? 'inactive' : 'active';
      const response = await makeJsonRequest(`/api/admin/hr/${hrId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: newStatus
        })
      });
      if (response && response.hr) {
        const safeHr = {
          ...response.hr,
          jobsPosted: Number(response.hr.jobsPosted) || 0,
          interviewScheduled: Number(response.hr.interviewScheduled) || 0,
          interviewPassed: Number(response.hr.interviewPassed) || 0
        };
        setHrs(hrs.map(hr => hr.id === hrId ? safeHr : hr));
        toast.success(newStatus === 'active' ? 'Đã kích hoạt tài khoản HR!' : 'Đã vô hiệu hóa tài khoản HR!');
      }
    } catch (error) {
      console.error('Error toggling HR status:', error);
      toast.error(error.message || 'Không thể cập nhật trạng thái HR. Vui lòng thử lại.');
    }
  };
  const closeModal = () => {
    setShowAddModal(false);
    setEditingHR(null);
    setNewHR({
      firstName: '',
      lastName: '',
      email: '',
      department: '',
      customDepartment: '',
      password: ''
    });
    setShowPassword(false);
    setError(null);
  };
  const activeHRs = hrSummary.activeHR;
  const totalJobsPosted = hrSummary.totalJobsPosted;
  const totalInterviewScheduled = hrSummary.interviewScheduled;
  const totalInterviewPassed = hrSummary.interviewPassed;
  const hrPageLimit = hrPagination.limit || 20;
  return <AdminLayout>
      <div className={ADMIN_PAGE}>
        <div className={ADMIN_PAGE_HEADER}>
          <div className="min-w-0 flex-1">
            <h1 className={ADMIN_H1}>Quản lý HR</h1>
            <p className={ADMIN_SUBTITLE}>Quản lý thành viên HR trong tổ chức của bạn.</p>
          </div>
          <Button type="button" size="sm" className="inline-flex shrink-0 gap-2" onClick={() => setShowAddModal(true)}>
            <svg className="h-5 w-5 shrink-0 stroke-current" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Thêm HR
          </Button>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle />
            <AlertTitle>Lỗi</AlertTitle>
            <AlertDescription className="font-['Roboto']">{error}</AlertDescription>
          </Alert>
        )}
        {loading ? (
          <>
            <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-4">
              {Array.from({ length: 4 }).map((_, idx) => (
                <Card key={idx}>
                  <CardContent className="flex items-center gap-4 pt-6">
                    <Skeleton className="size-12 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-6 w-16" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Card>
              <CardContent className="space-y-2 pt-6">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
              <Card>
                <CardContent className="flex items-center gap-4 pt-6">
                  <div className="rounded-lg bg-blue-500/10 p-3 ring-1 ring-blue-500/20">
                    <UserCheck className="size-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-['Roboto'] text-sm font-medium text-muted-foreground">HR đang hoạt động</p>
                    <p className="font-['Open_Sans'] text-2xl font-bold text-foreground">{activeHRs}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center gap-4 pt-6">
                  <div className="rounded-lg bg-primary/10 p-3 ring-1 ring-primary/20">
                    <svg className="size-6 stroke-current text-primary" fill="none" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2V6" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-['Roboto'] text-sm font-medium text-muted-foreground">Tổng việc làm đã đăng</p>
                    <p className="font-['Open_Sans'] text-2xl font-bold text-foreground">{totalJobsPosted}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center gap-4 pt-6">
                  <div className="rounded-lg bg-amber-500/10 p-3 ring-1 ring-amber-500/20">
                    <svg className="size-6 stroke-current text-amber-600" fill="none" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-['Roboto'] text-sm font-medium text-muted-foreground">Đã lên lịch phỏng vấn</p>
                    <p className="font-['Open_Sans'] text-2xl font-bold text-foreground">{totalInterviewScheduled}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center gap-4 pt-6">
                  <div className="rounded-lg bg-emerald-500/10 p-3 ring-1 ring-emerald-500/20">
                    <svg className="size-6 stroke-current text-emerald-600" fill="none" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-['Roboto'] text-sm font-medium text-muted-foreground">Ứng viên pass phỏng vấn</p>
                    <p className="font-['Open_Sans'] text-2xl font-bold text-foreground">{totalInterviewPassed}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
            <Card className="overflow-hidden">
              <CardHeader className="border-b">
                <CardTitle className="font-['Open_Sans'] text-lg">Thành viên HR ({hrs.length})</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className={HR_TABLE_WRAP}>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12 text-center font-['Roboto']">STT</TableHead>
                        <TableHead className="font-['Roboto']">Thông tin HR</TableHead>
                        <TableHead className="font-['Roboto']">Trạng thái</TableHead>
                        <TableHead className="font-['Roboto']">Hiệu suất</TableHead>
                        <TableHead className="font-['Roboto']">Ngày tham gia</TableHead>
                        <TableHead className="text-right font-['Roboto']">Thao tác</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {hrs.map((hr, index) => (
                        <TableRow key={hr.id}>
                          <TableCell className="text-center font-['Roboto'] text-sm tabular-nums text-muted-foreground">
                            {(hrPage - 1) * hrPageLimit + index + 1}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="flex size-10 items-center justify-center rounded-full bg-muted font-['Open_Sans'] text-sm font-medium text-foreground">
                                {hr.name.split(' ').map(n => n[0]).join('')}
                              </div>
                              <div>
                                <div className="font-['Open_Sans'] text-sm font-medium text-foreground">{hr.name}</div>
                                <div className="font-['Roboto'] text-sm text-muted-foreground">{hr.email}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={cn(
                                "font-['Roboto'] font-normal",
                                hr.status === 'active'
                                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
                                  : 'border-destructive/30 bg-destructive/10 text-destructive'
                              )}
                            >
                              {hr.status === 'active' ? 'đang hoạt động' : 'không hoạt động'}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-['Roboto'] text-sm text-foreground">
                            <div className="space-y-0.5">
                              <div>{hr.jobsPosted} việc làm đã đăng</div>
                              <div className="text-muted-foreground">{hr.interviewScheduled ?? 0} đã lên lịch</div>
                              <div className="text-muted-foreground">{hr.interviewPassed ?? 0} pass phỏng vấn</div>
                            </div>
                          </TableCell>
                          <TableCell className="font-['Roboto'] text-sm text-muted-foreground">{formatDateVN(hr.dateJoined) || '—'}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button type="button" variant="outline" size="icon-sm" title="Chỉnh sửa HR" aria-label="Chỉnh sửa HR" onClick={() => handleEditHR(hr)}>
                                <Pencil className="size-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon-sm"
                                title={hr.status === 'active' ? 'Vô hiệu hóa HR' : 'Kích hoạt HR'}
                                aria-label={hr.status === 'active' ? 'Vô hiệu hóa HR' : 'Kích hoạt HR'}
                                className={hr.status === 'active' ? 'text-emerald-600' : ''}
                                onClick={() => handleToggleStatus(hr.id)}
                              >
                                {hr.status === 'active' ? <UserX className="size-4" /> : <UserCheck className="size-4" />}
                              </Button>
                              <Button type="button" variant="outline" size="icon-sm" title="Xóa HR" aria-label="Xóa HR" className="text-destructive" onClick={() => handleRemoveHR(hr.id)}>
                                <Trash2 className="size-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <Pagination
                  currentPage={hrPagination.currentPage}
                  totalPages={hrPagination.totalPages}
                  onPageChange={(p) => setHrPage(p)}
                  loading={loading}
                  totalItems={hrPagination.totalItems}
                  limit={hrPageLimit}
                  itemLabel="HR"
                />
              </CardContent>
            </Card>
          </>
        )}

        <AdminModal
          open={showAddModal}
          onClose={closeModal}
          title={editingHR ? 'Chỉnh sửa HR' : 'Thêm HR mới'}
          size="lg"
          footer={
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={closeModal}>
                Hủy
              </Button>
              <Button
                type="button"
                onClick={editingHR ? handleUpdateHR : handleAddHR}
                disabled={
                  submitting ||
                  !newHR.firstName ||
                  !newHR.lastName ||
                  !newHR.email ||
                  (newHR.department === 'custom' ? !newHR.customDepartment : !newHR.department) ||
                  (!editingHR && !newHR.password)
                }
              >
                {submitting ? (editingHR ? 'Đang cập nhật...' : 'Đang thêm...') : editingHR ? 'Cập nhật HR' : 'Thêm HR'}
              </Button>
            </div>
          }
        >
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle />
              <AlertDescription className="font-['Roboto']">{error}</AlertDescription>
            </Alert>
          )}

          <fieldset disabled={submitting} className="space-y-4 min-w-0 border-0 p-0 m-0 disabled:opacity-[0.9]">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="hr-first" className="font-['Roboto']">
                  Tên
                </Label>
                <Input
                  id="hr-first"
                  value={newHR.firstName}
                  onChange={e => setNewHR({ ...newHR, firstName: e.target.value })}
                  className="h-10 rounded-full font-['Roboto']"
                  placeholder="Nhập tên"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hr-last" className="font-['Roboto']">
                  Họ
                </Label>
                <Input
                  id="hr-last"
                  value={newHR.lastName}
                  onChange={e => setNewHR({ ...newHR, lastName: e.target.value })}
                  className="h-10 rounded-full font-['Roboto']"
                  placeholder="Nhập họ"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hr-email" className="font-['Roboto']">
                Địa chỉ email
              </Label>
              <Input
                id="hr-email"
                type="email"
                value={newHR.email}
                readOnly={!!editingHR}
                onChange={e => setNewHR({ ...newHR, email: e.target.value })}
                className={
                  editingHR
                    ? "h-10 cursor-not-allowed rounded-full bg-muted font-['Roboto'] text-muted-foreground"
                    : "h-10 rounded-full font-['Roboto']"
                }
                placeholder="Nhập địa chỉ email"
                autoComplete="off"
              />
              {editingHR && (
                <p className="font-['Roboto'] text-xs text-muted-foreground">Email không thể đổi sau khi tạo tài khoản.</p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="font-['Roboto']">Phòng ban</Label>
              <div className="space-y-3">
                <Select
                  value={newHR.department || '__none'}
                  onValueChange={v =>
                    setNewHR({
                      ...newHR,
                      department: v === '__none' ? '' : v,
                      customDepartment: v === 'custom' ? newHR.customDepartment : ''
                    })
                  }
                >
                  <SelectTrigger className="h-10 w-full rounded-full font-['Roboto']">
                    <SelectValue placeholder="Chọn phòng ban" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">Chọn phòng ban</SelectItem>
                    {departmentOptions.map(dept => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">Khác (ghi rõ bên dưới)</SelectItem>
                  </SelectContent>
                </Select>

                {newHR.department === 'custom' && (
                  <Input
                    value={newHR.customDepartment}
                    onChange={e => setNewHR({ ...newHR, customDepartment: e.target.value })}
                    className="h-10 rounded-full font-['Roboto']"
                    placeholder="Nhập tên phòng ban"
                  />
                )}
              </div>
            </div>

            {!editingHR && (
              <div className="space-y-2">
                <Label htmlFor="hr-password" className="font-['Roboto']">
                  Mật khẩu
                </Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="hr-password"
                      type={showPassword ? 'text' : 'password'}
                      value={newHR.password}
                      onChange={e => setNewHR({ ...newHR, password: e.target.value })}
                      className="h-10 rounded-full pr-12 font-['Roboto']"
                      placeholder="Nhập mật khẩu"
                      autoComplete="new-password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="absolute right-1 top-1/2 -translate-y-1/2"
                      onClick={() => setShowPassword(!showPassword)}
                      title={showPassword ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </Button>
                  </div>
                  <Button type="button" variant="secondary" size="icon" className="size-10 shrink-0 rounded-full" onClick={handleGeneratePassword} title="Tạo mật khẩu an toàn">
                    <KeyRound className="size-4" />
                  </Button>
                  {newHR.password && (
                    <Button type="button" variant="secondary" size="icon" className="size-10 shrink-0 rounded-full" onClick={handleCopyPassword} title="Sao chép mật khẩu">
                      <Copy className="size-4" />
                    </Button>
                  )}
                </div>
                {newHR.password && (
                  <p className="font-['Roboto'] text-xs text-muted-foreground">
                    Độ mạnh mật khẩu:{' '}
                    <span className="font-medium text-foreground">{newHR.password.length >= 8 ? 'Mạnh' : 'Yếu'}</span>
                  </p>
                )}
              </div>
            )}
          </fieldset>
        </AdminModal>

        <ConfirmDialog
          open={hrToDelete !== null}
          onClose={() => setHrToDelete(null)}
          onConfirm={confirmDeleteHR}
          title="Xóa tài khoản HR"
          description="Bạn có chắc chắn muốn xóa tài khoản HR này không? Hành động này không thể hoàn tác."
        />
      </div>
    </AdminLayout>;
};
export default HRManagementPage;




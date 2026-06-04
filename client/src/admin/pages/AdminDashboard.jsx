import React, { useState, useEffect, useMemo, useRef, useCallback, useId } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';
import AdminLayout from '../layout/AdminLayout';
import { ADMIN_PAGE, ADMIN_PAGE_HEADER, ADMIN_H1, ADMIN_SUBTITLE } from '../adminLayoutClasses';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useApiRequest } from '../../hooks/useApiRequest';
import { smartCacheSet, isStorageAvailable } from '../../utils/cacheManager';

const COLORS = {
  apps: '#EE0000',
  scheduled: '#f87171',
  passed: '#b91c1c'
};

const formatMonthShort = monthKey => {
  if (monthKey == null) return '';
  const s = String(monthKey);
  const iso = s.slice(0, 7);
  const parts = iso.split('-').filter(Boolean);
  if (parts.length >= 2) {
    const y = parts[0];
    const m = parts[1];
    return `Thg ${parseInt(m, 10)}/${y.slice(-2)}`;
  }
  return s;
};

function AdminChartTooltip({ active, payload, showInterviewScheduled, showInterviewPassed }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  return (
    <div className="rounded-xl border border-border bg-popover px-3 py-2.5 text-xs text-popover-foreground shadow-md">
      <p className="mb-2 font-semibold text-foreground font-['Open_Sans']">{row.label}</p>
      <div className="space-y-1 font-['Roboto'] text-muted-foreground">
        <div>
          Hồ sơ nộp:{' '}
          <span className="font-semibold text-primary">{row.applications}</span>
        </div>
        {showInterviewScheduled && (
          <div>
            Đã mời phỏng vấn:{' '}
            <span className="font-semibold" style={{ color: COLORS.scheduled }}>
              {row.interviewScheduled}
            </span>
          </div>
        )}
        {showInterviewPassed && (
          <div>
            Pass phỏng vấn:{' '}
            <span className="font-semibold" style={{ color: COLORS.passed }}>
              {row.interviewPassed}
            </span>
          </div>
        )}
        <div>
          Ứng viên được chọn:{' '}
          <span className="font-semibold text-foreground">{row.selected}</span>
        </div>
      </div>
    </div>
  );
}

function AdminTrendChart({ trend, loading, showInterviewScheduled, showInterviewPassed }) {
  const gradId = useId().replace(/:/g, '');
  const chartData = useMemo(
    () =>
      trend.map(t => ({
        label: formatMonthShort(t.month),
        applications: Number(t.applications) || 0,
        selected: Number(t.selected) || 0,
        interviewScheduled: Number(t.interviewScheduled) || 0,
        interviewPassed: Number(t.interviewPassed) || 0
      })),
    [trend]
  );

  if (loading && chartData.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center rounded-xl border border-border bg-muted/30">
        <Loader2 className="size-9 animate-spin text-primary" strokeWidth={2} />
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="flex h-[300px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/30 text-center">
        <p className="font-['Roboto'] text-sm font-medium text-muted-foreground">Chưa có dữ liệu theo tháng</p>
        <p className="font-['Roboto'] text-xs text-muted-foreground">Thử chọn khoảng thời gian khác hoặc làm mới sau khi có hoạt động.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-gradient-to-b from-card via-card to-primary/5">
      <div className="h-[300px] w-full min-h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 12, right: 4, left: 4, bottom: 4 }}>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={COLORS.apps} stopOpacity={0.28} />
                <stop offset="100%" stopColor={COLORS.apps} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#94a3b8" strokeDasharray="4 4" strokeOpacity={0.45} vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: '#64748b' }}
              tickLine={false}
              axisLine={{ stroke: '#cbd5e1' }}
              height={36}
            />
            <YAxis
              yAxisId="apps"
              orientation="left"
              tick={{ fontSize: 11, fill: '#64748b' }}
              tickLine={false}
              axisLine={false}
              width={40}
              allowDecimals={false}
            />
            <YAxis
              yAxisId="rest"
              orientation="right"
              tick={{ fontSize: 11, fill: '#64748b' }}
              tickLine={false}
              axisLine={false}
              width={36}
              allowDecimals={false}
            />
            <Tooltip
              content={<AdminChartTooltip showInterviewScheduled={showInterviewScheduled} showInterviewPassed={showInterviewPassed} />}
              cursor={{ stroke: '#fecaca', strokeWidth: 1, strokeDasharray: '4 4' }}
            />
            <Area
              yAxisId="apps"
              type="monotone"
              dataKey="applications"
              stroke={COLORS.apps}
              strokeWidth={2.5}
              fill={`url(#${gradId})`}
              dot={{ r: 3, fill: '#fff', stroke: COLORS.apps, strokeWidth: 2 }}
              activeDot={{ r: 5 }}
            />
            <Line
              yAxisId="rest"
              type="monotone"
              dataKey="selected"
              name="Ứng viên được chọn"
              stroke="var(--chart-4)"
              strokeWidth={2}
              dot={false}
            />
            {showInterviewScheduled && (
              <Line
                yAxisId="rest"
                type="monotone"
                dataKey="interviewScheduled"
                name="Đã mời PV"
                stroke={COLORS.scheduled}
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={false}
              />
            )}
            {showInterviewPassed && (
              <Line
                yAxisId="rest"
                type="monotone"
                dataKey="interviewPassed"
                name="Ứng viên pass phỏng vấn"
                stroke={COLORS.passed}
                strokeWidth={2}
                strokeDasharray="2 3"
                dot={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
const CACHE_KEY = 'findme_admin_dashboard_overview';
const CACHE_FRESH_MS = 30_000;
const AUTO_REFRESH_MS = 60_000;
const AdminDashboard = () => {
  const {
    makeJsonRequest
  } = useApiRequest();
  const [stats, setStats] = useState(null);
  const [trend, setTrend] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [months, setMonths] = useState(6);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showInterviewScheduled, setShowInterviewScheduled] = useState(true);
  const [showInterviewPassed, setShowInterviewPassed] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const intervalRef = useRef(null);
  const formatRelative = iso => {
    try {
      const d = new Date(iso);
      const diff = Date.now() - d.getTime();
      const m = Math.floor(diff / 60000);
      if (m < 1) return 'vừa xong';
      if (m < 60) return `${m} phút trước`;
      const h = Math.floor(m / 60);
      if (h < 24) return `${h} giờ trước`;
      const dys = Math.floor(h / 24);
      return `${dys} ngày trước`;
    } catch {
      return '';
    }
  };

  const fetchOverview = useCallback(
    async (silent = false) => {
      try {
        if (!silent) setLoading(true);
        setError(null);
        const data = await makeJsonRequest(`/api/admin/dashboard/overview?months=${months}`);
        if (data) {
          setStats(data.stats);
          setTrend(data.trend || []);
          setRecentActivity(data.recentActivity || []);
          if (isStorageAvailable())
            smartCacheSet(
              CACHE_KEY,
              JSON.stringify({
                months,
                data,
                timestamp: Date.now()
              })
            );
        }
      } catch (e) {
        setError(e?.message || 'Không thể tải dữ liệu tổng quan');
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [months, makeJsonRequest]
  );

  useEffect(() => {
    let used = false;
    if (isStorageAvailable()) {
      try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.months === months && Date.now() - parsed.timestamp < CACHE_FRESH_MS) {
            setStats(parsed.data.stats);
            setTrend(parsed.data.trend || []);
            setRecentActivity(parsed.data.recentActivity || []);
            setLoading(false);
            used = true;
          }
        }
      } catch {
        /* ignore cache read/parse errors */
      }
    }
    fetchOverview(used);
  }, [months, fetchOverview]);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(() => fetchOverview(true), AUTO_REFRESH_MS);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoRefresh, fetchOverview]);
  const iconWrap = d => <div className="rounded-full bg-primary/10 p-2 transition-colors duration-300">
      <svg className="h-4 w-4 stroke-current text-primary" fill="none" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={d} />
      </svg>
    </div>;
  const getActivityIcon = t => {
    switch (t) {
      case 'job_posted':
        return iconWrap('M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2V6');
      case 'application_update':
        return iconWrap('M5 13l4 4L19 7');
      case 'candidate_selected':
        return iconWrap('M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z');
      case 'hr_added':
        return iconWrap('M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z');
      case 'interview_scheduled':
        return iconWrap('M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z');
      default:
        return iconWrap('M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z');
    }
  };
  return <AdminLayout>
      <div className={ADMIN_PAGE}>
        <div className={ADMIN_PAGE_HEADER}>
          <div className="min-w-0 flex-1">
            <h1 className={ADMIN_H1}>Tổng quan quản trị</h1>
            <p className={ADMIN_SUBTITLE}>
              Theo dõi tin tuyển dụng, hồ sơ ứng viên và hoạt động nhân sự trên hệ thống findme.
            </p>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
          {loading && !stats ? Array.from({
          length: 4
        }).map((_, i) => <Card key={i} className="animate-pulse p-6">
              <div className="mb-4 h-6 w-6 rounded bg-muted" />
              <div className="mb-2 h-4 w-1/2 rounded bg-muted" />
              <div className="h-6 w-1/3 rounded bg-muted/80" />
            </Card>) : [{
          label: 'Tin tuyển dụng',
          value: stats?.totalJobs ?? 0,
          path: 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2V6'
        }, {
          label: 'Ứng viên trong hệ thống',
          value: stats?.totalCandidates ?? 0,
          path: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0 a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z'
        }, {
          label: 'Tài khoản HR',
          value: stats?.totalHRs ?? 0,
          path: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
        }, {
          label: 'Ứng viên được chọn',
          value: stats?.selectedCandidates ?? 0,
          path: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
        }].map(c => <Card key={c.label} className="shadow-sm">
                <CardContent className="flex items-center gap-4 pt-6">
                  <div className="rounded-xl bg-primary/10 p-3 transition-colors duration-300"><svg className="h-6 w-6 stroke-current text-primary" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={c.path} /></svg></div>
                  <div><p className="font-['Roboto'] text-sm font-medium text-muted-foreground">{c.label}</p><p className="font-['Open_Sans'] text-2xl font-bold text-foreground">{c.value}</p></div>
                </CardContent>
              </Card>)}
        </div>
        {stats && (
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Card className="shadow-sm">
              <CardContent className="p-5">
                <p className="mb-1 font-['Roboto'] text-xs font-medium uppercase tracking-wide text-muted-foreground">Đã mời phỏng vấn</p>
                <p className="font-['Open_Sans'] text-2xl font-semibold text-foreground">{stats.interviewScheduledCandidates ?? 0}</p>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardContent className="p-5">
                <p className="mb-1 font-['Roboto'] text-xs font-medium uppercase tracking-wide text-muted-foreground">Ứng viên pass phỏng vấn</p>
                <p className="font-['Open_Sans'] text-2xl font-semibold text-foreground">{stats.interviewPassedCandidates ?? 0}</p>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardContent className="p-5">
                <p className="mb-1 font-['Roboto'] text-xs font-medium uppercase tracking-wide text-muted-foreground">Hồ sơ chờ xử lý</p>
                <p className="font-['Open_Sans'] text-2xl font-semibold text-foreground">{stats.pendingApplications ?? 0}</p>
              </CardContent>
            </Card>
          </div>
        )}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle />
            <AlertTitle>Không tải được dữ liệu</AlertTitle>
            <AlertDescription className="flex flex-wrap items-center gap-2 font-['Roboto']">
              {error}
              <Button variant="link" className="h-auto p-0 text-destructive" onClick={() => fetchOverview()}>
                Thử lại
              </Button>
            </AlertDescription>
          </Alert>
        )}
        <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
            <Card className="relative shadow-sm lg:col-span-2">
            <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="font-['Open_Sans'] text-lg">Hồ sơ ứng tuyển theo tháng</CardTitle>
                <CardDescription className="mt-0.5 font-['Roboto'] text-xs">
                  Theo dõi số hồ sơ nộp và các chỉ số liên quan theo từng tháng.
                </CardDescription>
              </div>
              <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
                <Select value={String(months)} onValueChange={v => setMonths(parseInt(v, 10) || 6)}>
                  <SelectTrigger size="sm" className="w-full min-w-[11rem] rounded-full font-['Roboto'] sm:w-[200px]">
                    <SelectValue placeholder="Khoảng thời gian" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 tháng gần nhất</SelectItem>
                    <SelectItem value="6">6 tháng gần nhất</SelectItem>
                    <SelectItem value="12">12 tháng gần nhất</SelectItem>
                  </SelectContent>
                </Select>
                <Button type="button" size="sm" className="shrink-0" onClick={() => fetchOverview()}>
                  Làm mới
                </Button>
                <Button
                  type="button"
                  variant={autoRefresh ? 'secondary' : 'outline'}
                  size="sm"
                  className="shrink-0"
                  onClick={() => setAutoRefresh(a => !a)}
                >
                  {autoRefresh ? 'Tạm dừng làm mới' : 'Làm mới tự động'}
                </Button>
                <div className="hidden items-center gap-3 md:flex">
                  <label className="flex cursor-pointer items-center gap-2 font-['Roboto'] text-xs text-muted-foreground">
                    <Checkbox checked={showInterviewScheduled} onCheckedChange={v => setShowInterviewScheduled(!!v)} />
                    Đã mời PV
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 font-['Roboto'] text-xs text-muted-foreground">
                    <Checkbox checked={showInterviewPassed} onCheckedChange={v => setShowInterviewPassed(!!v)} />
                    Pass phỏng vấn
                  </label>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-0 pt-0">

            <AdminTrendChart
              trend={trend}
              loading={loading}
              showInterviewScheduled={showInterviewScheduled}
              showInterviewPassed={showInterviewPassed}
            />

            <div className="mt-3 flex flex-wrap items-center justify-end gap-x-5 gap-y-2 border-t border-border pt-3 font-['Roboto'] text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-primary" />
                Hồ sơ nộp
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-0.5 w-4 bg-muted-foreground" />
                Ứng viên được chọn
              </span>
              {showInterviewScheduled && (
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block h-0.5 w-4 border-t-2 border-dashed border-red-400" />
                  Đã mời phỏng vấn
                </span>
              )}
              {showInterviewPassed && (
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block h-0.5 w-4 border-t-2 border-dotted border-red-800" />
                  Ứng viên pass phỏng vấn
                </span>
              )}
            </div>

            {stats && stats.totalCandidates > 0 && (() => {
            const total = stats.totalCandidates || 0;
            const sl = stats.interviewScheduledCandidates || 0;
            const passed = stats.interviewPassedCandidates || 0;
            const slR = total ? Math.round(sl / total * 100) : 0;
            const pR = total ? Math.round(passed / total * 100) : 0;
            return (
              <div className="mt-6 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-card p-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
                  <h3 className="font-['Open_Sans'] text-sm font-semibold uppercase tracking-wide text-foreground">
                    Tỷ lệ trong phễu tuyển dụng
                  </h3>
                  <div className="flex flex-wrap gap-4 font-['Roboto'] text-[11px]">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <span className="h-2 w-2 rounded-full bg-chart-2" />
                      Đã mời PV: <strong className="text-foreground">{slR}%</strong>
                    </span>
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <span className="h-2 w-2 rounded-full bg-primary" />
                      Pass PV: <strong className="text-foreground">{pR}%</strong>
                    </span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="mb-1 flex justify-between font-['Roboto'] text-[11px] text-muted-foreground">
                      <span>Ứng viên trong hệ thống</span>
                      <span>{total}</span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-2.5 rounded-full bg-muted-foreground/50 transition-colors duration-300" style={{ width: '100%' }} />
                    </div>
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between font-['Roboto'] text-[11px] text-muted-foreground">
                      <span>Đã mời phỏng vấn</span>
                      <span>
                        {sl} ({slR}%)
                      </span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-2.5 rounded-full bg-chart-2 transition-all" style={{ width: `${Math.min(slR, 100)}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between font-['Roboto'] text-[11px] text-muted-foreground">
                      <span>Ứng viên pass phỏng vấn</span>
                      <span>
                        {passed} ({pR}%)
                      </span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-2.5 rounded-full bg-primary transition-all" style={{ width: `${Math.min(pR, 100)}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
            </CardContent>
            </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="font-['Open_Sans'] text-lg">Nhật ký hoạt động</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
            <div className="min-h-[200px] space-y-4">
              {loading && recentActivity.length === 0 && (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              )}
              {!loading && recentActivity.length === 0 && <p className="font-['Roboto'] text-sm text-muted-foreground">Chưa có mục nhật ký nào gần đây.</p>}
              {recentActivity.map((a, i) => <div key={i} className="flex items-start space-x-3">{getActivityIcon(a.type)}<div className="min-w-0 flex-1"><p className="font-['Roboto'] text-sm text-foreground">{a.message}</p><p className="mt-1 font-['Roboto'] text-xs text-muted-foreground">{formatRelative(a.time)}</p></div></div>)}
            </div>
            <Button type="button" variant="secondary" className="mt-4 w-full rounded-full font-['Roboto']">Xem toàn bộ nhật ký</Button>
            </CardContent>
          </Card>
        </div>

      </div>
    </AdminLayout>;
};
export default AdminDashboard;




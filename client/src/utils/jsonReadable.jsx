import React from 'react';
import { formatDateTimeVN } from '../hr/hrDateFormat';

const KEY_LABELS = {
  jobId: 'Mã tin tuyển dụng',
  jobTitle: 'Tiêu đề tin',
  applicationId: 'Mã hồ sơ ứng tuyển',
  interviewId: 'Mã lịch phỏng vấn',
  userId: 'Mã người dùng',
  status: 'Trạng thái',
  previousStatus: 'Trạng thái trước',
  newStatus: 'Trạng thái mới',
  scheduledAt: 'Lịch hẹn',
  startTime: 'Bắt đầu',
  endTime: 'Kết thúc',
  location: 'Địa điểm',
  notes: 'Ghi chú',
  reason: 'Lý do',
  companyName: 'Công ty',
  applicantName: 'Ứng viên',
  hrName: 'Nhân sự phụ trách',
  email: 'Email',
  phone: 'Số điện thoại',
  title: 'Tiêu đề',
  message: 'Nội dung',
  type: 'Loại',
  priority: 'Ưu tiên',
  read: 'Đã đọc',
  createdAt: 'Tạo lúc',
  updatedAt: 'Cập nhật lúc'
};

function humanizeKey(key) {
  if (typeof key !== 'string') return String(key);
  if (KEY_LABELS[key]) return KEY_LABELS[key];
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, c => c.toUpperCase());
}

function formatPrimitive(value) {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Có' : 'Không';
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value.toLocaleString('vi-VN') : String(value);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed) || /^\d{4}-\d{2}-\d{2} \d/.test(trimmed)) {
      const d = new Date(trimmed);
      if (!Number.isNaN(d.getTime())) {
        return formatDateTimeVN(d) || trimmed;
      }
    }
    return value;
  }
  return String(value);
}

export function ReadableJsonValue({ value, depth = 0 }) {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground">—</span>;
  }

  if (typeof value !== 'object') {
    return <span className="font-['Roboto'] text-sm text-foreground">{formatPrimitive(value)}</span>;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="font-['Roboto'] text-sm text-muted-foreground">Không có mục nào</span>;
    }
    const allPrimitive = value.every(
      v => v === null || v === undefined || (typeof v !== 'object' && typeof v !== 'function')
    );
    if (allPrimitive) {
      return (
        <ul className="list-inside list-disc space-y-1 font-['Roboto'] text-sm text-foreground">
          {value.map((item, i) => (
            <li key={i}>{formatPrimitive(item)}</li>
          ))}
        </ul>
      );
    }
    return (
      <ol className="list-inside list-decimal space-y-3 pl-0 font-['Roboto'] text-sm">
        {value.map((item, i) => (
          <li key={i} className="pl-1">
            <ReadableJsonValue value={item} depth={depth + 1} />
          </li>
        ))}
      </ol>
    );
  }

  const entries = Object.entries(value).filter(([, v]) => v !== undefined);
  if (entries.length === 0) {
    return <span className="font-['Roboto'] text-sm text-muted-foreground">Không có dữ liệu</span>;
  }

  return (
    <dl className={`space-y-3 ${depth > 0 ? 'border-l-2 border-border/60 pl-3' : ''}`}>
      {entries.map(([k, v]) => (
        <div key={k}>
          <dt className="font-['Roboto'] text-xs font-medium text-muted-foreground">{humanizeKey(k)}</dt>
          <dd className="mt-0.5 pl-0">
            {v !== null && typeof v === 'object' ? (
              <ReadableJsonValue value={v} depth={depth + 1} />
            ) : (
              <span className="font-['Roboto'] text-sm text-foreground">{formatPrimitive(v)}</span>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

const TEXT_NORMALIZATION_MAP = {
  engineering: 'Kỹ thuật',
  'human resources': 'Nhân sự',
  sales: 'Kinh doanh',
  product: 'Sản phẩm',
  design: 'Thiết kế',
  finance: 'Tài chính',
  operations: 'Vận hành',
  'customer success': 'Chăm sóc khách hàng',
  'data science': 'Khoa học dữ liệu',
  'quality assurance': 'Đảm bảo chất lượng',
  security: 'An ninh',
  legal: 'Pháp lý',
  administrative: 'Hành chính',
  other: 'Khác',
  'full-time': 'Toàn thời gian',
  'part-time': 'Bán thời gian',
  internship: 'Thực tập',
  contract: 'Hợp đồng',
  freelance: 'Tự do',
  temporary: 'Thời vụ',
  'entry level': 'Mới vào nghề',
  'mid level': 'Trung cấp',
  'senior level': 'Cao cấp',
  'lead/principal': 'Trưởng nhóm/Chuyên gia',
  manager: 'Quản lý',
  director: 'Giám đốc bộ phận',
  executive: 'Cấp điều hành',
  'fresher (0 years)': 'Mới tốt nghiệp (0 năm)',
  '1-2 years': '1-2 năm',
  '3-5 years': '3-5 năm',
  '5-8 years': '5-8 năm',
  '8-12 years': '8-12 năm',
  '12+ years': 'Trên 12 năm',
  'phone screening': 'Sơ loại qua điện thoại',
  'technical interview': 'Phỏng vấn kỹ thuật',
  'technical assessment': 'Đánh giá kỹ thuật',
  'coding challenge': 'Bài kiểm tra lập trình',
  'behavioral interview': 'Phỏng vấn hành vi',
  'system design': 'Thiết kế hệ thống',
  'code review': 'Đánh giá mã nguồn',
  'panel interview': 'Phỏng vấn hội đồng',
  'hr interview': 'Phỏng vấn nhân sự',
  'final interview': 'Phỏng vấn vòng cuối',
  'culture fit interview': 'Phỏng vấn phù hợp văn hóa',
  "bachelor's degree": 'Cử nhân',
  "master's degree": 'Thạc sĩ',
  'high school diploma': 'Tốt nghiệp THPT',
  'associate degree': 'Cao đẳng',
  'professional certification': 'Chứng chỉ nghề nghiệp',
  'trade school certificate': 'Chứng chỉ nghề',
  'no formal education required': 'Không yêu cầu bằng cấp',
  "bachelor's degree in computer science": 'Cử nhân Khoa học máy tính',
  "bachelor's degree in engineering": 'Cử nhân Kỹ thuật',
  "master's degree in computer science": 'Thạc sĩ Khoa học máy tính',
  'master of business administration (mba)': 'Thạc sĩ Quản trị Kinh doanh (MBA)'
};

function toVietnameseText(value) {
  if (!value || typeof value !== 'string') return value;
  const trimmed = value.trim();
  const normalizedKey = trimmed.toLowerCase();
  return TEXT_NORMALIZATION_MAP[normalizedKey] || trimmed;
}

function normalizeJobType(value) {
  return toVietnameseText(value);
}

function normalizeStringArray(values) {
  if (!Array.isArray(values)) return values;
  return values.map(item => toVietnameseText(item)).filter(item => typeof item === 'string' && item.length > 0);
}

function normalizeSalaryRange(range) {
  const salaryRange = { ...(range || {}) };
  salaryRange.currency = range && range.currency ? range.currency : 'VND';
  salaryRange.format = 'absolute';
  if (!salaryRange.period) {
    salaryRange.period = 'year';
  }
  return salaryRange;
}

function normalizeJobPayload(payload = {}) {
  const normalized = { ...payload };
  if (normalized.department) normalized.department = toVietnameseText(normalized.department);
  if (normalized.locationType) {
    normalized.locationType = normalized.locationType.charAt(0).toUpperCase() + normalized.locationType.slice(1).toLowerCase();
  }
  if (normalized.salaryRange) normalized.salaryRange = normalizeSalaryRange(normalized.salaryRange);
  if (normalized.qualification) normalized.qualification = normalizeStringArray(normalized.qualification);
  if (normalized.defaultInterviewRounds) normalized.defaultInterviewRounds = normalizeStringArray(normalized.defaultInterviewRounds);
  return normalized;
}

function getSalaryPeriodLabel(period) {
  if (period === 'month') return 'tháng';
  if (period === 'hour') return 'giờ';
  return 'năm';
}

module.exports = {
  normalizeJobPayload,
  toVietnameseText,
  getSalaryPeriodLabel
};

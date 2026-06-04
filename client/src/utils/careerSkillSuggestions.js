export const CAREER_FIELD_OPTIONS = [
  'CNTT / Phần mềm',
  'Dữ liệu / AI',
  'Thiết kế',
  'Marketing',
  'Bán hàng',
  'Kế toán / Tài chính',
  'Nhân sự',
  'Vận hành',
  'Logistics',
  'CSKH',
  'Giáo dục',
  'Y tế',
  'Xây dựng',
  'Khác'
];

export const GENERAL_SUGGESTED_SKILLS = [
  'Giao tiếp',
  'Làm việc nhóm',
  'Giải quyết vấn đề',
  'Quản lý thời gian',
  'Tư duy phân tích',
  'Thuyết trình',
  'Đàm phán',
  'Quản lý dự án',
  'Agile',
  'Scrum',
  'Excel',
  'PowerPoint',
  'Word',
  'Google Sheets',
  'Email',
  'Tin học văn phòng'
];

export const CAREER_FIELD_SKILL_SUGGESTIONS = {
  'CNTT / Phần mềm': [
    'JavaScript',
    'TypeScript',
    'React',
    'Vue.js',
    'Angular',
    'Node.js',
    'Express.js',
    'HTML',
    'CSS',
    'Tailwind CSS',
    'Git',
    'Linux',
    'REST API',
    'SQL',
    'MongoDB',
    'PostgreSQL',
    'Docker',
    'AWS',
    'Testing',
    'System Design'
  ],
  'Dữ liệu / AI': [
    'Python',
    'SQL',
    'Pandas',
    'NumPy',
    'Machine Learning',
    'Statistics',
    'Power BI',
    'Tableau',
    'Data Visualization',
    'ETL',
    'Data Warehouse',
    'BigQuery',
    'Spark',
    'R',
    'A/B Testing'
  ],
  'Thiết kế': [
    'Figma',
    'UI/UX Design',
    'Wireframe',
    'Prototype',
    'Design System',
    'User Research',
    'Typography',
    'Photoshop',
    'Illustrator',
    'Adobe XD'
  ],
  'Marketing': [
    'Content Marketing',
    'SEO',
    'Google Ads',
    'Facebook Ads',
    'Tiktok Ads',
    'Email Marketing',
    'Social Media',
    'Branding',
    'Copywriting',
    'Marketing Plan',
    'GA4'
  ],
  'Bán hàng': [
    'Tư vấn bán hàng',
    'Chăm sóc khách hàng',
    'CRM',
    'Lead Generation',
    'Kỹ năng chốt sales',
    'Kỹ năng gọi điện',
    'Đàm phán',
    'Báo giá',
    'Pipeline Sales'
  ],
  'Kế toán / Tài chính': [
    'Excel',
    'MISA',
    'Kế toán tổng hợp',
    'Kế toán thuế',
    'Báo cáo tài chính',
    'IFRS',
    'VAS',
    'Lập ngân sách',
    'Phân tích tài chính',
    'Kiểm toán'
  ],
  'Nhân sự': [
    'Tuyển dụng',
    'Onboarding',
    'C&B',
    'Chấm công',
    'Luật lao động',
    'Đào tạo',
    'HRBP',
    'KPI/OKR',
    'Truyền thông nội bộ'
  ],
  'Vận hành': [
    'Quy trình',
    'SOP',
    'Quản lý vận hành',
    'Quản lý kho',
    'Quản lý chất lượng',
    '5S',
    'Kaizen',
    'Báo cáo',
    'KPI'
  ],
  'Logistics': [
    'Supply Chain',
    'Xuất nhập khẩu',
    'Chứng từ',
    'Incoterms',
    'Vận tải',
    'Kho vận',
    'ERP',
    'Khai báo hải quan'
  ],
  'CSKH': [
    'Chăm sóc khách hàng',
    'Xử lý khiếu nại',
    'Call Center',
    'Ticketing',
    'Kỹ năng lắng nghe',
    'Kỹ năng giao tiếp',
    'CRM'
  ],
  'Giáo dục': [
    'Giảng dạy',
    'Soạn giáo án',
    'Quản lý lớp học',
    'Đánh giá học viên',
    'E-learning',
    'Kỹ năng sư phạm'
  ],
  'Y tế': [
    'Chăm sóc bệnh nhân',
    'Hồ sơ bệnh án',
    'Giao tiếp',
    'Quy trình chuyên môn',
    'Tuân thủ',
    'Tư vấn sức khỏe'
  ],
  'Xây dựng': [
    'AutoCAD',
    'Bóc tách khối lượng',
    'Dự toán',
    'Giám sát công trình',
    'An toàn lao động',
    'Quản lý tiến độ',
    'MS Project'
  ]
};

export function getSuggestedSkillsByCareerField(careerField) {
  const list = CAREER_FIELD_SKILL_SUGGESTIONS[careerField] || [];
  return Array.from(new Set([...list, ...GENERAL_SUGGESTED_SKILLS]));
}


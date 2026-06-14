require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Import Models
const User = require('../global/models/User');
const Job = require('../global/models/Job');
const Resume = require('../global/models/Resume');
const Application = require('../global/models/Application');
const Interview = require('../global/models/Interview');
const Notification = require('../global/models/Notification');
const JobStatusChangeRequest = require('../global/models/JobStatusChangeRequest');

const DEFAULT_PASSWORD = 'pwd'; // Same password as other seed users

async function seedDemoData() {
  const mongoURI = process.env.MONGODB_URI || process.env.MONGODB_URI_PROD || 'mongodb://127.0.0.1:27017/findme';
  console.log(`Connecting to MongoDB at: ${mongoURI}`);
  await mongoose.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
  console.log('MongoDB connected successfully.');

  const shouldReset = process.env.RESET_DEMO_DATA === 'true';

  if (shouldReset) {
    console.log('RESET_DEMO_DATA is set to true. Clearing existing demo data (matching *@findme.com)...');

    // Find demo users
    const demoUsers = await User.find({ email: { $regex: /@findme\.com$/i } });
    const demoUserIds = demoUsers.map(u => u._id);
    console.log(`Found ${demoUserIds.length} existing demo users to clean up.`);

    if (demoUserIds.length > 0) {
      // Clean up jobs posted by demo Recruiters
      const demoJobs = await Job.find({ postedBy: { $in: demoUserIds } });
      const demoJobIds = demoJobs.map(j => j._id);

      // Delete child documents
      await Interview.deleteMany({
        $or: [
          { interviewer: { $in: demoUserIds } },
          { scheduledBy: { $in: demoUserIds } }
        ]
      });
      console.log('Cleared Interviews linked to demo users.');

      await Application.deleteMany({
        $or: [
          { applicant: { $in: demoUserIds } },
          { job: { $in: demoJobIds } }
        ]
      });
      console.log('Cleared Applications linked to demo users/jobs.');

      await Resume.deleteMany({ userId: { $in: demoUserIds } });
      console.log('Cleared Resumes linked to demo applicants.');

      await Notification.deleteMany({
        $or: [
          { user: { $in: demoUserIds } },
          { createdBy: { $in: demoUserIds } }
        ]
      });
      console.log('Cleared Notifications linked to demo users.');

      await JobStatusChangeRequest.deleteMany({
        $or: [
          { job: { $in: demoJobIds } },
          { requestedBy: { $in: demoUserIds } }
        ]
      });
      console.log('Cleared JobStatusChangeRequests linked to demo users/jobs.');

      await Job.deleteMany({ postedBy: { $in: demoUserIds } });
      console.log('Cleared Jobs posted by demo users.');

      await User.deleteMany({ _id: { $in: demoUserIds } });
      console.log('Cleared Demo Users.');
    }
  }

  // 1. Create Users
  console.log('Seeding Users...');
  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  // Admin Account
  const adminData = {
    firstName: 'Quản trị',
    lastName: 'Hệ thống',
    email: 'admin@findme.com',
    password: hashedPassword,
    role: 'admin',
    accountStatus: 'active',
    emailVerifiedAt: new Date(),
    phone: '0901234567',
    location: 'Hà Nội',
    isActive: true
  };
  const admin = await User.findOneAndUpdate({ email: adminData.email }, adminData, { new: true, upsert: true });

  // 5 Recruiter Accounts
  const recruiterTemplates = [
    { firstName: 'Thảo', lastName: 'Nguyễn', email: 'recruiter.thao@findme.com', dept: 'Kỹ thuật', phone: '0912345678' },
    { firstName: 'Hoàng', lastName: 'Trần', email: 'recruiter.hoang@findme.com', dept: 'Kinh doanh', phone: '0922345678' },
    { firstName: 'Lan', lastName: 'Phạm', email: 'recruiter.lan@findme.com', dept: 'Marketing', phone: '0932345678' },
    { firstName: 'Minh', lastName: 'Lê', email: 'recruiter.minh@findme.com', dept: 'Tài chính', phone: '0942345678' },
    { firstName: 'Hương', lastName: 'Vũ', email: 'recruiter@findme.com', dept: 'Nhân sự', phone: '0952345678' } // default recruiter
  ];

  const recruiters = [];
  for (const t of recruiterTemplates) {
    const recruiterData = {
      firstName: t.firstName,
      lastName: t.lastName,
      email: t.email,
      password: hashedPassword,
      role: 'recruiter',
      accountStatus: 'active',
      emailVerifiedAt: new Date(),
      phone: t.phone,
      location: 'Hồ Chí Minh',
      department: t.dept,
      jobTitle: 'Trưởng bộ phận Tuyển dụng',
      isActive: true
    };
    const recruiter = await User.findOneAndUpdate({ email: recruiterData.email }, recruiterData, { new: true, upsert: true });
    recruiters.push(recruiter);
  }

  // 20 Applicant Accounts
  const applicantTemplates = [
    { firstName: 'Anh', lastName: 'Nguyễn Tuấn', email: 'tuananh@findme.com', field: 'Công nghệ thông tin', skills: ['NodeJS', 'ReactJS', 'MongoDB', 'Express', 'JavaScript'] },
    { firstName: 'Bảo', lastName: 'Trần Minh', email: 'minhbao@findme.com', field: 'Công nghệ thông tin', skills: ['Python', 'FastAPI', 'PyTorch', 'NLP', 'TensorFlow'] },
    { firstName: 'Chi', lastName: 'Lê Khánh', email: 'khanhchi@findme.com', field: 'Kiểm thử phần mềm', skills: ['Selenium', 'Automation Testing', 'Manual Testing', 'Jira', 'Postman'] },
    { firstName: 'Duy', lastName: 'Phạm Hoàng', email: 'hoangduy@findme.com', field: 'Công nghệ thông tin', skills: ['C#', 'ASP.NET Core', 'SQL Server', 'REST API'] },
    { firstName: 'Em', lastName: 'Vũ Hoàng', email: 'hoangem@findme.com', field: 'Thiết kế đồ họa', skills: ['Photoshop', 'Illustrator', 'Figma', 'UI/UX Design', 'Indesign'] },
    { firstName: 'Giang', lastName: 'Nguyễn Trường', email: 'truonggiang@findme.com', field: 'Marketing', skills: ['SEO', 'Content Marketing', 'Google Ads', 'Facebook Ads', 'Google Analytics'] },
    { firstName: 'Hải', lastName: 'Phan Thanh', email: 'thanhhai@findme.com', field: 'Tài chính - Kế toán', skills: ['Excel', 'Financial Analysis', 'Tax Accounting', 'MISA', 'Auditing'] },
    { firstName: 'Khánh', lastName: 'Lê Duy', email: 'duykhanh@findme.com', field: 'Chăm sóc khách hàng', skills: ['Communication', 'Problem Solving', 'Customer Relations', 'CRM', 'Zendesk'] },
    { firstName: 'Linh', lastName: 'Trần Thị', email: 'thilinh@findme.com', field: 'Nhân sự', skills: ['Talent Acquisition', 'Recruiter Strategy', 'Onboarding', 'Payroll', 'Vietnam Labor Law'] },
    { firstName: 'Nam', lastName: 'Nguyễn Hoài', email: 'user1@findme.com', field: 'Công nghệ thông tin', skills: ['Java', 'Spring Boot', 'MySQL', 'Docker', 'Kubernetes'] }, // user1
    { firstName: 'Hiếu', lastName: 'Nguyễn Trung', email: 'user2@findme.com', field: 'Công nghệ thông tin', skills: ['React Native', 'Swift', 'Kotlin', 'Mobile Development'] }, // user2
    { firstName: 'Ly', lastName: 'Vũ Hương', email: 'user3@findme.com', field: 'Marketing', skills: ['Branding', 'Social Media', 'PR', 'Content Strategy'] }, // user3
    { firstName: 'Phương', lastName: 'Đỗ Hà', email: 'haphuong@findme.com', field: 'Phân tích dữ liệu', skills: ['SQL', 'Python', 'Power BI', 'Tableau', 'Data Analysis'] },
    { firstName: 'Quốc', lastName: 'Nguyễn Anh', email: 'anhquoc@findme.com', field: 'Quản lý dự án', skills: ['Agile', 'Scrum', 'Jira', 'Project Management', 'Communication'] },
    { firstName: 'Sơn', lastName: 'Trần Hồng', email: 'hongson@findme.com', field: 'Hệ thống - DevOps', skills: ['AWS', 'Docker', 'Kubernetes', 'CI/CD', 'Linux', 'Bash'] },
    { firstName: 'Trang', lastName: 'Phạm Quỳnh', email: 'quynhtrang@findme.com', field: 'Tài chính - Kế toán', skills: ['Corporate Finance', 'Excel', 'MISA', 'Billing'] },
    { firstName: 'Uyên', lastName: 'Lê Tú', email: 'tuuyen@findme.com', field: 'Kiểm thử phần mềm', skills: ['Manual Testing', 'API Testing', 'Postman', 'SQL', 'Bug Tracking'] },
    { firstName: 'Việt', lastName: 'Nguyễn Quốc', email: 'quocviet@findme.com', field: 'Công nghệ thông tin', skills: ['Go', 'Microservices', 'gRPC', 'Redis', 'Docker'] },
    { firstName: 'Yến', lastName: 'Hoàng Hải', email: 'haiyen@findme.com', field: 'Thiết kế đồ họa', skills: ['Figma', 'UI/UX Design', 'Wireframing', 'Prototyping', 'Adobe XD'] },
    { firstName: 'Dũng', lastName: 'Trần Việt', email: 'vietdung@findme.com', field: 'Phân tích nghiệp vụ', skills: ['Business Analysis', 'UML', 'User Stories', 'SQL', 'Figma'] }
  ];

  const applicants = [];
  for (const t of applicantTemplates) {
    const applicantData = {
      firstName: t.firstName,
      lastName: t.lastName,
      email: t.email,
      password: hashedPassword,
      role: 'applicant',
      accountStatus: 'active',
      emailVerifiedAt: new Date(),
      phone: '098' + Math.floor(1000000 + Math.random() * 9000000),
      location: 'Hồ Chí Minh',
      isActive: true,
      profile: {
        fullName: `${t.lastName} ${t.firstName}`,
        careerField: t.field,
        currentLocation: 'Hồ Chí Minh',
        currentStatus: 'Sẵn sàng làm việc',
        primarySkills: t.skills,
        skills: t.skills,
        summary: `Tôi là một chuyên gia trong lĩnh vực ${t.field} với niềm đam mê sâu sắc đối với phát triển sản phẩm chất lượng cao và tối ưu hóa trải nghiệm người dùng.`
      }
    };
    const app = await User.findOneAndUpdate({ email: applicantData.email }, applicantData, { new: true, upsert: true });
    applicants.push(app);
  }

  console.log(`Seeded ${recruiters.length} Recruiters, ${applicants.length} Applicants, and 1 Admin.`);

  // 2. Seed Jobs
  console.log('Seeding Jobs...');
  const jobTemplates = [
    {
      title: 'Backend Developer (NodeJS)',
      dept: 'Kỹ thuật',
      jobType: 'Full-time',
      location: 'Hồ Chí Minh',
      locationType: 'Hybrid',
      salaryRange: { min: '20000000', max: '35000000' },
      requiredSkills: ['NodeJS', 'ReactJS', 'MongoDB', 'JavaScript'],
      preferredSkills: ['Express', 'Redis', 'Docker', 'Kubernetes'],
      experienceLevel: 'Middle',
      atsEnabled: true,
      atsEngine: 'scan_cv',
      atsResumeThreshold: 60,
      description: 'Chúng tôi đang tìm kiếm một Backend Developer (NodeJS) tài năng để phát triển hệ thống và xử lý logic nghiệp vụ hiệu năng cao.',
      requirements: 'Ít nhất 2 năm kinh nghiệm làm việc với NodeJS. Hiểu biết sâu về cơ sở dữ liệu MongoDB/NoSQL. Có kinh nghiệm xây dựng RESTful APIs.',
      benefits: 'Lương thưởng cạnh tranh. Lương tháng 13+. Bảo hiểm sức khỏe cao cấp.'
    },
    {
      title: 'AI / Machine Learning Engineer',
      dept: 'Kỹ thuật',
      jobType: 'Full-time',
      location: 'Hà Nội',
      locationType: 'Onsite',
      salaryRange: { min: '30000000', max: '60000000' },
      requiredSkills: ['Python', 'FastAPI', 'PyTorch', 'NLP'],
      preferredSkills: ['TensorFlow', 'LLM', 'Sentence Transformers', 'Transformers'],
      experienceLevel: 'Middle',
      atsEnabled: true,
      atsEngine: 'scan_cv',
      atsResumeThreshold: 70,
      description: 'Tham gia nghiên cứu và triển khai các mô hình AI/ML, xử lý ngôn ngữ tự nhiên (NLP) phục vụ cho hệ thống lọc CV và tìm kiếm thông minh.',
      requirements: 'Có kinh nghiệm lập trình Python vững chắc. Thành thạo PyTorch hoặc TensorFlow. Đã từng làm việc với các thư viện NLP và Transformer.',
      benefits: 'Môi trường R&D chuyên nghiệp. Hỗ trợ thiết bị cấu hình cao (GPU). Cơ hội thăng tiến nhanh.'
    },
    {
      title: 'QA / Automation Test Engineer',
      dept: 'Kỹ thuật',
      jobType: 'Full-time',
      location: 'Hồ Chí Minh',
      locationType: 'Hybrid',
      salaryRange: { min: '18000000', max: '28000000' },
      requiredSkills: ['Selenium', 'Automation Testing', 'Postman'],
      preferredSkills: ['Jira', 'API Testing', 'Java', 'CI/CD'],
      experienceLevel: 'Middle',
      atsEnabled: true,
      atsEngine: 'scan_cv',
      atsResumeThreshold: 65,
      description: 'Thiết kế kịch bản kiểm thử tự động, thực thi test suite và đảm bảo chất lượng phần mềm trước khi phát hành sản phẩm.',
      requirements: 'Trên 2 năm kinh nghiệm kiểm thử tự động với Selenium. Kỹ năng kiểm thử API bằng Postman. Có hiểu biết về quy trình Agile/Scrum.',
      benefits: 'Tham gia các khóa đào tạo chuyên sâu. Nghỉ phép 14 ngày/năm. Teambuilding hàng quý.'
    },
    {
      title: 'Digital Marketing Specialist',
      dept: 'Marketing',
      jobType: 'Full-time',
      location: 'Đà Nẵng',
      locationType: 'Onsite',
      salaryRange: { min: '12000000', max: '20000000' },
      requiredSkills: ['SEO', 'Content Marketing', 'Google Ads'],
      preferredSkills: ['Facebook Ads', 'Google Analytics', 'Photoshop'],
      experienceLevel: 'Middle',
      atsEnabled: true,
      atsEngine: 'scan_cv',
      atsResumeThreshold: 60,
      description: 'Quản lý chiến dịch quảng cáo kỹ thuật số, tối ưu hóa công cụ tìm kiếm (SEO) và phát triển các kênh truyền thông xã hội.',
      requirements: 'Hiểu rõ các thuật toán SEO. Kinh nghiệm thiết lập chiến dịch Google Ads, Facebook Ads hiệu quả. Sáng tạo nội dung cuốn hút.',
      benefits: 'Thưởng theo KPI hấp dẫn. Môi trường trẻ trung, sáng tạo. Đồ ăn nhẹ miễn phí.'
    },
    {
      title: 'Kế toán tổng hợp (Senior Accountant)',
      dept: 'Tài chính',
      jobType: 'Full-time',
      location: 'Hồ Chí Minh',
      locationType: 'Onsite',
      salaryRange: { min: '15000000', max: '22000000' },
      requiredSkills: ['Excel', 'Tax Accounting', 'MISA'],
      preferredSkills: ['Financial Analysis', 'Auditing', 'ERP systems'],
      experienceLevel: 'Senior',
      atsEnabled: false,
      description: 'Chịu trách nhiệm thực hiện các nghiệp vụ kế toán tổng hợp, quyết toán thuế, đối chiếu công nợ và lập báo cáo tài chính hàng tháng.',
      requirements: 'Tốt nghiệp đại học chuyên ngành Kế toán/Kiểm toán. Trên 3 năm kinh nghiệm ở vị trí tương đương. Sử dụng thành thạo phần mềm MISA.',
      benefits: 'Lương thưởng ổn định. Cơ hội thăng tiến lên Kế toán trưởng. Môi trường công sở thân thiện.'
    },
    {
      title: 'Frontend Developer (ReactJS)',
      dept: 'Kỹ thuật',
      jobType: 'Full-time',
      location: 'Hồ Chí Minh',
      locationType: 'Hybrid',
      salaryRange: { min: '20000000', max: '32000000' },
      requiredSkills: ['ReactJS', 'JavaScript', 'Figma'],
      preferredSkills: ['TailwindCSS', 'Redux', 'TypeScript', 'CSS'],
      experienceLevel: 'Middle',
      atsEnabled: true,
      atsEngine: 'scan_cv',
      atsResumeThreshold: 60,
      description: 'Xây dựng giao diện web ứng dụng hiện đại, phản hồi nhanh và tối ưu trải nghiệm tuyển dụng cho người dùng.',
      requirements: 'Thành thạo ReactJS và các công cụ quản lý state. Có tư duy UI/UX tốt. Biết sử dụng Figma để cắt ghép giao diện.',
      benefits: 'Làm việc cùng các kỹ sư tài năng. Cơ hội học hỏi công nghệ mới. Teambuilding hàng quý.'
    },
    {
      title: 'Data Analyst',
      dept: 'Kinh doanh',
      jobType: 'Full-time',
      location: 'Hồ Chí Minh',
      locationType: 'Remote',
      salaryRange: { min: '18000000', max: '30000000' },
      requiredSkills: ['SQL', 'Python', 'Power BI'],
      preferredSkills: ['Tableau', 'Data Analysis', 'Excel'],
      experienceLevel: 'Middle',
      atsEnabled: true,
      atsEngine: 'gemini',
      atsResumeThreshold: 70,
      description: 'Phân tích dữ liệu kinh doanh, lập báo cáo trực quan hóa (Dashboard) hỗ trợ ban giám đốc đưa ra các quyết định chiến lược.',
      requirements: 'Khả năng viết truy vấn SQL phức tạp tốt. Sử dụng thành thạo Python để làm sạch dữ liệu. Có kinh nghiệm dựng dashboard trên Power BI.',
      benefits: 'Làm việc từ xa linh hoạt. Cung cấp máy tính xách tay làm việc. Tham gia các chương trình đào tạo quốc tế.'
    },
    {
      title: 'UI/UX Designer',
      dept: 'Thiết kế',
      jobType: 'Full-time',
      location: 'Hồ Chí Minh',
      locationType: 'Hybrid',
      salaryRange: { min: '15000000', max: '25000000' },
      requiredSkills: ['Figma', 'UI/UX Design', 'Photoshop'],
      preferredSkills: ['Illustrator', 'Wireframing', 'Prototyping', 'User Research'],
      experienceLevel: 'Middle',
      atsEnabled: false,
      description: 'Thiết kế giao diện và trải nghiệm người dùng cho các sản phẩm web và ứng dụng di động của công ty.',
      requirements: 'Có portfolio thiết kế giao diện đa dạng và trực quan. Sử dụng thành thạo Figma. Hiểu biết sâu về wireframing và prototyping.',
      benefits: 'Môi trường làm việc thoải mái, sáng tạo. Thưởng dự án hấp dẫn. Lương tháng 13.'
    },
    {
      title: 'Business Analyst (BA)',
      dept: 'Kinh doanh',
      jobType: 'Full-time',
      location: 'Hồ Chí Minh',
      locationType: 'Onsite',
      salaryRange: { min: '18000000', max: '28000000' },
      requiredSkills: ['Business Analysis', 'UML', 'User Stories'],
      preferredSkills: ['SQL', 'Figma', 'Jira', 'Agile'],
      experienceLevel: 'Middle',
      atsEnabled: true,
      atsEngine: 'scan_cv',
      atsResumeThreshold: 60,
      description: 'Làm việc trực tiếp với khách hàng để thu thập yêu cầu nghiệp vụ, dịch chuyển thành tài liệu phân tích hệ thống phục vụ đội phát triển.',
      requirements: 'Có kỹ năng phân tích và mô hình hóa quy trình (UML, User Stories). Kỹ năng giao tiếp và đàm phán tốt. Sử dụng thành thạo Jira.',
      benefits: 'Đào tạo kỹ năng mềm. Bảo hiểm y tế đầy đủ. Môi trường trẻ, cởi mở.'
    },
    {
      title: 'DevOps Engineer',
      dept: 'Kỹ thuật',
      jobType: 'Full-time',
      location: 'Hà Nội',
      locationType: 'Hybrid',
      salaryRange: { min: '30000000', max: '50000000' },
      requiredSkills: ['AWS', 'Docker', 'Kubernetes'],
      preferredSkills: ['CI/CD', 'Linux', 'Bash', 'Terraform'],
      experienceLevel: 'Senior',
      atsEnabled: true,
      atsEngine: 'scan_cv',
      atsResumeThreshold: 70,
      description: 'Quản lý, vận hành và tối ưu hóa hệ thống máy chủ đám mây, xây dựng quy trình triển khai tự động CI/CD cho các dự án phần mềm.',
      requirements: 'Thành thạo các dịch vụ của AWS. Có kinh nghiệm vận hành cụm Kubernetes trong môi trường production. Thành thạo script Bash/Linux.',
      benefits: 'Thưởng hiệu năng cuối năm cao. Môi trường chuyên nghiệp. Chăm sóc sức khỏe định kỳ.'
    },
    {
      title: 'Customer Support Executive',
      dept: 'Nhân sự',
      jobType: 'Full-time',
      location: 'Hồ Chí Minh',
      locationType: 'Onsite',
      salaryRange: { min: '9000000', max: '14000000' },
      requiredSkills: ['Communication', 'Problem Solving', 'Customer Relations'],
      preferredSkills: ['CRM', 'Zendesk', 'Email Etiquette'],
      experienceLevel: 'Fresher',
      atsEnabled: false,
      description: 'Tiếp nhận các cuộc gọi, email và tin nhắn từ khách hàng để hỗ trợ giải đáp thắc mắc và giải quyết các khiếu nại liên quan đến dịch vụ.',
      requirements: 'Giao tiếp tốt, giọng nói dễ nghe, không ngọng. Khả năng xử lý tình huống linh hoạt. Có thể làm việc xoay ca.',
      benefits: 'Hỗ trợ tiền gửi xe, cơm trưa. Chế độ bảo hiểm theo luật lao động. Thưởng chuyên cần.'
    },
    {
      title: 'Fullstack Developer (NodeJS & ReactJS)',
      dept: 'Kỹ thuật',
      jobType: 'Full-time',
      location: 'Hồ Chí Minh',
      locationType: 'Hybrid',
      salaryRange: { min: '25000000', max: '45000000' },
      requiredSkills: ['NodeJS', 'ReactJS', 'MongoDB', 'JavaScript'],
      preferredSkills: ['Express', 'TailwindCSS', 'Redux', 'TypeScript'],
      experienceLevel: 'Middle',
      atsEnabled: true,
      atsEngine: 'scan_cv',
      atsResumeThreshold: 65,
      description: 'Phát triển cả phần Frontend lẫn Backend cho hệ thống sản phẩm cốt lõi của công ty, tham gia tối ưu mã nguồn và cấu trúc cơ sở dữ liệu.',
      requirements: 'Đã có kinh nghiệm làm việc ở cả ReactJS và NodeJS. Khả năng thiết kế database và viết query tối ưu. Thành thạo GIT.',
      benefits: 'Nhận gói trợ cấp thiết bị làm việc. Tham gia hoạt động teambuilding định kỳ. Cơ hội thăng tiến mở rộng.'
    }
  ];

  const jobs = [];
  const now = new Date();
  for (let i = 0; i < jobTemplates.length; i++) {
    const t = jobTemplates[i];
    // Distribute jobs among the 5 seeded Recruiters
    const postedByRecruiter = recruiters[i % recruiters.length];

    const jobData = {
      title: t.title,
      description: t.description,
      requirements: t.requirements,
      benefits: t.benefits,
      department: t.dept,
      jobType: t.jobType,
      location: t.location,
      locationType: t.locationType,
      salaryRange: {
        min: t.salaryRange.min,
        max: t.salaryRange.max,
        currency: 'VND',
        period: 'month',
        format: 'absolute'
      },
      qualification: ['Bachelor'],
      experienceLevel: t.experienceLevel,
      requiredSkills: t.requiredSkills,
      preferredSkills: t.preferredSkills,
      applicationDeadline: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days later
      atsEnabled: t.atsEnabled,
      atsResumeThreshold: t.atsResumeThreshold || 60,
      atsSkipWhenCoverLetter: false,
      atsEngine: t.atsEngine || 'scan_cv',
      resumeRequired: true,
      defaultInterviewRounds: ['Technical Interview', 'Recruiter Fit Interview'],
      postedBy: postedByRecruiter._id,
      status: 'active',
      views: Math.floor(50 + Math.random() * 200),
      applicationsCount: 0,
      publishedAt: new Date(now.getTime() - (i + 1) * 24 * 60 * 60 * 1000), // published a few days ago
      lastStatusActorRole: 'recruiter'
    };

    const newJob = await Job.create(jobData);
    jobs.push(newJob);
  }
  console.log(`Seeded ${jobs.length} Jobs.`);

  // 3. Seed Resumes
  console.log('Seeding Resumes...');
  const resumes = [];
  for (const appUser of applicants) {
    const profile = appUser.profile;
    const resumeData = {
      userId: appUser._id,
      fileName: `Resume_${appUser.lastName}_${appUser.firstName}.pdf`,
      originalName: `Resume_${appUser.lastName}_${appUser.firstName}.pdf`,
      fileSize: 12400 + Math.floor(Math.random() * 8000),
      mimeType: 'application/pdf',
      fileUrl: `/api/recruiter/applications/demo-resume.pdf`, // mock endpoint
      fileData: 'Dummy base64 content representing PDF resume file.',
      parsedData: {
        fullName: profile.fullName,
        email: appUser.email,
        phone: appUser.phone,
        currentLocation: profile.currentLocation,
        primarySkills: profile.primarySkills,
        educationEntries: [
          {
            qualification: 'Đại học Bách Khoa',
            fieldOfStudy: profile.careerField,
            universityName: 'Đại học Quốc gia',
            graduationYear: '2023',
            cgpaPercentage: '8.2/10'
          }
        ],
        workExperienceEntries: [
          {
            company: 'FPT Software',
            position: profile.primarySkills[0] + ' Specialist',
            startDate: '2023-08',
            endDate: '2025-12',
            isCurrentlyWorking: false,
            description: `Làm việc ở vai trò kỹ sư chuyên môn, tham gia nhiều dự án về lĩnh vực ${profile.careerField}. Sử dụng các công nghệ như ${profile.primarySkills.slice(0, 3).join(', ')}.`,
            yearsOfExperience: '2'
          }
        ],
        rawText: `Họ tên: ${profile.fullName}\nEmail: ${appUser.email}\nĐiện thoại: ${appUser.phone}\nNgành nghề: ${profile.careerField}\nKỹ năng: ${profile.primarySkills.join(', ')}\nKinh nghiệm: 2 năm kinh nghiệm làm việc tại FPT Software.`
      },
      processingStatus: 'completed',
      isActive: true
    };
    const newResume = await Resume.create(resumeData);
    resumes.push(newResume);

    // Link resume back to applicant profile
    appUser.profile.currentResumeId = newResume._id;
    appUser.profile.resume = {
      fileName: newResume.fileName,
      uploadDate: new Date(),
      fileSize: newResume.fileSize
    };
    await appUser.save();
  }
  console.log(`Seeded ${resumes.length} Resumes.`);

  // 4. Seed Applications
  console.log('Seeding Applications...');
  let appCount = 0;
  const applications = [];

  // Define some mapping of applicant index to jobs to create realistic matches
  // Applicants:
  // 0: Tuấn Anh (NodeJS, ReactJS, MongoDB, Express, JavaScript) - IT
  // 1: Minh Bảo (Python, FastAPI, PyTorch, NLP, TensorFlow) - IT/AI
  // 2: Khánh Chi (Selenium, Automation Testing, Manual Testing, Jira, Postman) - QA
  // 3: Hoàng Duy (C#, ASP.NET Core, SQL Server, REST API) - IT/C#
  // 5: Trường Giang (SEO, Content Marketing, Google Ads, Facebook Ads) - Marketing
  // 6: Thanh Hải (Excel, Financial Analysis, Tax Accounting) - Kế toán
  // 7: Duy Khánh (Communication, Problem Solving, CRM) - CS
  // 12: Hà Phương (SQL, Python, Power BI, Tableau) - Data Analyst
  // 14: Hồng Sơn (AWS, Docker, Kubernetes, CI/CD) - DevOps

  const appMappings = [
    // [applicant_idx, job_idx, status, scoreOverride, isAtsRejected]
    [0, 0, 'offer_accepted', 88, false], // Tuấn Anh nộp Backend (NodeJS) - Đạt nhận việc (88đ)
    [0, 5, 'interview_confirmed', 82, false], // Tuấn Anh nộp Frontend (ReactJS)
    [0, 11, 'submitted', 85, false], // Tuấn Anh nộp Fullstack (NodeJS & ReactJS)
    [1, 1, 'interview_scheduled', 92, false], // Minh Bảo nộp AI/ML Engineer (92đ)
    [1, 9, 'under_review', 68, false], // Minh Bảo nộp DevOps (68đ)
    [1, 3, 'rejected', 42, true], // AI nộp nhầm Marketing -> ATS Auto Reject (42đ)
    [2, 2, 'interview_confirmed', 86, false], // Khánh Chi nộp QA/Automation (86đ)
    [2, 0, 'rejected', 52, true], // QA nộp NodeJS Backend -> ATS Auto Reject (52đ)
    [3, 0, 'under_review', 74, false], // Hoàng Duy nộp NodeJS Backend (74đ)
    [3, 11, 'submitted', 78, false], // Hoàng Duy nộp Fullstack
    [5, 3, 'shortlisted', 84, false], // Trường Giang nộp Marketing (84đ)
    [5, 0, 'rejected', 30, true], // Marketing nộp NodeJS Backend -> ATS Auto Reject (30đ)
    [6, 4, 'offer_extended', 89, false], // Thanh Hải nộp Kế toán (89đ)
    [7, 10, 'interview_passed', 80, false], // Duy Khánh nộp CS (80đ)
    [12, 6, 'interview_confirmed', 85, false], // Hà Phương nộp Data Analyst (85đ)
    [12, 1, 'under_review', 70, false], // Hà Phương nộp AI/ML
    [14, 9, 'offer_accepted', 91, false], // Hồng Sơn nộp DevOps (91đ)
    [14, 0, 'submitted', 72, false]  // Hồng Sơn nộp Backend (72đ)
  ];

  // We will generate the rest dynamically to reach around 40 applications
  const activeJobs = jobs.filter(j => j.status === 'active');

  for (let idx = 0; idx < appMappings.length; idx++) {
    const [candIdx, jobIdx, status, score, isAtsRejected] = appMappings[idx];
    const candidate = applicants[candIdx];
    const job = jobs[jobIdx];
    const resume = resumes[candIdx];

    if (!candidate || !job || !resume) continue;

    const key = `${job._id}-${candidate._id}`;

    const expValue = candIdx === 6 || candIdx === 14 ? 'senior' : (candIdx === 7 ? 'fresher' : 'mid-level');

    // Create application
    const appData = {
      job: job._id,
      applicant: candidate._id,
      status: status,
      personalInfo: {
        firstName: candidate.firstName,
        lastName: candidate.lastName,
        email: candidate.email,
        phone: candidate.phone
      },
      useProfileResume: true,
      profileResumeId: resume._id,
      skills: candidate.profile.skills,
      experience: expValue,
      expectedSalary: {
        min: 15000000 + Math.floor(Math.random() * 10000000),
        max: 30000000 + Math.floor(Math.random() * 15000000),
        currency: 'VND'
      },
      coverLetter: `Tôi rất ấn tượng với sứ mệnh của quý công ty và tin rằng kỹ năng ${candidate.profile.skills.slice(0, 3).join(', ')} của tôi sẽ đóng góp hiệu quả cho vị trí ${job.title}.`,
      aiProcessing: {
        status: 'done',
        startedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
        finishedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000 + 4000),
        engine: job.atsEngine
      },
      timeline: [
        {
          status: 'submitted',
          date: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
          note: 'Hồ sơ đã được nộp trực tuyến.'
        }
      ],
      notes: []
    };

    // Populate AI Analysis
    const finalScore = score;
    const embScore = Math.min(100, Math.max(0, finalScore + (Math.random() * 10 - 5)));
    const rerScore = Math.min(100, Math.max(0, finalScore + (Math.random() * 6 - 3)));

    appData.aiAnalysis = {
      resumeScore: finalScore,
      skillsMatch: Math.round(embScore),
      experienceMatch: Math.round(rerScore),
      overallScore: finalScore,
      keyStrengths: finalScore >= 70 ? [
        `Hồ sơ ứng viên có các kỹ năng phù hợp cao với yêu cầu của Job (${candidate.profile.skills.slice(0, 2).join(', ')})`,
        `Kinh nghiệm làm việc tương ứng với vị trí và lĩnh vực công việc.`,
        `Hồ sơ thể hiện rõ các dự án thực tiễn đã thực hiện.`
      ] : [`Có kỹ năng nền tảng cơ bản về lĩnh vực.`],
      potentialConcerns: finalScore < 60 ? [
        `Một số kỹ năng bắt buộc trong JD chưa thấy xuất hiện rõ ràng trong CV.`,
        `Mức độ phù hợp ngữ nghĩa chi tiết ở mức trung bình thấp.`
      ] : [`Không phát hiện vấn đề lớn nào trong hồ sơ.`],
      recommendedQuestions: finalScore >= 70 ? [
        `Hãy kể thêm về dự án nổi bật nhất của bạn sử dụng ${candidate.profile.skills[0]}?`,
        `Bạn đã giải quyết các khó khăn gì khi làm việc nhóm trong dự án trước?`
      ] : [
        `Bạn có kinh nghiệm thực tế nào với kỹ năng được yêu cầu trong JD chưa?`
      ],
      analysisDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      atsEngine: job.atsEngine,
      scanDetails: {
        embedding_score: Math.round(embScore),
        rerank_score: Math.round(rerScore),
        rerank_raw: Math.round(rerScore - 2),
        final_score: finalScore,
        explanation: finalScore >= 75 ? 'Strong match' : (finalScore >= 50 ? 'Moderate match' : 'Low match'),
        breakdown: {
          blend: "0.3 * embedding + 0.7 * rerank",
          boost_strong_pair: finalScore > 80,
          soft_rules: "applied"
        }
      },
      extractedInfo: {
        skills: candidate.profile.skills,
        personalInfo: {
          name: `${candidate.lastName} ${candidate.firstName}`,
          title: candidate.profile.skills[0] + ' Engineer'
        },
        contactInfo: {
          email: candidate.email,
          phone: candidate.phone
        }
      }
    };

    if (isAtsRejected) {
      appData.status = 'rejected';
      appData.timeline.push({
        status: 'rejected',
        date: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000 + 4000),
        note: `ATS_AUTO_REJECT (${finalScore}% < ${job.atsResumeThreshold}%)`,
        updatedBy: admin._id // admin / system id
      });
    } else {
      if (status !== 'submitted') {
        appData.timeline.push({
          status: status,
          date: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
          note: `Recruiter đã cập nhật trạng thái đơn ứng tuyển thành ${status}.`,
          updatedBy: job.postedBy
        });
      }
    }

    try {
      const newApp = await Application.create(appData);
      applications.push(newApp);
      // Update job applications count
      await Job.findByIdAndUpdate(job._id, { $inc: { applicationsCount: 1 } });
      appCount++;
    } catch (e) {
      console.log(`Skipping duplicate or invalid: ${key}`);
    }
  }

  // Create additional generic applications to reach 40
  let applicantsPoolIndex = 4; // Start pooling other candidates
  let jobPoolIndex = 0;

  while (appCount < 40) {
    const candidate = applicants[applicantsPoolIndex % applicants.length];
    const job = jobs[jobPoolIndex % jobs.length];
    const resume = resumes[applicantsPoolIndex % resumes.length];

    if (candidate && job && resume) {
      const existingApp = await Application.findOne({ job: job._id, applicant: candidate._id });

      if (!existingApp) {
        const statuses = ['submitted', 'under_review', 'shortlisted', 'rejected'];
        const status = statuses[appCount % statuses.length];
        const score = 50 + Math.floor(Math.random() * 40); // 50 to 90
        const isAtsRejected = job.atsEnabled && score < job.atsResumeThreshold && status === 'rejected';

        const appData = {
          job: job._id,
          applicant: candidate._id,
          status: isAtsRejected ? 'rejected' : status,
          personalInfo: {
            firstName: candidate.firstName,
            lastName: candidate.lastName,
            email: candidate.email,
            phone: candidate.phone
          },
          useProfileResume: true,
          profileResumeId: resume._id,
          skills: candidate.profile.skills,
          experience: 'mid-level',
          expectedSalary: {
            min: 12000000,
            max: 25000000,
            currency: 'VND'
          },
          coverLetter: 'Kính gửi nhà tuyển dụng, tôi muốn ứng tuyển vào vị trí này.',
          aiProcessing: {
            status: 'done',
            startedAt: new Date(),
            finishedAt: new Date()
          },
          timeline: [
            {
              status: 'submitted',
              date: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
              note: 'Hồ sơ đã được nộp trực tuyến.'
            }
          ]
        };

        appData.aiAnalysis = {
          resumeScore: score,
          skillsMatch: score,
          experienceMatch: score,
          overallScore: score,
          keyStrengths: ['Đáp ứng yêu cầu kỹ thuật tối thiểu'],
          potentialConcerns: score < 60 ? ['Thiếu một số kỹ năng thực chiến'] : [],
          recommendedQuestions: ['Hãy nói về kinh nghiệm làm việc gần đây nhất?'],
          atsEngine: job.atsEngine
        };

        if (isAtsRejected) {
          appData.timeline.push({
            status: 'rejected',
            date: new Date(),
            note: `ATS_AUTO_REJECT (${score}% < ${job.atsResumeThreshold}%)`
          });
        } else if (status !== 'submitted') {
          appData.timeline.push({
            status: status,
            date: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
            note: 'Trạng thái được cập nhật.'
          });
        }

        try {
          const newApp = await Application.create(appData);
          applications.push(newApp);
          await Job.findByIdAndUpdate(job._id, { $inc: { applicationsCount: 1 } });
          appCount++;
        } catch (err) {
          // ignore error
        }
      }
    }
    applicantsPoolIndex++;
    jobPoolIndex++;
  }
  console.log(`Seeded ${applications.length} Applications.`);

  // 5. Seed Interviews
  console.log('Seeding Interviews...');
  const interviews = [];
  const scheduledApps = applications.filter(a => ['interview_scheduled', 'interview_confirmed', 'interview_passed'].includes(a.status));
  const recruiterUserIds = recruiters.map(h => h._id);

  for (let i = 0; i < scheduledApps.length; i++) {
    const app = scheduledApps[i];
    const jobDoc = jobs.find(j => j._id.toString() === app.job.toString());
    const hrRecruiterId = jobDoc ? jobDoc.postedBy : recruiterUserIds[0];

    const isConfirmed = app.status === 'interview_confirmed' || app.status === 'interview_passed';

    const interviewData = {
      application: app._id,
      interviewer: hrRecruiterId, // Recruiter is the interviewer
      scheduledBy: hrRecruiterId,
      type: i % 2 === 0 ? 'video' : 'in-person',
      scheduledDate: new Date(now.getTime() + (i + 1) * 24 * 60 * 60 * 1000), // scheduled for next few days
      scheduledTime: `1${i % 8}:00`, // e.g. 10:00, 11:00, etc.
      duration: 60,
      round: 1,
      status: isConfirmed ? 'confirmed' : 'scheduled',
      meetingLink: i % 2 === 0 ? 'https://meet.google.com/abc-defg-hij' : undefined,
      location: i % 2 !== 0 ? 'Phòng họp A, Tầng 4, Tòa nhà FindMe, TP. HCM' : undefined,
      notes: 'Phỏng vấn kỹ thuật và đánh giá văn hóa phù hợp.',
      meetingDetails: i % 2 === 0 ? {
        meetingLink: 'https://meet.google.com/abc-defg-hij',
        meetingId: 'abc-defg-hij',
        passcode: '123456'
      } : undefined
    };

    if (app.status === 'interview_passed') {
      interviewData.status = 'completed';
      interviewData.completedAt = new Date();
      interviewData.feedback = {
        overallRating: 4,
        technicalSkills: 4,
        communicationSkills: 4,
        problemSolving: 5,
        culturalFit: 4,
        strengths: ['Nắm chắc lý thuyết cốt lõi', 'Giao tiếp rõ ràng, tự tin'],
        weaknesses: ['Chưa có nhiều kinh nghiệm thực chiến với các dự án lớn'],
        recommendation: 'recommend',
        additionalNotes: 'Ứng viên có tiềm năng lớn. Khuyên nghị tuyển dụng.',
        submittedAt: new Date()
      };
    }

    const newInterview = await Interview.create(interviewData);
    interviews.push(newInterview);

    // Link back to application
    app.interviews.push(newInterview._id);
    if (app.status === 'interview_scheduled' && !isConfirmed) {
      app.interviewInvite = {
        scheduledAt: interviewData.scheduledDate,
        jobAddressLine: interviewData.location || 'Trực tuyến',
        venueOrLink: interviewData.meetingLink || interviewData.location,
        hrNote: 'Hân hạnh mời bạn tham gia phỏng vấn cùng công ty.'
      };
    } else if (isConfirmed) {
      app.interviewInvite = {
        scheduledAt: interviewData.scheduledDate,
        jobAddressLine: interviewData.location || 'Trực tuyến',
        venueOrLink: interviewData.meetingLink || interviewData.location,
        hrNote: 'Hân hạnh mời bạn tham gia phỏng vấn cùng công ty.',
        confirmedAt: new Date(now.getTime() - 12 * 60 * 60 * 1000)
      };
    }
    await app.save();
  }
  console.log(`Seeded ${interviews.length} Interviews.`);

  // 6. Seed Notifications
  console.log('Seeding Notifications...');
  const notifications = [];

  // Notifications for Recruiters (application submitted, interview confirmed)
  for (const recruiter of recruiters) {
    const hrJobs = jobs.filter(j => j.postedBy.toString() === recruiter._id.toString());
    const hrJobIds = hrJobs.map(j => j._id.toString());
    const jobApps = applications.filter(a => hrJobIds.includes(a.job.toString()));

    if (jobApps.length > 0) {
      // Notification 1: New Application
      const app1 = jobApps[0];
      const job1 = hrJobs.find(j => j._id.toString() === app1.job.toString());
      const notifHR1 = {
        user: recruiter._id,
        role: 'recruiter',
        type: 'application_submitted',
        title: 'Có đơn ứng tuyển mới',
        message: `Ứng viên ${app1.personalInfo.lastName} ${app1.personalInfo.firstName} vừa nộp đơn vào vị trí ${job1 ? job1.title : 'của bạn'}.`,
        actionUrl: `/recruiter/applications`,
        entity: { kind: 'Application', id: app1._id },
        priority: 'medium',
        read: false
      };
      notifications.push(await Notification.create(notifHR1));

      // Notification 2: Interview confirmed
      const confirmedApp = jobApps.find(a => a.status === 'interview_confirmed');
      if (confirmedApp) {
        const notifHR2 = {
          user: recruiter._id,
          role: 'recruiter',
          type: 'interview',
          title: 'Ứng viên đã xác nhận phỏng vấn',
          message: `Ứng viên ${confirmedApp.personalInfo.lastName} ${confirmedApp.personalInfo.firstName} đã xác nhận lịch mời phỏng vấn.`,
          actionUrl: `/recruiter/applications`,
          entity: { kind: 'Application', id: confirmedApp._id },
          priority: 'high',
          read: false
        };
        notifications.push(await Notification.create(notifHR2));
      }
    }
  }

  // Notifications for Applicants (ATS status, status change, invite)
  for (const app of applications) {
    const cand = applicants.find(c => c._id.toString() === app.applicant.toString());
    if (!cand) continue;

    const jobDoc = jobs.find(j => j._id.toString() === app.job.toString());
    const jobTitle = jobDoc ? jobDoc.title : 'vị trí đã ứng tuyển';

    // Seed appropriate notifications based on application status
    if (app.status === 'rejected' && app.timeline.some(t => t.note && t.note.includes('ATS_AUTO_REJECT'))) {
      // ATS auto reject
      const notifApp = {
        user: cand._id,
        role: 'applicant',
        type: 'application_status_changed',
        title: 'Kết quả đánh giá hồ sơ',
        message: `Rất tiếc, hồ sơ của bạn cho vị trí ${jobTitle} chưa phù hợp với các tiêu chí tự động tại thời điểm này.`,
        actionUrl: `/applicant/applications`,
        entity: { kind: 'Application', id: app._id },
        priority: 'medium',
        read: false
      };
      notifications.push(await Notification.create(notifApp));
    } else if (app.status === 'interview_scheduled') {
      // Interview scheduled notification
      const notifApp = {
        user: cand._id,
        role: 'applicant',
        type: 'interview_scheduled',
        title: 'Thư mời phỏng vấn',
        message: `Chúc mừng! Bạn đã nhận được lời mời phỏng vấn cho vị trí ${jobTitle}. Vui lòng mở trang để xác nhận lịch phỏng vấn.`,
        actionUrl: `/applicant/confirm-interview?applicationId=${app._id}`,
        entity: { kind: 'Application', id: app._id },
        priority: 'high',
        read: false
      };
      notifications.push(await Notification.create(notifApp));
    } else if (app.status === 'offer_extended') {
      const notifApp = {
        user: cand._id,
        role: 'applicant',
        type: 'application_status_changed',
        title: 'Thông báo kết quả tuyển dụng',
        message: `Chúc mừng! Bạn đã nhận được lời mời nhận việc cho vị trí ${jobTitle}.`,
        actionUrl: `/applicant/applications`,
        entity: { kind: 'Application', id: app._id },
        priority: 'high',
        read: false
      };
      notifications.push(await Notification.create(notifApp));
    }
  }
  console.log(`Seeded ${notifications.length} Notifications.`);

  // 7. Seed JobStatusChangeRequests
  console.log('Seeding JobStatusChangeRequests...');
  const requests = [];

  // Create a few status change requests
  for (let i = 0; i < 3; i++) {
    const job = jobs[i % jobs.length];
    const recruiter = recruiters[i % recruiters.length];

    const reqData = {
      job: job._id,
      requestedBy: recruiter._id,
      requestedStatus: i === 0 ? 'active' : (i === 1 ? 'closed' : 'draft'),
      previousStatus: job.status,
      message: i === 0 ? 'Xin phê duyệt mở lại tin tuyển dụng này do nhu cầu dự án đang gấp.' : 'Đã tuyển đủ người cho vị trí này, xin đóng tin.',
      reviewStatus: i === 0 ? 'pending' : (i === 1 ? 'approved' : 'rejected'),
      reviewedBy: i !== 0 ? admin._id : undefined,
      reviewNote: i === 1 ? 'Duyệt đóng tin theo yêu cầu.' : (i === 2 ? 'Không duyệt. Cần thảo luận thêm.' : undefined)
    };

    const newReq = await JobStatusChangeRequest.create(reqData);
    requests.push(newReq);
  }
  console.log(`Seeded ${requests.length} JobStatusChangeRequests.`);

  console.log('\n=========================================');
  console.log('DEMO DATA SEEDING COMPLETED SUCCESSFULLY!');
  console.log('Summary of Seeded Data:');
  console.log(`- Users: ${1 + recruiters.length + applicants.length} (1 Admin, ${recruiters.length} Recruiters, ${applicants.length} Applicants)`);
  console.log(`- Jobs: ${jobs.length}`);
  console.log(`- Resumes: ${resumes.length}`);
  console.log(`- Applications: ${applications.length}`);
  console.log(`- Interviews: ${interviews.length}`);
  console.log(`- Notifications: ${notifications.length}`);
  console.log(`- JobStatusChangeRequests: ${requests.length}`);
  console.log('=========================================\n');
}

async function runSeed() {
  try {
    await seedDemoData();
    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('Seed demo data failed:', err);
    try {
      await mongoose.connection.close();
    } catch (_) {}
    process.exit(1);
  }
}

if (require.main === module) {
  runSeed();
}

module.exports = {
  seedDemoData,
  runSeed
};

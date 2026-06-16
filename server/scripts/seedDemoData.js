require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// Import Models
const User = require("../global/models/User");
const Job = require("../global/models/Job");
const Resume = require("../global/models/Resume");
const Application = require("../global/models/Application");
const Interview = require("../global/models/Interview");
const Notification = require("../global/models/Notification");
const JobStatusChangeRequest = require("../global/models/JobStatusChangeRequest");
const Company = require("../global/models/Company");

const DEFAULT_PASSWORD = "pwd"; // Default password for demo users

const jobBaseTemplates = [
  {
    title: "Kỹ sư Lập trình Backend (NodeJS)",
    department: "Kỹ thuật",
    jobType: "Full-time",
    location: "Hồ Chí Minh",
    locationType: "Hybrid",
    salaryRange: { min: "20000000", max: "35000000" },
    requiredSkills: ["NodeJS", "ReactJS", "MongoDB", "JavaScript"],
    preferredSkills: ["Express", "Redis", "Docker", "Kubernetes"],
    experienceLevel: "Middle",
    description:
      "Chúng tôi đang tìm kiếm một Backend Developer (NodeJS) tài năng để phát triển hệ thống và xử lý logic nghiệp vụ hiệu năng cao.",
    requirements:
      "Ít nhất 2 năm kinh nghiệm làm việc với NodeJS. Hiểu biết sâu về cơ sở dữ liệu MongoDB/NoSQL. Có kinh nghiệm xây dựng RESTful APIs.",
    benefits:
      "Lương thưởng cạnh tranh. Lương tháng 13+. Bảo hiểm sức khỏe cao cấp.",
  },
  {
    title: "Kỹ sư Lập trình Frontend (ReactJS)",
    department: "Kỹ thuật",
    jobType: "Full-time",
    location: "Hồ Chí Minh",
    locationType: "Hybrid",
    salaryRange: { min: "20000000", max: "32000000" },
    requiredSkills: ["ReactJS", "JavaScript", "Figma"],
    preferredSkills: ["TailwindCSS", "Redux", "TypeScript", "CSS"],
    experienceLevel: "Middle",
    description:
      "Xây dựng giao diện web ứng dụng hiện đại, phản hồi nhanh và tối ưu trải nghiệm tuyển dụng cho người dùng.",
    requirements:
      "Thành thạo ReactJS và các công cụ quản lý state. Có tư duy UI/UX tốt. Biết sử dụng Figma để cắt ghép giao diện.",
    benefits:
      "Làm việc cùng các kỹ sư tài năng. Cơ hội học hỏi công nghệ mới. Teambuilding hàng quý.",
  },
  {
    title: "Kỹ sư Phát triển Trí tuệ nhân tạo (AI/ML)",
    department: "Kỹ thuật",
    jobType: "Full-time",
    location: "Hà Nội",
    locationType: "Onsite",
    salaryRange: { min: "30000000", max: "60000000" },
    requiredSkills: ["Python", "FastAPI", "PyTorch", "NLP"],
    preferredSkills: [
      "TensorFlow",
      "LLM",
      "Sentence Transformers",
      "Transformers",
    ],
    experienceLevel: "Middle",
    description:
      "Tham gia nghiên cứu và triển khai các mô hình AI/ML, xử lý ngôn ngữ tự nhiên (NLP) phục vụ cho hệ thống lọc CV và tìm kiếm thông minh.",
    requirements:
      "Có kinh nghiệm lập trình Python vững chắc. Thành thạo PyTorch hoặc TensorFlow. Đã từng làm việc với các thư viện NLP và Transformer.",
    benefits:
      "Môi trường R&D chuyên nghiệp. Hỗ trợ thiết bị cấu hình cao (GPU). Cơ hội thăng tiến nhanh.",
  },
  {
    title: "Chuyên viên Kiểm thử tự động (Automation QA)",
    department: "Kỹ thuật",
    jobType: "Full-time",
    location: "Hồ Chí Minh",
    locationType: "Hybrid",
    salaryRange: { min: "18000000", max: "28000000" },
    requiredSkills: ["Selenium", "Automation Testing", "Postman"],
    preferredSkills: ["Jira", "API Testing", "Java", "CI/CD"],
    experienceLevel: "Middle",
    description:
      "Thiết kế kịch bản kiểm thử tự động, thực thi test suite và đảm bảo chất lượng phần mềm trước khi phát hành sản phẩm.",
    requirements:
      "Trên 2 năm kinh nghiệm kiểm thử tự động với Selenium. Kỹ năng kiểm thử API bằng Postman. Có hiểu biết về quy trình Agile/Scrum.",
    benefits:
      "Tham gia các khóa đào tạo chuyên sâu. Nghỉ phép 14 ngày/năm. Teambuilding hàng quý.",
  },
  {
    title: "Chuyên viên Digital Marketing",
    department: "Marketing",
    jobType: "Full-time",
    location: "Đà Nẵng",
    locationType: "Onsite",
    salaryRange: { min: "12000000", max: "20000000" },
    requiredSkills: ["SEO", "Content Marketing", "Google Ads"],
    preferredSkills: ["Facebook Ads", "Google Analytics", "Photoshop"],
    experienceLevel: "Middle",
    description:
      "Quản lý chiến dịch quảng cáo kỹ thuật số, tối ưu hóa công cụ tìm kiếm (SEO) và phát triển các kênh truyền thông xã hội.",
    requirements:
      "Hiểu rõ các thuật toán SEO. Kinh nghiệm thiết lập chiến dịch Google Ads, Facebook Ads hiệu quả. Sáng tạo nội dung cuốn hút.",
    benefits:
      "Thưởng theo KPI hấp dẫn. Môi trường trẻ trung, sáng tạo. Đồ ăn nhẹ miễn phí.",
  },
  {
    title: "Kế toán tổng hợp (Senior Accountant)",
    department: "Tài chính",
    jobType: "Full-time",
    location: "Hồ Chí Minh",
    locationType: "Onsite",
    salaryRange: { min: "15000000", max: "22000000" },
    requiredSkills: ["Excel", "Tax Accounting", "MISA"],
    preferredSkills: ["Financial Analysis", "Auditing", "ERP systems"],
    experienceLevel: "Senior",
    description:
      "Chịu trách nhiệm thực hiện các nghiệp vụ kế toán tổng hợp, quyết toán thuế, đối chiếu công nợ và lập báo cáo tài chính hàng tháng.",
    requirements:
      "Tốt nghiệp đại học chuyên ngành Kế toán/Kiểm toán. Trên 3 năm kinh nghiệm ở vị trí tương đương. Sử dụng thành thạo phần mềm MISA.",
    benefits:
      "Lương thưởng ổn định. Cơ hội thăng tiến lên Kế toán trưởng. Môi trường công sở thân thiện.",
  },
  {
    title: "Chuyên viên Phân tích dữ liệu (Data Analyst)",
    department: "Kinh doanh",
    jobType: "Full-time",
    location: "Hồ Chí Minh",
    locationType: "Remote",
    salaryRange: { min: "18000000", max: "30000000" },
    requiredSkills: ["SQL", "Python", "Power BI"],
    preferredSkills: ["Tableau", "Data Analysis", "Excel"],
    experienceLevel: "Middle",
    description:
      "Phân tích dữ liệu kinh doanh, lập báo cáo trực quan hóa (Dashboard) hỗ trợ ban giám đốc đưa ra các quyết định chiến lược.",
    requirements:
      "Khả năng viết truy vấn SQL phức tạp tốt. Sử dụng thành thạo Python để làm sạch dữ liệu. Có kinh nghiệm dựng dashboard trên Power BI.",
    benefits:
      "Làm việc từ xa linh hoạt. Cung cấp máy tính xách tay làm việc. Tham gia các chương trình đào tạo quốc tế.",
  },
  {
    title: "Nhà thiết kế Giao diện UI/UX",
    department: "Thiết kế",
    jobType: "Full-time",
    location: "Hồ Chí Minh",
    locationType: "Hybrid",
    salaryRange: { min: "15000000", max: "25000000" },
    requiredSkills: ["Figma", "UI/UX Design", "Photoshop"],
    preferredSkills: [
      "Illustrator",
      "Wireframing",
      "Prototyping",
      "User Research",
    ],
    experienceLevel: "Middle",
    description:
      "Thiết kế giao diện và trải nghiệm người dùng cho các sản phẩm web và ứng dụng di động của công ty.",
    requirements:
      "Có portfolio thiết kế giao diện đa dạng và trực quan. Sử dụng thành thạo Figma. Hiểu biết sâu về wireframing và prototyping.",
    benefits:
      "Môi trường làm việc thoải mái, sáng tạo. Thưởng dự án hấp dẫn. Lương tháng 13.",
  },
  {
    title: "Chuyên viên Phân tích nghiệp vụ (BA)",
    department: "Kinh doanh",
    jobType: "Full-time",
    location: "Hồ Chí Minh",
    locationType: "Onsite",
    salaryRange: { min: "18000000", max: "28000000" },
    requiredSkills: ["Business Analysis", "UML", "User Stories"],
    preferredSkills: ["SQL", "Figma", "Jira", "Agile"],
    experienceLevel: "Middle",
    description:
      "Làm việc trực tiếp với khách hàng để thu thập yêu cầu nghiệp vụ, dịch chuyển thành tài liệu phân tích hệ thống phục vụ đội phát triển.",
    requirements:
      "Có kỹ năng phân tích và mô hình hóa quy trình (UML, User Stories). Kỹ năng giao tiếp và đàm phán tốt. Sử dụng thành thạo Jira.",
    benefits:
      "Đào tạo kỹ năng mềm. Bảo hiểm y tế đầy đủ. Môi trường trẻ, cởi mở.",
  },
  {
    title: "Kỹ sư DevOps (DevOps Engineer)",
    department: "Kỹ thuật",
    jobType: "Full-time",
    location: "Hà Nội",
    locationType: "Hybrid",
    salaryRange: { min: "30000000", max: "50000000" },
    requiredSkills: ["AWS", "Docker", "Kubernetes"],
    preferredSkills: ["CI/CD", "Linux", "Bash", "Terraform"],
    experienceLevel: "Senior",
    description:
      "Quản lý, vận hành và tối ưu hóa hệ thống máy chủ đám mây, xây dựng quy trình triển khai tự động CI/CD cho các dự án phần mềm.",
    requirements:
      "Thành thạo các dịch vụ của AWS. Có kinh nghiệm vận hành cụm Kubernetes trong môi trường production. Thành thạo script Bash/Linux.",
    benefits:
      "Thưởng hiệu năng cuối năm cao. Môi trường chuyên nghiệp. Chăm sóc sức khỏe định kỳ.",
  },
  {
    title: "Nhân viên Chăm sóc khách hàng (Customer Support)",
    department: "Hỗ trợ",
    jobType: "Full-time",
    location: "Hồ Chí Minh",
    locationType: "Onsite",
    salaryRange: { min: "9000000", max: "14000000" },
    requiredSkills: ["Communication", "Problem Solving", "Customer Relations"],
    preferredSkills: ["CRM", "Zendesk", "Email Etiquette"],
    experienceLevel: "Fresher",
    description:
      "Tiếp nhận các cuộc gọi, email và tin nhắn từ khách hàng để hỗ trợ giải đáp thắc mắc và giải quyết các khiếu nại liên quan đến dịch vụ.",
    requirements:
      "Giao tiếp tốt, giọng nói dễ nghe, không ngọng. Khả năng xử lý tình huống linh hoạt. Có thể làm việc xoay ca.",
    benefits:
      "Hỗ trợ tiền gửi xe, cơm trưa. Chế độ bảo hiểm theo luật lao động. Thưởng chuyên cần.",
  },
  {
    title: "Kỹ sư Lập trình Fullstack (NodeJS & ReactJS)",
    department: "Kỹ thuật",
    jobType: "Full-time",
    location: "Hồ Chí Minh",
    locationType: "Hybrid",
    salaryRange: { min: "25000000", max: "45000000" },
    requiredSkills: ["NodeJS", "ReactJS", "MongoDB", "JavaScript"],
    preferredSkills: ["Express", "TailwindCSS", "Redux", "TypeScript"],
    experienceLevel: "Middle",
    description:
      "Phát triển cả phần Frontend lẫn Backend cho hệ thống sản phẩm cốt lõi của công ty, tham gia tối ưu mã nguồn và cấu trúc cơ sở dữ liệu.",
    requirements:
      "Đã có kinh nghiệm làm việc ở cả ReactJS và NodeJS. Khả năng thiết kế database và viết query tối ưu. Thành thạo GIT.",
    benefits:
      "Nhận gói trợ cấp thiết bị làm việc. Tham gia hoạt động teambuilding định kỳ. Cơ hội thăng tiến mở rộng.",
  },
];

async function seedDemoData() {
  const mongoURI =
    process.env.MONGODB_URI ||
    process.env.MONGODB_URI_PROD ||
    "mongodb://127.0.0.1:27017/findme";
  console.log(`Connecting to MongoDB at: ${mongoURI}`);
  await mongoose.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log("MongoDB connected successfully.");

  console.log("Clearing existing database collections...");
  await User.deleteMany({});
  await Company.deleteMany({});
  await Job.deleteMany({});
  await Resume.deleteMany({});
  await Application.deleteMany({});
  await Interview.deleteMany({});
  await Notification.deleteMany({});
  await JobStatusChangeRequest.deleteMany({});
  console.log("Cleared all collections.");

  const hashedAdminPassword = await bcrypt.hash("admin", 10);
  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  // 1. Create Admin
  console.log("Seeding Admin User...");
  const adminData = {
    firstName: "Quản trị",
    lastName: "Hệ thống",
    email: "admin@findme.com",
    password: hashedAdminPassword,
    role: "admin",
    accountStatus: "active",
    emailVerifiedAt: new Date(),
    phone: "0901234567",
    location: "Hà Nội",
    avatar:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150&h=150&fit=crop",
    profilePicture:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150&h=150&fit=crop",
    isActive: true,
  };
  const admin = await User.create(adminData);
  console.log("Seeded Admin account: admin@findme.com / admin");

  // 2. Create Recruiters and Companies
  console.log("Seeding 10 Companies and 10 Recruiters...");
  const recruiters = [];
  const companies = [];

  const recruiterTemplates = [
    {
      firstName: "Hương",
      lastName: "Vũ",
      email: "recruiter@findme.com",
      dept: "Nhân sự",
      phone: "0952345678",
      avatar:
        "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=150&h=150&fit=crop",
    },
    {
      firstName: "Dũng",
      lastName: "Hoàng",
      email: "recruiter.viettel@findme.com",
      dept: "Nhân sự",
      phone: "0912345671",
      avatar:
        "https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=150&h=150&fit=crop",
    },
    {
      firstName: "Linh",
      lastName: "Phạm",
      email: "recruiter.vng@findme.com",
      dept: "Tuyển dụng",
      phone: "0912345672",
      avatar:
        "https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=150&h=150&fit=crop",
    },
    {
      firstName: "Minh",
      lastName: "Trần",
      email: "recruiter.vingroup@findme.com",
      dept: "Nhân sự",
      phone: "0912345673",
      avatar:
        "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=150&h=150&fit=crop",
    },
    {
      firstName: "Thảo",
      lastName: "Nguyễn",
      email: "recruiter.techcombank@findme.com",
      dept: "Nhân sự",
      phone: "0912345674",
      avatar:
        "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=150&h=150&fit=crop",
    },
    {
      firstName: "Hùng",
      lastName: "Lê",
      email: "recruiter.shopee@findme.com",
      dept: "Talent Acquisition",
      phone: "0912345675",
      avatar:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150&h=150&fit=crop",
    },
    {
      firstName: "An",
      lastName: "Đỗ",
      email: "recruiter.grab@findme.com",
      dept: "HR Dept",
      phone: "0912345676",
      avatar:
        "https://images.unsplash.com/photo-1534751516642-a131ffd103fd?q=80&w=150&h=150&fit=crop",
    },
    {
      firstName: "Quỳnh",
      lastName: "Vũ",
      email: "recruiter.f88@findme.com",
      dept: "Nhân sự",
      phone: "0912345677",
      avatar:
        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=150&h=150&fit=crop",
    },
    {
      firstName: "Thất",
      lastName: "Bại",
      email: "recruiter.devfail@findme.com",
      dept: "Chất lượng",
      phone: "0912345678",
      avatar:
        "https://images.unsplash.com/photo-1551836022-d5d88e9218df?q=80&w=150&h=150&fit=crop",
    },
    {
      firstName: "Bịp",
      lastName: "Nguyễn",
      email: "recruiter.scam@findme.com",
      dept: "Đầu tư",
      phone: "0912345679",
      avatar:
        "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=150&h=150&fit=crop",
    },
  ];

  const companyTemplates = [
    {
      name: "Công ty Cổ phần FPT Software",
      logo: "/uploads/company-logos/fpt.png",
      description:
        "FPT Software là nhà cung cấp dịch vụ công nghệ và CNTT hàng đầu thế giới có trụ sở tại Việt Nam.",
      industry: "Công nghệ thông tin",
      size: "10000+ nhân viên",
      website: "fptsoftware.com",
      address: "Tòa nhà FPT, Phố Duy Tân, Cầu Giấy, Hà Nội",
      email: "hr@fpt-software.com",
      phone: "02437689048",
      taxCode: "0101248141",
      businessLicenseNumber: "GP-0101248141",
      verificationStatus: "approved",
      status: "active",
    },
    {
      name: "Tập đoàn Công nghiệp - Viễn thông Quân đội Viettel",
      logo: "/uploads/company-logos/viettel.png",
      description:
        "Viettel là tập đoàn viễn thông và công nghệ lớn nhất Việt Nam, hoạt động đa quốc gia.",
      industry: "Viễn thông & CNTT",
      size: "5000+ nhân viên",
      website: "viettel.com.vn",
      address: "Lô D26, Khu đô thị mới Cầu Giấy, Hà Nội",
      email: "tuyendung@viettel.com.vn",
      phone: "02462556789",
      taxCode: "0100109106",
      businessLicenseNumber: "GP-0100109106",
      verificationStatus: "approved",
      status: "active",
    },
    {
      name: "Công ty Cổ phần VNG",
      logo: "/uploads/company-logos/vng.jpg",
      description:
        "VNG là doanh nghiệp internet và công nghệ hàng đầu Việt Nam, nổi tiếng với các sản phẩm Zalo, Zing.",
      industry: "Internet & Công nghệ",
      size: "2000-5000 nhân viên",
      website: "vng.com.vn",
      address: "Z06 Đường số 13, Tân Thuận Đông, Quận 7, TP. HCM",
      email: "recruiting@vng.com.vn",
      phone: "02854371717",
      taxCode: "0303493074",
      businessLicenseNumber: "GP-0303493074",
      verificationStatus: "approved",
      status: "active",
    },
    {
      name: "Tập đoàn Vingroup",
      logo: "/uploads/company-logos/Vingroup.png",
      description:
        "Vingroup là tập đoàn kinh tế tư nhân đa ngành lớn nhất Việt Nam, hoạt động trong các lĩnh vực công nghệ, công nghiệp, thương mại dịch vụ.",
      industry: "Đa ngành",
      size: "10000+ nhân viên",
      website: "vingroup.net",
      address: "Số 7 Đường Bằng Lăng 1, Vinhomes Riverside, Long Biên, Hà Nội",
      email: "info@vingroup.net",
      phone: "02439749999",
      taxCode: "0101245486",
      businessLicenseNumber: "GP-0101245486",
      verificationStatus: "approved",
      status: "active",
    },
    {
      name: "Ngân hàng TMCP Kỹ thương Việt Nam (Techcombank)",
      logo: "/uploads/company-logos/techcombank.png",
      description:
        "Techcombank là một trong những ngân hàng thương mại cổ phần lớn nhất Việt Nam và hàng đầu Châu Á.",
      industry: "Tài chính - Ngân hàng",
      size: "5000+ nhân viên",
      website: "techcombank.com",
      address: "119 Trần Hưng Đạo, Hoàn Kiếm, Hà Nội",
      email: "hr@techcombank.com.vn",
      phone: "02439446368",
      taxCode: "0100230897",
      businessLicenseNumber: "GP-0100230897",
      verificationStatus: "approved",
      status: "active",
    },
    {
      name: "Công ty TNHH Shopee Việt Nam",
      logo: "/uploads/company-logos/shoppe.png",
      description:
        "Shopee là nền tảng thương mại điện tử hàng đầu tại Đông Nam Á và Đài Loan.",
      industry: "Thương mại điện tử",
      size: "2000-5000 nhân viên",
      website: "shopee.vn",
      address: "Tầng 17, Tòa nhà Saigon Centre 2, 67 Lê Lợi, Quận 1, TP. HCM",
      email: "recruitment@shopee.vn",
      phone: "02873020088",
      taxCode: "0313506161",
      businessLicenseNumber: "GP-0313506161",
      verificationStatus: "approved",
      status: "active",
    },
    {
      name: "Công ty TNHH Grab Việt Nam",
      logo: "/uploads/company-logos/grab.png",
      description:
        "Grab là siêu ứng dụng hàng đầu Đông Nam Á, cung cấp các dịch vụ vận chuyển, giao hàng và thanh toán kỹ thuật số.",
      industry: "Công nghệ vận tải",
      size: "1000-2000 nhân viên",
      website: "grab.com/vn",
      address:
        "Tòa nhà Mapletree Business Centre, 1060 Nguyễn Văn Linh, Quận 7, TP. HCM",
      email: "careers.vn@grab.com",
      phone: "02871087108",
      taxCode: "0312650396",
      businessLicenseNumber: "GP-0312650396",
      verificationStatus: "approved",
      status: "active",
    },
    {
      name: "Công ty Cổ phần F88",
      logo: "/uploads/company-logos/f88.png",
      description:
        "F88 là chuỗi cửa hàng tài chính tiện ích hàng đầu Việt Nam, cung cấp dịch vụ cho vay nhanh chóng và dễ tiếp cận.",
      industry: "Tài chính tuyển dụng",
      size: "1000-2000 nhân viên",
      website: "f88.vn",
      address: "275 Nguyễn Trãi, Thanh Xuân, Hà Nội",
      email: "tuyendung@f88.vn",
      phone: "18006388",
      taxCode: "0107419135",
      businessLicenseNumber: "GP-0107419135",
      verificationStatus: "approved",
      status: "active",
    },
    {
      name: "Công ty TNHH DevFail Software",
      logo: "https://images.unsplash.com/photo-1542744094-3a31f103e35f?q=80&w=200&h=200&fit=crop",
      description:
        "DevFail Software là đơn vị phát triển ứng dụng di động và gia công phần mềm quy mô nhỏ.",
      industry: "Công nghệ thông tin",
      size: "10-50 nhân viên",
      website: "devfail.vn",
      address: "Số 12 Đường Bại Trận, Quận Tân Bình, TP. HCM",
      email: "contact@devfail.vn",
      phone: "0988777666",
      taxCode: "0316543210",
      businessLicenseNumber: "GP-0316543210",
      verificationStatus: "locked",
      lockReason: "Tự động khóa: Tin tuyển dụng bị từ chối quá 5 lần.",
      lockedAt: new Date("2026-06-15T10:00:00+07:00"),
      lockedBy: admin._id,
      jobRejectionCount: 5,
      status: "active",
    },
    {
      name: "Tập đoàn Tài chính lừa đảo ScamCorp",
      logo: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?q=80&w=200&h=200&fit=crop",
      description:
        "ScamCorp chuyên cung cấp các gói đầu tư tài chính siêu lợi nhuận không rõ nguồn gốc.",
      industry: "Tài chính & Đầu tư",
      size: "50-100 nhân viên",
      website: "scamcorp.org",
      address: "Tòa nhà Ma Quái, Quận 1, TP. HCM",
      email: "scam@scamcorp.org",
      phone: "0900111222",
      taxCode: "0319999999",
      businessLicenseNumber: "GP-0319999999",
      verificationStatus: "locked",
      lockReason: "Cung cấp giấy phép kinh doanh giả mạo.",
      lockedAt: new Date("2026-06-14T09:00:00+07:00"),
      lockedBy: admin._id,
      jobRejectionCount: 0,
      status: "active",
    },
  ];

  for (let i = 0; i < recruiterTemplates.length; i++) {
    const rTemp = recruiterTemplates[i];
    const cTemp = companyTemplates[i];

    const recruiterData = {
      firstName: rTemp.firstName,
      lastName: rTemp.lastName,
      email: rTemp.email,
      password: hashedPassword,
      role: "recruiter",
      accountStatus: "active",
      emailVerifiedAt: new Date(),
      phone: rTemp.phone,
      location: i % 2 === 0 ? "Hà Nội" : "Hồ Chí Minh",
      department: rTemp.dept,
      jobTitle: "Trưởng bộ phận Tuyển dụng",
      companyName: cTemp.name,
      companyAddress: cTemp.address,
      avatar: rTemp.avatar,
      profilePicture: rTemp.avatar,
      isActive: true,
    };
    const recruiter = await User.create(recruiterData);
    recruiters.push(recruiter);

    const companyData = {
      ...cTemp,
      createdBy: recruiter._id,
      verifiedBy:
        cTemp.verificationStatus === "approved" ? admin._id : undefined,
      lockedBy: cTemp.verificationStatus === "locked" ? admin._id : undefined,
    };
    const company = await Company.create(companyData);
    companies.push(company);
  }
  console.log(
    `Seeded ${recruiters.length} recruiters and ${companies.length} companies.`,
  );

  // 3. Create Applicants
  console.log("Seeding 15 Applicants...");
  const applicantTemplates = [
    {
      firstName: "Anh",
      lastName: "Nguyễn Tuấn",
      email: "tuananh@findme.com",
      field: "Công nghệ thông tin",
      skills: ["NodeJS", "ReactJS", "MongoDB", "Express", "JavaScript"],
    },
    {
      firstName: "Bảo",
      lastName: "Trần Minh",
      email: "minhbao@findme.com",
      field: "Công nghệ thông tin",
      skills: ["Python", "FastAPI", "PyTorch", "NLP", "TensorFlow"],
    },
    {
      firstName: "Chi",
      lastName: "Lê Khánh",
      email: "khanhchi@findme.com",
      field: "Kiểm thử phần mềm",
      skills: [
        "Selenium",
        "Automation Testing",
        "Manual Testing",
        "Jira",
        "Postman",
      ],
    },
    {
      firstName: "Duy",
      lastName: "Phạm Hoàng",
      email: "hoangduy@findme.com",
      field: "Công nghệ thông tin",
      skills: ["C#", "ASP.NET Core", "SQL Server", "REST API"],
    },
    {
      firstName: "Em",
      lastName: "Vũ Hoàng",
      email: "hoangem@findme.com",
      field: "Thiết kế đồ họa",
      skills: ["Photoshop", "Illustrator", "Figma", "UI/UX Design", "Indesign"],
    },
    {
      firstName: "Giang",
      lastName: "Nguyễn Trường",
      email: "truonggiang@findme.com",
      field: "Marketing",
      skills: [
        "SEO",
        "Content Marketing",
        "Google Ads",
        "Facebook Ads",
        "Google Analytics",
      ],
    },
    {
      firstName: "Hải",
      lastName: "Phan Thanh",
      email: "thanhhai@findme.com",
      field: "Tài chính - Kế toán",
      skills: [
        "Excel",
        "Financial Analysis",
        "Tax Accounting",
        "MISA",
        "Auditing",
      ],
    },
    {
      firstName: "Khánh",
      lastName: "Lê Duy",
      email: "duykhanh@findme.com",
      field: "Chăm sóc khách hàng",
      skills: [
        "Communication",
        "Problem Solving",
        "Customer Relations",
        "CRM",
        "Zendesk",
      ],
    },
    {
      firstName: "Linh",
      lastName: "Trần Thị",
      email: "thilinh@findme.com",
      field: "Nhân sự",
      skills: [
        "Talent Acquisition",
        "Recruiter Strategy",
        "Onboarding",
        "Payroll",
        "Vietnam Labor Law",
      ],
    },
    {
      firstName: "Nam",
      lastName: "Nguyễn Hoài",
      email: "user1@findme.com",
      field: "Công nghệ thông tin",
      skills: ["Java", "Spring Boot", "MySQL", "Docker", "Kubernetes"],
    },
    {
      firstName: "Hiếu",
      lastName: "Nguyễn Trung",
      email: "user2@findme.com",
      field: "Công nghệ thông tin",
      skills: ["React Native", "Swift", "Kotlin", "Mobile Development"],
    },
    {
      firstName: "Ly",
      lastName: "Vũ Hương",
      email: "user3@findme.com",
      field: "Marketing",
      skills: ["Branding", "Social Media", "PR", "Content Strategy"],
    },
    {
      firstName: "Phương",
      lastName: "Đỗ Hà",
      email: "haphuong@findme.com",
      field: "Phân tích dữ liệu",
      skills: ["SQL", "Python", "Power BI", "Tableau", "Data Analysis"],
    },
    {
      firstName: "Quốc",
      lastName: "Nguyễn Anh",
      email: "anhquoc@findme.com",
      field: "Quản lý dự án",
      skills: ["Agile", "Scrum", "Jira", "Project Management", "Communication"],
    },
    {
      firstName: "Sơn",
      lastName: "Trần Hồng",
      email: "hongson@findme.com",
      field: "Hệ thống - DevOps",
      skills: ["AWS", "Docker", "Kubernetes", "CI/CD", "Linux", "Bash"],
    },
  ];

  const applicantAvatars = [
    "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=150&h=150&fit=crop",
    "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?q=80&w=150&h=150&fit=crop",
    "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=150&h=150&fit=crop",
    "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=150&h=150&fit=crop",
    "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=150&h=150&fit=crop",
    "https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?q=80&w=150&h=150&fit=crop",
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150&h=150&fit=crop",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150&h=150&fit=crop",
    "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=150&h=150&fit=crop",
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=150&h=150&fit=crop",
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150&h=150&fit=crop",
    "https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=150&h=150&fit=crop",
    "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?q=80&w=150&h=150&fit=crop",
    "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?q=80&w=150&h=150&fit=crop",
    "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=150&h=150&fit=crop",
  ];

  const applicants = [];
  for (let i = 0; i < applicantTemplates.length; i++) {
    const t = applicantTemplates[i];
    const applicantData = {
      firstName: t.firstName,
      lastName: t.lastName,
      email: t.email,
      password: hashedPassword,
      role: "applicant",
      accountStatus: "active",
      emailVerifiedAt: new Date(),
      phone: "098" + Math.floor(1000000 + Math.random() * 9000000),
      location: "Hồ Chí Minh",
      avatar: applicantAvatars[i],
      profilePicture: applicantAvatars[i],
      isActive: true,
      profile: {
        fullName: `${t.lastName} ${t.firstName}`,
        careerField: t.field,
        currentLocation: "Hồ Chí Minh",
        currentStatus: "Sẵn sàng làm việc",
        primarySkills: t.skills,
        skills: t.skills,
        summary: `Tôi là một chuyên gia trong lĩnh vực ${t.field} với niềm đam mê sâu sắc đối với phát triển sản phẩm chất lượng cao và tối ưu hóa trải nghiệm người dùng.`,
      },
    };
    const app = await User.create(applicantData);
    applicants.push(app);
  }
  console.log(`Seeded ${applicants.length} Applicant accounts.`);

  // 4. Seed Resumes
  console.log("Seeding 15 Resumes...");
  const resumes = [];
  for (const appUser of applicants) {
    const profile = appUser.profile;
    const resumeData = {
      userId: appUser._id,
      fileName: `Resume_${appUser.lastName}_${appUser.firstName}.pdf`,
      originalName: `Resume_${appUser.lastName}_${appUser.firstName}.pdf`,
      fileSize: 12400 + Math.floor(Math.random() * 8000),
      mimeType: "application/pdf",
      fileUrl: `/api/recruiter/applications/demo-resume.pdf`,
      fileData: "Dummy base64 content representing PDF resume file.",
      parsedData: {
        fullName: profile.fullName,
        email: appUser.email,
        phone: appUser.phone,
        currentLocation: profile.currentLocation,
        primarySkills: profile.primarySkills,
        educationEntries: [
          {
            qualification: "Đại học Công nghệ - ĐHQGHN",
            fieldOfStudy: profile.careerField,
            universityName: "Đại học Quốc gia Hà Nội",
            graduationYear: "2023",
            cgpaPercentage: "3.4/4",
          },
        ],
        workExperienceEntries: [
          {
            company: "FPT Software",
            position: profile.primarySkills[0] + " Developer",
            startDate: "2023-08",
            endDate: "2025-12",
            isCurrentlyWorking: false,
            description: `Tham gia phát triển dự án phần mềm sử dụng các công nghệ như ${profile.primarySkills.slice(0, 3).join(", ")}.`,
            yearsOfExperience: "2",
          },
        ],
        rawText: `Họ tên: ${profile.fullName}\nEmail: ${appUser.email}\nĐiện thoại: ${appUser.phone}\nNgành nghề: ${profile.careerField}\nKỹ năng: ${profile.primarySkills.join(", ")}`,
      },
      processingStatus: "completed",
      isActive: true,
    };
    const newResume = await Resume.create(resumeData);
    resumes.push(newResume);

    appUser.profile.currentResumeId = newResume._id;
    appUser.profile.resume = {
      fileName: newResume.fileName,
      uploadDate: new Date(),
      fileSize: newResume.fileSize,
    };
    await appUser.save();
  }
  console.log(`Seeded ${resumes.length} Resumes.`);

  // 5. Seed 55 Jobs
  console.log("Seeding 55 Jobs with different statuses...");
  const jobs = [];
  const now = new Date("2026-06-16T11:37:07+07:00");

  for (let i = 0; i < 55; i++) {
    const t = jobBaseTemplates[i % jobBaseTemplates.length];
    let status = "active";
    let postedByRecruiter = recruiters[i % 8];
    let companyDoc = companies[i % 8];
    let deadline = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days in future
    let createdAt = new Date(now.getTime() - (i + 1) * 2 * 60 * 60 * 1000); // spread backwards in hours

    if (i < 20) {
      // 20 APPROVED
      status = "active";
      postedByRecruiter = recruiters[i % 8];
      companyDoc = companies[i % 8];
      // created within the last 7 days (June 10 - June 15)
      const offsetDays = 1 + (i % 5);
      createdAt = new Date(now.getTime() - offsetDays * 24 * 60 * 60 * 1000);
      deadline = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    } else if (i < 30) {
      // 10 PENDING
      status = "pending_approval";
      postedByRecruiter = recruiters[(i - 20) % 8];
      companyDoc = companies[(i - 20) % 8];
      createdAt = new Date(now.getTime() - 12 * 60 * 60 * 1000);
      deadline = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);
    } else if (i < 40) {
      // 10 REJECTED
      status = "rejected";
      if (i < 35) {
        // 5 rejections belong to DevFail Software (recruiter 8)
        postedByRecruiter = recruiters[8];
        companyDoc = companies[8];
      } else {
        // 5 rejections belong to active companies (0-7)
        postedByRecruiter = recruiters[(i - 35) % 8];
        companyDoc = companies[(i - 35) % 8];
      }
      createdAt = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
      deadline = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);
    } else if (i < 50) {
      // 10 EXPIRED
      status = "active";
      postedByRecruiter = recruiters[(i - 40) % 8];
      companyDoc = companies[(i - 40) % 8];
      createdAt = new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000);
      const offsetDays = 1 + (i % 5);
      deadline = new Date(now.getTime() - offsetDays * 24 * 60 * 60 * 1000); // past deadline
    } else {
      // 5 CLOSED
      status = "closed";
      postedByRecruiter = recruiters[(i - 50) % 8];
      companyDoc = companies[(i - 50) % 8];
      createdAt = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
      deadline = new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000);
    }

    const jobData = {
      title: t.title,
      description: t.description,
      requirements: t.requirements,
      benefits: t.benefits,
      department: t.department,
      jobType: t.jobType,
      location: t.location,
      locationType: t.locationType,
      salaryRange: {
        min: t.salaryRange.min,
        max: t.salaryRange.max,
        currency: "VND",
        period: "month",
        format: "absolute",
      },
      qualification: ["Bachelor"],
      experienceLevel: t.experienceLevel,
      requiredSkills: t.requiredSkills,
      preferredSkills: t.preferredSkills,
      applicationDeadline: deadline,
      atsEnabled: true,
      atsResumeThreshold: 60,
      atsSkipWhenCoverLetter: false,
      atsEngine: "scan_cv",
      resumeRequired: true,
      defaultInterviewRounds: [
        "Technical Interview",
        "Recruiter Fit Interview",
      ],
      company: companyDoc._id,
      postedBy: postedByRecruiter._id,
      status: status,
      views: Math.floor(50 + Math.random() * 200),
      applicationsCount: 0,
      publishedAt:
        status === "active" || status === "closed" ? createdAt : undefined,
      createdAt: createdAt,
      updatedAt: createdAt,
      lastStatusActorRole: "recruiter",
    };

    const newJob = await Job.create(jobData);
    jobs.push(newJob);
  }
  console.log(`Seeded ${jobs.length} Jobs.`);

  // 6. Seed JobStatusChangeRequests (Moderation Logs)
  console.log("Seeding JobStatusChangeRequests for moderation history...");
  const requests = [];
  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i];
    if (i < 20) {
      // APPROVED
      const reqData = {
        job: job._id,
        requestedBy: job.postedBy,
        requestedStatus: "active",
        previousStatus: "draft",
        message: "Đề xuất duyệt tin đăng mới cho doanh nghiệp.",
        reviewStatus: "approved",
        reviewedBy: admin._id,
        reviewNote: "Duyệt tin tuyển dụng. Nội dung đầy đủ và đúng quy chuẩn.",
      };
      requests.push(await JobStatusChangeRequest.create(reqData));
    } else if (i < 30) {
      // PENDING
      const reqData = {
        job: job._id,
        requestedBy: job.postedBy,
        requestedStatus: "active",
        previousStatus: "draft",
        message: "Đăng tin tuyển dụng và yêu cầu kiểm duyệt.",
        reviewStatus: "pending",
      };
      requests.push(await JobStatusChangeRequest.create(reqData));
    } else if (i < 40) {
      // REJECTED
      let note = "Nội dung tin đăng chưa đầy đủ thông tin mô tả công việc.";
      if (i < 35) {
        // DevFail Software rejections
        const failNotes = [
          "Nội dung tin đăng vi phạm chính sách cộng đồng.",
          "Sai thông tin mức lương và chế độ đãi ngộ.",
          "Yêu cầu kỹ năng không rõ ràng.",
          "Mô tả công việc quá ngắn.",
          "Tin tuyển dụng spam, thông tin không nhất quán.",
        ];
        note = failNotes[i - 30];
      }
      const reqData = {
        job: job._id,
        requestedBy: job.postedBy,
        requestedStatus: "active",
        previousStatus: "draft",
        message: "Đề xuất duyệt tin đăng mới.",
        reviewStatus: "rejected",
        reviewedBy: admin._id,
        reviewNote: note,
      };
      requests.push(await JobStatusChangeRequest.create(reqData));
    }
  }
  console.log(`Seeded ${requests.length} JobStatusChangeRequests.`);

  // 7. Seed Applications
  console.log("Seeding 15 Applications across all statuses...");
  const applications = [];
  const appStatuses = [
    "submitted",
    "under_review",
    "shortlisted",
    "interview_scheduled",
    "interview_confirmed",
    "interview_passed",
    "offer_extended",
    "offer_accepted",
    "offer_declined",
    "rejected",
    "withdrawn",
    "submitted",
    "under_review",
    "shortlisted",
    "interview_scheduled",
  ];

  for (let i = 0; i < 15; i++) {
    const candidate = applicants[i];
    const job = jobs[i]; // apply to active approved jobs
    const resume = resumes[i];
    const status = appStatuses[i];

    // Compute skills matching score
    const jobTemplate = jobBaseTemplates[i % jobBaseTemplates.length];
    const candidateSkills = candidate.profile.primarySkills || [];
    const jobSkills = jobTemplate.requiredSkills || [];
    const commonSkills = candidateSkills.filter((s) => jobSkills.includes(s));
    const matchRatio = commonSkills.length / Math.max(1, jobSkills.length);
    const score = Math.round(50 + matchRatio * 50);

    const appData = {
      job: job._id,
      applicant: candidate._id,
      status: status,
      personalInfo: {
        firstName: candidate.firstName,
        lastName: candidate.lastName,
        email: candidate.email,
        phone: candidate.phone,
      },
      useProfileResume: true,
      profileResumeId: resume._id,
      skills: candidate.profile.skills,
      experience:
        i % 3 === 0 ? "fresher" : i % 3 === 1 ? "mid-level" : "senior",
      expectedSalary: {
        min: 15000000 + (i % 5) * 2000000,
        max: 25000000 + (i % 5) * 3000000,
        currency: "VND",
      },
      coverLetter: `Tôi mong muốn được ứng tuyển vào vị trí này và tin rằng kinh nghiệm của tôi sẽ đáp ứng tốt nhu cầu của quý công ty.`,
      aiProcessing: {
        status: "done",
        startedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
        finishedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000 + 3000),
        engine: "scan_cv",
      },
      aiAnalysis: {
        resumeScore: score,
        skillsMatch: score,
        experienceMatch: score,
        overallScore: score,
        keyStrengths: [
          `Hồ sơ đáp ứng các yêu cầu cốt lõi về kỹ năng của công việc.`,
          `Có định hướng công việc rõ ràng và kinh nghiệm liên quan.`,
        ],
        potentialConcerns:
          score < 70
            ? [`Cần trao đổi thêm để đánh giá kinh nghiệm thực hành.`]
            : [],
        recommendedQuestions: [`Hãy mô tả sâu về dự án gần nhất của bạn?`],
        atsEngine: "scan_cv",
      },
      timeline: [
        {
          status: "submitted",
          date: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
          note: "Đơn ứng tuyển đã được nộp trực tuyến.",
        },
      ],
    };

    if (status !== "submitted") {
      appData.timeline.push({
        status: status,
        date: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
        note: `Nhà tuyển dụng cập nhật trạng thái đơn sang ${status}.`,
        updatedBy: job.postedBy,
      });
    }

    if (status === "rejected") {
      appData.timeline.push({
        status: "rejected",
        date: new Date(now.getTime() - 12 * 60 * 60 * 1000),
        note: "Rất tiếc, hồ sơ của bạn chưa phù hợp với yêu cầu của công ty tại thời điểm hiện tại.",
        updatedBy: job.postedBy,
      });
    }

    const newApp = await Application.create(appData);
    applications.push(newApp);

    await Job.findByIdAndUpdate(job._id, { $inc: { applicationsCount: 1 } });
  }
  console.log(`Seeded ${applications.length} Applications.`);

  // 8. Seed Interviews
  console.log("Seeding Interviews for candidate applications...");
  const interviews = [];
  for (let i = 0; i < applications.length; i++) {
    const app = applications[i];
    if (
      [
        "interview_scheduled",
        "interview_confirmed",
        "interview_passed",
      ].includes(app.status)
    ) {
      const jobDoc = jobs.find((j) => j._id.toString() === app.job.toString());
      const recruiterId = jobDoc.postedBy;
      const isPassed = app.status === "interview_passed";
      const isConfirmed = app.status === "interview_confirmed" || isPassed;

      const interviewData = {
        application: app._id,
        interviewer: recruiterId,
        scheduledBy: recruiterId,
        type: i % 2 === 0 ? "video" : "in-person",
        scheduledDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
        scheduledTime: "10:00",
        duration: 60,
        round: 1,
        status: isPassed
          ? "completed"
          : isConfirmed
            ? "confirmed"
            : "scheduled",
        meetingLink:
          i % 2 === 0 ? "https://meet.google.com/abc-defg-hij" : undefined,
        location: i % 2 !== 0 ? "Phòng họp 102, Tòa nhà công ty" : undefined,
        notes: "Phỏng vấn đánh giá năng lực chuyên môn và thảo luận công việc.",
      };

      if (isPassed) {
        interviewData.completedAt = new Date();
        interviewData.feedback = {
          overallRating: 4,
          technicalSkills: 4,
          communicationSkills: 5,
          problemSolving: 4,
          culturalFit: 4,
          strengths: [
            "Nắm vững kiến thức chuyên môn",
            "Kỹ năng giao tiếp và tiếng Anh xuất sắc",
          ],
          weaknesses: ["Cần rèn luyện thêm kỹ năng làm việc nhóm."],
          recommendation: "recommend",
          additionalNotes: "Đề xuất thử việc với chế độ đãi ngộ thông thường.",
          submittedAt: new Date(),
        };
      }

      const newInterview = await Interview.create(interviewData);
      interviews.push(newInterview);

      app.interviews.push(newInterview._id);
      if (app.status === "interview_scheduled" && !isConfirmed) {
        app.interviewInvite = {
          scheduledAt: interviewData.scheduledDate,
          jobAddressLine: interviewData.location || "Trực tuyến",
          venueOrLink: interviewData.meetingLink || interviewData.location,
          recruiterNote: "Hân hạnh mời bạn tham dự phỏng vấn vòng 1.",
        };
      } else if (isConfirmed) {
        app.interviewInvite = {
          scheduledAt: interviewData.scheduledDate,
          jobAddressLine: interviewData.location || "Trực tuyến",
          venueOrLink: interviewData.meetingLink || interviewData.location,
          recruiterNote: "Hân hạnh mời bạn tham dự phỏng vấn vòng 1.",
          confirmedAt: new Date(now.getTime() - 12 * 60 * 60 * 1000),
        };
      }
      await app.save();
    }
  }
  console.log(`Seeded ${interviews.length} Interviews.`);

  // 9. Seed Notifications
  console.log("Seeding Notifications...");
  const notifications = [];
  for (let i = 0; i < 5; i++) {
    const app = applications[i];
    const job = jobs[i];
    const notifHR = {
      user: job.postedBy,
      role: "recruiter",
      type: "application_submitted",
      title: "Có đơn ứng tuyển mới",
      message: `Ứng viên ${app.personalInfo.lastName} ${app.personalInfo.firstName} vừa nộp đơn vào vị trí ${job.title}.`,
      actionUrl: `/recruiter/applications`,
      entity: { kind: "Application", id: app._id },
      priority: "medium",
      read: false,
    };
    notifications.push(await Notification.create(notifHR));
  }

  for (let i = 0; i < applications.length; i++) {
    const app = applications[i];
    const candidate = applicants.find(
      (c) => c._id.toString() === app.applicant.toString(),
    );
    const job = jobs.find((j) => j._id.toString() === app.job.toString());

    if (app.status === "rejected") {
      const notifApp = {
        user: candidate._id,
        role: "applicant",
        type: "application_status_changed",
        title: "Kết quả ứng tuyển tuyển dụng",
        message: `Cảm ơn bạn đã quan tâm. Rất tiếc hồ sơ ứng tuyển vị trí ${job.title} chưa phù hợp. Click để xem phản hồi chi tiết.`,
        actionUrl: `/applicant/applications?showFeedback=${app._id}`,
        entity: { kind: "Application", id: app._id },
        priority: "high",
        read: false,
      };
      notifications.push(await Notification.create(notifApp));
    } else if (app.status === "interview_scheduled") {
      const notifApp = {
        user: candidate._id,
        role: "applicant",
        type: "interview_scheduled",
        title: "Lời mời phỏng vấn từ nhà tuyển dụng",
        message: `Chúc mừng bạn! Bạn nhận được thư mời phỏng vấn cho vị trí ${job.title}.`,
        actionUrl: `/applicant/applications`,
        entity: { kind: "Application", id: app._id },
        priority: "high",
        read: false,
      };
      notifications.push(await Notification.create(notifApp));
    }
  }
  console.log(`Seeded ${notifications.length} Notifications.`);

  console.log("\n=========================================");
  console.log("DEMO DATA SEEDING COMPLETED SUCCESSFULLY!");
  console.log("Summary of Seeded Data:");
  console.log(
    `- Users: ${1 + recruiters.length + applicants.length} (1 Admin, ${recruiters.length} Recruiters, ${applicants.length} Applicants)`,
  );
  console.log(`- Companies: ${companies.length} (8 ACTIVE/APPROVED, 2 LOCKED)`);
  console.log(
    `- Jobs: ${jobs.length} (20 APPROVED, 10 PENDING, 10 REJECTED, 10 EXPIRED, 5 CLOSED)`,
  );
  console.log(`- Resumes: ${resumes.length}`);
  console.log(`- Applications: ${applications.length}`);
  console.log(`- JobStatusChangeRequests: ${requests.length}`);
  console.log(`- Interviews: ${interviews.length}`);
  console.log(`- Notifications: ${notifications.length}`);
  console.log("=========================================\n");
}

async function runSeed() {
  try {
    await seedDemoData();
    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error("Seed demo data failed:", err);
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
  runSeed,
};

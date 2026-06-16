import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Autoplay } from "swiper/modules";
import {
  ChevronRight,
  Award,
  Globe,
  Users,
  MapPin,
  ThumbsUp,
  Play,
} from "lucide-react";
import "swiper/css";
import "swiper/css/navigation";
import { apiRequest } from "../../utils/api";
const stats = [
  {
    icon: <Award className="w-5 h-5 text-red-600" />,
    text: "Nền tảng kết nối việc làm <strong>thông minh hàng đầu</strong> Việt Nam",
  },
  {
    icon: <Globe className="w-5 h-5 text-red-600" />,
    text: "Cập nhật hơn <strong>10.000+</strong> việc làm chất lượng cao mỗi ngày",
  },
  {
    icon: <Users className="w-5 h-5 text-red-600" />,
    text: "Cộng đồng ứng viên năng động với hơn <strong>500.000+</strong> thành viên",
  },
  {
    icon: <MapPin className="w-5 h-5 text-red-600" />,
    text: "Kết nối cơ hội nghề nghiệp tại <strong>63 tỉnh thành</strong> trên cả nước",
  },
  {
    icon: <ThumbsUp className="w-5 h-5 text-red-600" />,
    text: "Đối tác tuyển dụng tin cậy của hơn <strong>1.000+</strong> doanh nghiệp uy tín",
  },
];
const sliderImages = ["/slider1.webp", "/slider2.webp", "/slider3.webp"];
const testimonials = [
  {
    type: "image",
    src: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=800",
    bgColor: "bg-[#EE0000]",
  },
  {
    type: "text",
    title: "Hành trình của FINDME mới chỉ bắt đầu",
    content:
      "Ở FINDME mình được thử thách với rất nhiều dự án khó, có tính thách thức cao. Hành trình của FINDME mới chỉ bắt đầu và mình rất vui khi được viết tiếp.",
    author: "NGUYỄN TRẦN NGỌC LINH",
    position:
      "Giám đốc Trung tâm Phân tích dữ liệu, Tổng công ty Giải pháp FINDME",
    bgColor: "bg-white dark:bg-gray-800",
  },
  {
    type: "image",
    src: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=800",
    bgColor: "bg-gray-200 dark:bg-gray-700",
  },
  {
    type: "text",
    title: "Thách thức tạo kim cương",
    content:
      "Các bài toán tại FINDME mà tôi có dịp tiếp xúc và trải nghiệm đa phần là các bài toán lớn và rất khó, có những bài toán chưa nơi nào tại Việt Nam từng thực hiện. Chính việc này đã rèn luyện cho bản thân tôi và các đồng nghiệp một tinh thần làm việc sáng tạo và linh hoạt.",
    author: "VŨ VIỆT HOÀNG",
    position:
      "Trưởng sản phẩm nền tảng giám sát không gian mạng, Trung tâm An ninh mạng FINDME",
    bgColor: "bg-white dark:bg-gray-800",
  },
  {
    type: "image",
    src: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=800",
    bgColor: "bg-gray-900",
  },
  {
    type: "text",
    title: "Công dân toàn cầu với tầm nhìn mới",
    content:
      "Tôi thực sự muốn thấy tầm nhìn toàn cầu của FINDME và đường hướng là về văn hóa Việt Nam. Tại FINDME, kết quả được mong đợi là sự phát triển vượt bậc cả cá nhân và nghề nghiệp.",
    author: "LUIS ALONSO CASTRO",
    position: "Kỹ sư Viễn thông, Chi nhánh FINDME Peru",
    bgColor: "bg-white dark:bg-gray-800",
  },
];
const SECTION_TRANG_CHU_ID = "trang-chu";
const SECTION_NOI_LAM_VIEC_ID = "noi-lam-viec-ban-dang-tim-kiem";
const SECTION_DAI_NGO_ID = "bien-giac-mo-thanh-hien-thuc";
const SECTION_SU_KIEN_ID = "su-kien";
const HOME_HASH_SECTION_IDS = [
  SECTION_TRANG_CHU_ID,
  SECTION_NOI_LAM_VIEC_ID,
  SECTION_DAI_NGO_ID,
  SECTION_SU_KIEN_ID,
];
const HomePage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const observerRef = useRef(null);
  const [latestJobs, setLatestJobs] = useState([]);
  const [latestJobsLoading, setLatestJobsLoading] = useState(false);
  const eventItems = useMemo(
    () => [
      {
        day: "22",
        month: "TH2",
        image: "/slider1.webp",
        title: "FINDME Tech Talk: Kiến trúc hệ thống tuyển dụng & ATS",
        excerpt:
          "Cùng đội ngũ kỹ sư FINDME chia sẻ cách thiết kế hệ thống tuyển dụng, tối ưu hiệu năng, và tiêu chuẩn đánh giá CV theo ATS.",
      },
      {
        day: "22",
        month: "TH2",
        image: "/slider2.webp",
        title: "Workshop: Ứng dụng AI trong sàng lọc hồ sơ & phỏng vấn",
        excerpt:
          "Trải nghiệm quy trình sàng lọc hiện đại: phân tích CV, chấm điểm phù hợp, gợi ý câu hỏi phỏng vấn theo năng lực.",
      },
      {
        day: "04",
        month: "TH2",
        image: "/slider3.webp",
        title: "Open Day: Văn hóa công nghệ & cơ hội nghề nghiệp tại FINDME",
        excerpt:
          "Gặp gỡ HR và team kỹ thuật, tìm hiểu lộ trình phát triển, chế độ đãi ngộ, và các vị trí đang tuyển dụng.",
      },
    ],
    [],
  );

  const formatDeadline = useMemo(() => {
    const pad2 = (n) => String(n).padStart(2, "0");
    return (raw) => {
      if (!raw) return "-";
      const d = new Date(raw);
      if (Number.isNaN(d.getTime())) return "-";
      return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()}`;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        setLatestJobsLoading(true);
        const params = new URLSearchParams({
          page: "1",
          limit: "5",
        });
        const res = await apiRequest(`/api/jobs?${params.toString()}`);
        const json = await res.json();
        if (!cancelled && json?.success) {
          setLatestJobs(Array.isArray(json?.data?.jobs) ? json.data.jobs : []);
        }
      } catch {
        if (!cancelled) setLatestJobs([]);
      } finally {
        if (!cancelled) setLatestJobsLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    if (location.pathname !== "/") return;
    const id = location.hash?.replace("#", "");
    if (!id || !HOME_HASH_SECTION_IDS.includes(id)) return;
    const el = document.getElementById(id);
    if (!el) return;
    const t = window.setTimeout(() => {
      el.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 0);
    return () => clearTimeout(t);
  }, [location.pathname, location.hash]);
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("animate-in");
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px",
      },
    );
    const animatedElements = document.querySelectorAll(
      ".fade-up, .fade-left, .fade-right, .scale-in, .slide-up",
    );
    animatedElements.forEach((el) => {
      observerRef.current.observe(el);
    });
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);
  return (
    <>
      {}
      <style>{`
        .fade-up {
          opacity: 0;
          transform: translateY(30px);
          transition: opacity 0.6s ease-out, transform 0.6s ease-out;
        }
        .fade-up.animate-in {
          opacity: 1;
          transform: translateY(0);
        }
        .fade-left {
          opacity: 0;
          transform: translateX(-30px);
          transition: opacity 0.8s ease-out, transform 0.8s ease-out;
        }
        .fade-left.animate-in {
          opacity: 1;
          transform: translateX(0);
        }
        .fade-right {
          opacity: 0;
          transform: translateX(30px);
          transition: opacity 0.8s ease-out, transform 0.8s ease-out;
        }
        .fade-right.animate-in {
          opacity: 1;
          transform: translateX(0);
        }
        .scale-in {
          opacity: 0;
          transform: scale(0.95);
          transition: opacity 0.6s ease-out, transform 0.6s ease-out;
        }
        .scale-in.animate-in {
          opacity: 1;
          transform: scale(1);
        }
        .slide-up {
          opacity: 0;
          transform: translateY(40px);
          transition: opacity 0.7s ease-out, transform 0.7s ease-out;
        }
        .slide-up.animate-in {
          opacity: 1;
          transform: translateY(0);
        }
        .delay-100 { transition-delay: 0.1s; }
        .delay-200 { transition-delay: 0.2s; }
        .delay-300 { transition-delay: 0.3s; }
        .delay-400 { transition-delay: 0.4s; }

        /* Hover Animations */
        .hover-lift {
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .hover-lift:hover {
          transform: translateY(-8px);
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        }
        
        .hover-scale {
          transition: transform 0.2s ease;
        }
        .hover-scale:hover {
          transform: scale(1.05);
        }
        
        .hover-glow {
          transition: box-shadow 0.3s ease, transform 0.2s ease;
        }
        .hover-glow:hover {
          box-shadow: 0 0 20px rgba(0, 0, 0, 0.3);
          transform: translateY(-2px);
        }
        :global(.dark) .hover-glow:hover {
          box-shadow: 0 0 20px rgba(255, 255, 255, 0.18);
        }
        
        .hover-slide {
          position: relative;
          overflow: hidden;
          transition: transform 0.2s ease;
        }
        .hover-slide:hover {
          transform: translateX(5px);
        }
        .hover-slide::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
          transition: left 0.5s;
        }
        .hover-slide:hover::before {
          left: 100%;
        }
        
        .hover-bounce {
          transition: transform 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }
        .hover-bounce:hover {
          transform: scale(1.1);
        }
        
        .hover-rotate {
          transition: transform 0.3s ease;
        }
        .hover-rotate:hover {
          transform: rotate(5deg) scale(1.02);
        }
        
        .hover-gradient {
          background-size: 200% 200%;
          transition: background-position 0.3s ease, transform 0.2s ease;
        }
        .hover-gradient:hover {
          background-image: linear-gradient(45deg, #000000, #333333);
          background-position: 100% 100%;
          transform: translateY(-2px);
        }
        :global(.dark) .hover-gradient:hover {
          background-image: linear-gradient(45deg, #ffffff, #e5e7eb);
        }
        
        .cursor-pointer {
          cursor: pointer;
        }
      `}</style>
      {}

      {}
      <section
        id={SECTION_NOI_LAM_VIEC_ID}
        className="relative w-full overflow-hidden bg-white dark:bg-gray-900 py-16 px-4 sm:px-6 lg:px-8 transition-colors duration-300 scroll-mt-16"
      >
        <div className="absolute inset-0 opacity-5 dark:opacity-10 pointer-events-none">
          <img
            src="/slider1.webp"
            alt="bg"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          <div className="space-y-8">
            <div>
              <h2 className="text-3xl md:text-4xl font-extrabold text-[#1a1a1a] dark:text-white leading-tight uppercase tracking-tight">
                CƠ HỘI NGHỀ NGHIỆP BẠN ĐANG TÌM KIẾM
              </h2>
              <p className="mt-6 text-gray-600 dark:text-gray-300 leading-relaxed text-justify max-w-xl">
                FINDME là nền tảng tuyển dụng và kết nối việc làm thông minh
                hàng đầu Việt Nam. Chúng tôi đóng vai trò là cầu nối trung gian
                tin cậy, giúp hàng triệu ứng viên tìm kiếm cơ hội nghề nghiệp mơ
                ước và hỗ trợ hàng nghìn doanh nghiệp tiếp cận nguồn nhân lực
                chất lượng cao nhanh chóng, hiệu quả nhất.
              </p>
            </div>
            <div className="space-y-4">
              {stats.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-4 py-3 border-b border-gray-100 dark:border-gray-700 last:border-0"
                >
                  <div className="flex-shrink-0">{item.icon}</div>
                  <p
                    className="text-gray-700 dark:text-gray-200 text-sm md:text-base"
                    dangerouslySetInnerHTML={{
                      __html: item.text,
                    }}
                  />
                </div>
              ))}
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed max-w-xl italic">
              Bên cạnh việc kết nối việc làm, FINDME còn tích hợp các giải pháp
              công nghệ hiện đại như công cụ sàng lọc hồ sơ tự động (ATS), phân
              tích sự phù hợp của ứng viên bằng AI và cung cấp hệ thống quản lý
              tuyển dụng toàn diện cho doanh nghiệp.
            </p>
            <button className="group flex items-center gap-2 bg-[#ee0000] text-white px-8 py-3 rounded-md font-bold hover:bg-red-700 transition-all uppercase text-sm tracking-widest">
              Tìm hiểu thêm
              <div className="bg-white/20 rounded-full p-1 group-hover:translate-x-1 transition-transform">
                <ChevronRight className="w-4 h-4" />
              </div>
            </button>
          </div>
          <div className="relative w-full h-[400px] md:h-[500px]">
            <Swiper
              modules={[Navigation, Autoplay]}
              spaceBetween={20}
              slidesPerView={1.2}
              centeredSlides={false}
              loop
              autoplay={{
                delay: 3000,
              }}
              navigation={{
                nextEl: ".swiper-button-next-custom",
              }}
              breakpoints={{
                768: {
                  slidesPerView: 1.5,
                },
              }}
              className="h-full rounded-2xl"
            >
              {sliderImages.map((src, index) => (
                <SwiperSlide key={index}>
                  <div className="relative h-full w-full overflow-hidden rounded-2xl group">
                    <img
                      src={src}
                      alt={`Slide ${index + 1}`}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute bottom-6 left-6 text-white font-bold text-4xl opacity-20">
                      0{index + 1}.
                    </div>
                  </div>
                </SwiperSlide>
              ))}
              <button className="swiper-button-next-custom absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-white dark:bg-gray-800 shadow-xl rounded-full p-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <ChevronRight className="w-6 h-6 text-gray-800 dark:text-gray-100" />
              </button>
            </Swiper>
          </div>
        </div>
      </section>

      {}
      <section
        id={SECTION_DAI_NGO_ID}
        className="w-full bg-white dark:bg-gray-950 py-12 transition-colors duration-300 scroll-mt-16"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center mb-12 px-6">
            <h2 className="text-4xl md:text-5xl font-black text-gray-100 dark:text-gray-800 uppercase tracking-widest text-center leading-none transition-colors duration-300">
              BIẾN GIẤC MƠ THÀNH HIỆN THỰC
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 w-full border-t border-gray-100 dark:border-gray-800">
            {testimonials.map((item, index) => (
              <div
                key={index}
                className={`relative min-h-[400px] flex flex-col justify-center items-center px-10 text-center border-b border-r border-gray-100 dark:border-gray-700 ${item.bgColor}`}
              >
                {item.type === "image" ? (
                  <img
                    src={item.src}
                    alt="Member"
                    className="absolute inset-0 w-full h-full object-cover mix-blend-normal hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                      {item.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed italic">
                      "{item.content}"
                    </p>
                    <div className="pt-4">
                      <p className="text-xs font-bold text-gray-800 dark:text-gray-200 tracking-tighter uppercase">
                        {item.author}
                      </p>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 uppercase leading-tight">
                        {item.position}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id={SECTION_SU_KIEN_ID}
        className="w-full bg-white dark:bg-gray-950 py-16 px-4 sm:px-6 lg:px-8 transition-colors duration-300 scroll-mt-16"
      >
        <div className="max-w-7xl mx-auto">
          <div className="relative mb-10">
            <div className="text-center">
              <h2 className="text-2xl md:text-4xl font-extrabold text-gray-900 dark:text-white uppercase tracking-wide">
                SỰ KIỆN
              </h2>
              <p className="mt-3 text-sm md:text-base text-gray-600 dark:text-gray-300">
                Cập nhật hoạt động & tin tức mới nhất tại FINDME
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="hidden sm:inline-flex items-center gap-2 text-sm font-bold text-[#EE0000] hover:text-red-700 dark:hover:text-red-300 transition-colors absolute right-0 top-1/2 -translate-y-1/2"
            >
              Xem tất cả
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {eventItems.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => navigate("/login")}
                className="group text-left bg-white dark:bg-gray-900 rounded-xl overflow-hidden shadow-lg ring-1 ring-black/5 dark:ring-white/10 hover:-translate-y-1 transition-transform"
              >
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute left-4 top-4 bg-white/95 dark:bg-gray-900/95 rounded-md overflow-hidden shadow">
                    <div className="px-3 py-2 text-center">
                      <div className="text-lg font-extrabold text-[#1a1a1a] dark:text-white leading-none">
                        {item.day}
                      </div>
                      <div className="text-[10px] font-bold text-gray-600 dark:text-gray-300 uppercase tracking-widest">
                        {item.month}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="font-extrabold text-gray-900 dark:text-white leading-snug line-clamp-2">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm text-gray-600 dark:text-gray-300 line-clamp-3">
                    {item.excerpt}
                  </p>
                  <div className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[#EE0000]">
                    Xem chi tiết
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="flex justify-center mt-10 sm:hidden">
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="group inline-flex items-center gap-2 bg-[#EE0000] text-white px-8 py-3 rounded-md font-bold hover:bg-red-700 transition-all uppercase text-sm tracking-widest"
            >
              Xem tất cả
              <div className="bg-white/20 rounded-full p-1 group-hover:translate-x-1 transition-transform">
                <ChevronRight className="w-4 h-4" />
              </div>
            </button>
          </div>
        </div>
      </section>

      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <section className="relative w-full h-[400px] flex items-center justify-center overflow-hidden shadow-xl">
          <div
            className="absolute inset-0 bg-[#EE0000]"
            style={{
              backgroundImage:
                "\n            linear-gradient(rgba(238, 0, 0, 0.8), rgba(238, 0, 0, 0.9)), \n            url('https://www.viettel.com.vn/images/bg-network.png')\n          ",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/connect.png')]" />
          </div>
          <div className="relative z-10 text-center px-6 max-w-4xl mx-auto space-y-6">
            <div className="space-y-2">
              <h2 className="text-3xl md:text-5xl font-extrabold text-white uppercase tracking-wider">
                CÙNG FINDME
              </h2>
              <h2 className="text-3xl md:text-5xl font-extrabold text-white uppercase tracking-wider">
                KIẾN TẠO TƯƠNG LAI
              </h2>
            </div>
            <p className="text-white/90 text-sm md:text-base font-medium leading-relaxed max-w-2xl mx-auto">
              Ba điều <span className="font-bold">FINDME</span> chắc chắn sẽ cho
              bạn: cơ hội không ngừng sáng tạo, thách thức để khẳng định bản
              thân, và điều kiện để học hỏi, phát triển.
            </p>
            <div className="pt-4">
              <Link
                to="/jobs"
                className="group relative bg-white text-[#EE0000] px-10 py-3 rounded-md font-bold text-sm uppercase tracking-widest hover:bg-gray-100 transition-all duration-300 shadow-xl inline-flex items-center gap-2 mx-auto"
              >
                ỨNG TUYỂN NGAY
                <div className="bg-red-50 rounded-full p-1 group-hover:translate-x-1 transition-transform border border-red-100">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </Link>
            </div>
          </div>
          <div className="absolute right-[-10%] bottom-[-20%] w-[500px] h-[500px] bg-white/5 rounded-full blur-3xl" />
        </section>
      </div>
    </>
  );
};
export default HomePage;

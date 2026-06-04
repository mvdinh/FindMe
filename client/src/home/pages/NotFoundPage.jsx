import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

const NotFoundPage = () => {
  const navigate = useNavigate();
  return (
    <div className="relative min-h-[calc(100vh-12rem)] flex items-center justify-center overflow-hidden px-6 py-16 sm:py-24">
      <div
        className="pointer-events-none absolute inset-0 opacity-40 dark:opacity-25"
        aria-hidden
      >
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-[#EE0000]/15 blur-3xl" />
        <div className="absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-gray-400/20 dark:bg-gray-600/20 blur-3xl" />
      </div>

      <div className="relative z-10 max-w-lg w-full text-center">
        <p
          className="text-[clamp(5rem,22vw,10rem)] font-extrabold leading-none tracking-tighter font-['Open_Sans'] select-none"
          aria-hidden
        >
          <span className="text-gray-200 dark:text-gray-800">4</span>
          <span className="text-[#EE0000]">0</span>
          <span className="text-gray-200 dark:text-gray-800">4</span>
        </p>

        <h1 className="mt-6 text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white font-['Open_Sans']">
          Trang không tìm thấy
        </h1>
        <p className="mt-4 text-base sm:text-lg text-gray-600 dark:text-gray-300 font-['Roboto'] leading-relaxed max-w-md mx-auto">
          Đường dẫn này không tồn tại hoặc đã được di chuyển. Bạn có thể quay về trang chủ để tiếp tục.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/"
            className="inline-flex items-center justify-center w-full sm:w-auto px-8 py-3.5 rounded-xl bg-[#EE0000] text-white font-semibold font-['Roboto'] hover:bg-red-700 active:bg-red-800 transition-colors shadow-lg shadow-red-600/25 dark:shadow-red-900/30"
          >
            Về trang chủ
          </Link>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center justify-center w-full sm:w-auto px-8 py-3.5 rounded-xl border-2 border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-200 font-semibold font-['Roboto'] hover:bg-gray-50 dark:hover:bg-gray-800/80 transition-colors"
          >
            Quay lại trang trước
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;

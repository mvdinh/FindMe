import React from 'react';
import { Link } from 'react-router-dom';
const UnauthorizedPage = () => {
  return <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300 flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center space-y-8">
        {}
        <div className="mx-auto w-24 h-24 bg-red-100 dark:bg-red-900 transition-colors duration-300 rounded-full flex items-center justify-center">
          <svg className="w-12 h-12 text-red-600 dark:text-red-300 transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0h.01M12 17h-.01M12 6v6" />
          </svg>
        </div>

        {}
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white transition-colors duration-300 font-['Open_Sans']">
          Truy cập không được phép
        </h1>

        {}
        <p className="text-lg text-gray-600 dark:text-gray-300 transition-colors duration-300 font-['Roboto'] leading-relaxed">
          Bạn không có quyền truy cập trang này. Vui lòng đăng nhập hoặc liên hệ hỗ trợ nếu bạn cho rằng đây là lỗi.
        </p>

        {}
        <div className="space-y-4">
          <Link to="/" className="inline-block bg-black text-white dark:bg-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 px-8 py-4 rounded-lg text-lg font-semibold font-['Open_Sans'] transition-colors w-full">
            Về trang chủ
          </Link>
        </div>

        {}
        <div className="pt-8 border-t border-gray-200 dark:border-gray-700 transition-colors duration-300">
          <p className="text-sm text-gray-600 dark:text-gray-400 font-['Roboto']">
            Cần trợ giúp?{' '}
            <Link to="/contact" className="text-black dark:text-white hover:underline font-semibold">
              Liên hệ hỗ trợ
            </Link>
          </p>
        </div>
      </div>
    </div>;
};
export default UnauthorizedPage;
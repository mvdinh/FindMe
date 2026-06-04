import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
const Layout = ({
  children,
  showFooter = true
}) => {
  return <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col transition-colors duration-300">
      <Navbar />
      <main className="flex-grow">
        {children}
      </main>
      {showFooter && <Footer />}
    </div>;
};
export default Layout;
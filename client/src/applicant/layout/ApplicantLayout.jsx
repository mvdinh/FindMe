import React from 'react';
import Layout from '../../home/layout/Layout';

const ApplicantLayout = ({ children }) => {
  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 pt-24 pb-12 transition-colors duration-300">
        {children}
      </div>
    </Layout>
  );
};

export default ApplicantLayout;

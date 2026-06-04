import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext.jsx';
import { ToastProvider } from './contexts/ToastContext.jsx';
import { ThemeProvider } from './contexts/ThemeContext.jsx';
import { NotificationsProvider } from './contexts/NotificationsContext.jsx';
import Layout from './home/layout/Layout.jsx';
import ProtectedRoute from './components/common/ProtectedRoute.jsx';
import PublicRoute from './components/common/PublicRoute.jsx';
import HomePage from './home/pages/HomePage.jsx';
import LoginPage from './home/pages/LoginPage.jsx';
import SignupPage from './home/pages/SignupPage.jsx';
import EmailOtpVerify from './home/pages/EmailOtpVerify.jsx';
import ForgotPasswordPage from './home/pages/ForgotPasswordPage.jsx';
import NotFoundPage from './home/pages/NotFoundPage.jsx';
import UnauthorizedPage from './home/pages/UnauthorizedPage.jsx';
import ApplicantDashboard from './applicant/pages/ApplicantDashboard.jsx';
import JobsPage from './applicant/pages/JobsPage.jsx';
import JobDetailsPage from './applicant/pages/JobDetailsPage.jsx';
import ApplicationsPage from './applicant/pages/ApplicationsPage.jsx';
import ConfirmInterviewPage from './applicant/pages/ConfirmInterviewPage.jsx';
import SavedJobsPage from './applicant/pages/SavedJobsPage.jsx';
import ProfilePage from './applicant/pages/ProfilePage.jsx';
import JobApplicationPage from './applicant/pages/JobApplicationPage.jsx';
import NotificationsPage from './applicant/pages/MessagesPage.jsx';
import AdminDashboard from './admin/pages/AdminDashboard.jsx';
import HRManagementPage from './admin/pages/HRManagementPage.jsx';
import AllJobsPage from './admin/pages/AllJobsPage.jsx';
import JobStatusRequestsPage from './admin/pages/JobStatusRequestsPage.jsx';
import AdminNotifications from './admin/pages/AdminNotifications.jsx';
import AdminAccountsPage from './admin/pages/AdminAccountsPage.jsx';
import HRDashboard from './hr/pages/HRDashboard.jsx';
import HRJobManagement from './hr/pages/HRJobManagement.jsx';
import HRApplicationManagement from './hr/pages/HRApplicationManagement.jsx';
import HRProfile from './hr/pages/HRProfile.jsx';
import HRCreateJob from './hr/pages/HRCreateJob.jsx';
import HREditJob from './hr/pages/HREditJob.jsx';
import HRJobApplications from './hr/pages/HRJobApplications.jsx';
import HRNotifications from './hr/pages/HRNotifications.jsx';
import NotificationDetailPage from './components/notifications/NotificationDetailPage.jsx';
import HRLayout from './hr/layout/HRLayout.jsx';
import AdminLayout from './admin/layout/AdminLayout.jsx';
import ApplicantLayout from './applicant/layout/ApplicantLayout.jsx';
function App() {
  return <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
        <NotificationsProvider>
        <Router>
        <Routes>
          {}
          <Route path="/" element={<PublicRoute>
              <Layout>
              <HomePage />
            </Layout>
            </PublicRoute>} />
          <Route path="/login" element={<PublicRoute>
              <Layout showFooter={false}>
              <LoginPage />
            </Layout>
            </PublicRoute>} />
          <Route path="/signup" element={<PublicRoute>
              <Layout showFooter={false}>
              <SignupPage />
            </Layout>
            </PublicRoute>} />
            <Route path="/verify-email" element={<PublicRoute>
                <Layout showFooter={false}>
                <EmailOtpVerify />
              </Layout>
              </PublicRoute>} />
          <Route path="/forgot-password" element={<PublicRoute>
              <Layout showFooter={false}>
              <ForgotPasswordPage />
            </Layout>
            </PublicRoute>} />

          {}
          <Route path="/dashboard" element={<ProtectedRoute roles={['applicant']}>
              <ApplicantDashboard />
            </ProtectedRoute>} />
          <Route path="/jobs" element={<ProtectedRoute roles={['applicant']}>
              <JobsPage />
            </ProtectedRoute>} />
          <Route path="/jobs/:jobId" element={<ProtectedRoute roles={['applicant']}>
              <JobDetailsPage />
            </ProtectedRoute>} />
          <Route path="/jobs/:jobId/apply" element={<ProtectedRoute roles={['applicant']}>
              <JobApplicationPage />
            </ProtectedRoute>} />
          <Route path="/applicant/applications" element={<ProtectedRoute roles={['applicant']}>
              <ApplicationsPage />
            </ProtectedRoute>} />
          <Route path="/applicant/confirm-interview" element={<ProtectedRoute roles={['applicant']}>
              <ConfirmInterviewPage />
            </ProtectedRoute>} />
          <Route path="/saved-jobs" element={<ProtectedRoute roles={['applicant']}>
              <SavedJobsPage />
            </ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute roles={['applicant']}>
              <ProfilePage />
            </ProtectedRoute>} />
          <Route
            path="/notifications/:notificationId"
            element={
              <ProtectedRoute roles={['applicant']}>
                <NotificationDetailPage Layout={ApplicantLayout} listPath="/notifications" />
              </ProtectedRoute>
            }
          />
          <Route path="/notifications" element={<ProtectedRoute roles={['applicant']}>
              <NotificationsPage />
            </ProtectedRoute>} />

          {}
          <Route path="/admin" element={<ProtectedRoute roles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>} />
          <Route path="/admin/dashboard" element={<ProtectedRoute roles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>} />
          <Route path="/admin/hr-management" element={<ProtectedRoute roles={['admin']}>
              <HRManagementPage />
            </ProtectedRoute>} />
          <Route path="/admin/accounts" element={<ProtectedRoute roles={['admin']}>
              <AdminAccountsPage />
            </ProtectedRoute>} />
          <Route path="/admin/jobs" element={<ProtectedRoute roles={['admin']}>
              <AllJobsPage />
            </ProtectedRoute>} />
          <Route path="/admin/job-status-requests" element={<ProtectedRoute roles={['admin']}>
              <JobStatusRequestsPage />
            </ProtectedRoute>} />
          <Route
            path="/admin/notifications/:notificationId"
            element={
              <ProtectedRoute roles={['admin']}>
                <NotificationDetailPage Layout={AdminLayout} listPath="/admin/notifications" />
              </ProtectedRoute>
            }
          />
          <Route path="/admin/notifications" element={<ProtectedRoute roles={['admin']}>
              <AdminNotifications />
            </ProtectedRoute>} />

          {}
          <Route path="/hr" element={<ProtectedRoute roles={['hr']}>
              <HRDashboard />
            </ProtectedRoute>} />
          <Route path="/hr/dashboard" element={<ProtectedRoute roles={['hr']}>
              <HRDashboard />
            </ProtectedRoute>} />
          <Route path="/hr/jobs" element={<ProtectedRoute roles={['hr']}>
              <HRJobManagement />
            </ProtectedRoute>} />
          <Route path="/hr/jobs/create" element={<ProtectedRoute roles={['hr']}>
              <HRCreateJob />
            </ProtectedRoute>} />
          <Route path="/hr/jobs/:jobId/edit" element={<ProtectedRoute roles={['hr']}>
              <HREditJob />
            </ProtectedRoute>} />
          <Route path="/hr/jobs/:jobId/applications" element={<ProtectedRoute roles={['hr']}>
              <HRJobApplications />
            </ProtectedRoute>} />
          <Route path="/hr/applications" element={<ProtectedRoute roles={['hr', 'admin']}>
              <HRApplicationManagement />
            </ProtectedRoute>} />
          <Route
            path="/hr/notifications/:notificationId"
            element={
              <ProtectedRoute roles={['hr']}>
                <NotificationDetailPage Layout={HRLayout} listPath="/hr/notifications" />
              </ProtectedRoute>
            }
          />
          <Route path="/hr/notifications" element={<ProtectedRoute roles={['hr']}>
              <HRNotifications />
            </ProtectedRoute>} />
          <Route path="/hr/profile" element={<ProtectedRoute roles={['hr']}>
              <HRProfile />
            </ProtectedRoute>} />

          {}

          {}
          <Route path="/unauthorized" element={<Layout showFooter={false}>
              <UnauthorizedPage />
            </Layout>} />
          <Route path="*" element={<Layout>
              <NotFoundPage />
            </Layout>} />
        </Routes>
      </Router>
    </NotificationsProvider>
    </ToastProvider>
    </AuthProvider>
    </ThemeProvider>;
}
export default App;
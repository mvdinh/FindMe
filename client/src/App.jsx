import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext.jsx";
import { ToastProvider } from "./contexts/ToastContext.jsx";
import { ThemeProvider } from "./contexts/ThemeContext.jsx";
import { NotificationsProvider } from "./contexts/NotificationsContext.jsx";
import Layout from "./home/layout/Layout.jsx";
import ProtectedRoute from "./components/common/ProtectedRoute.jsx";
import PublicRoute from "./components/common/PublicRoute.jsx";
import HomePage from "./home/pages/HomePage.jsx";
import LoginPage from "./home/pages/LoginPage.jsx";
import SignupPage from "./home/pages/SignupPage.jsx";
import RecruiterAuthPage from "./home/pages/RecruiterAuthPage.jsx";
import EmailOtpVerify from "./home/pages/EmailOtpVerify.jsx";
import ForgotPasswordPage from "./home/pages/ForgotPasswordPage.jsx";
import NotFoundPage from "./home/pages/NotFoundPage.jsx";
import UnauthorizedPage from "./home/pages/UnauthorizedPage.jsx";
// import ApplicantDashboard from './applicant/pages/ApplicantDashboard.jsx';
import JobsPage from "./applicant/pages/JobsPage.jsx";
import JobSearchPage from "./applicant/pages/JobSearchPage.jsx";
import CompaniesPage from "./home/pages/CompaniesPage.jsx";
import JobDetailsPage from "./applicant/pages/JobDetailsPage.jsx";
import ApplicationsPage from "./applicant/pages/ApplicationsPage.jsx";
import ConfirmInterviewPage from "./applicant/pages/ConfirmInterviewPage.jsx";
import SavedJobsPage from "./applicant/pages/SavedJobsPage.jsx";
import ProfilePage from "./applicant/pages/ProfilePage.jsx";
import JobApplicationPage from "./applicant/pages/JobApplicationPage.jsx";
import NotificationsPage from "./applicant/pages/MessagesPage.jsx";
import RecruiterManagementPage from "./admin/pages/RecruiterManagementPage.jsx";
import AllJobsPage from "./admin/pages/AllJobsPage.jsx";
import AdminJobDetailsPage from "./admin/pages/AdminJobDetailsPage.jsx";
import JobStatusRequestsPage from "./admin/pages/JobStatusRequestsPage.jsx";
import AdminNotifications from "./admin/pages/AdminNotifications.jsx";
import AdminAccountsPage from "./admin/pages/AdminAccountsPage.jsx";
import AdminCompaniesPage from "./admin/pages/AdminCompaniesPage.jsx";
import RecruiterDashboard from "./recruiter/pages/RecruiterDashboard.jsx";
import RecruiterJobManagement from "./recruiter/pages/RecruiterJobManagement.jsx";
import RecruiterApplicationManagement from "./recruiter/pages/RecruiterApplicationManagement.jsx";
import RecruiterProfile from "./recruiter/pages/RecruiterProfile.jsx";
import RecruiterCreateJob from "./recruiter/pages/RecruiterCreateJob.jsx";
import RecruiterEditJob from "./recruiter/pages/RecruiterEditJob.jsx";
import RecruiterJobApplications from "./recruiter/pages/RecruiterJobApplications.jsx";
import RecruiterNotifications from "./recruiter/pages/RecruiterNotifications.jsx";
import NotificationDetailPage from "./components/notifications/NotificationDetailPage.jsx";
import RecruiterLayout from "./recruiter/layout/RecruiterLayout.jsx";
import AdminLayout from "./admin/layout/AdminLayout.jsx";
import ApplicantLayout from "./applicant/layout/ApplicantLayout.jsx";
function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <NotificationsProvider>
            <Router>
              <Routes>
                {}
                <Route
                  path="/"
                  element={
                    <Layout>
                      <JobsPage />
                    </Layout>
                  }
                />
                <Route
                  path="/jobs"
                  element={
                    <Layout>
                      <JobsPage />
                    </Layout>
                  }
                />
                <Route
                  path="/jobs/search"
                  element={
                    <Layout>
                      <JobSearchPage />
                    </Layout>
                  }
                />
                <Route
                  path="/companies"
                  element={
                    <Layout>
                      <CompaniesPage />
                    </Layout>
                  }
                />
                <Route
                  path="/jobs/:jobId"
                  element={
                    <Layout>
                      <JobDetailsPage />
                    </Layout>
                  }
                />
                <Route
                  path="/login"
                  element={
                    <PublicRoute>
                      <Layout showFooter={false} showNavbar={false}>
                        <LoginPage />
                      </Layout>
                    </PublicRoute>
                  }
                />
                <Route
                  path="/signup"
                  element={
                    <PublicRoute>
                      <Layout showFooter={false} showNavbar={false}>
                        <SignupPage />
                      </Layout>
                    </PublicRoute>
                  }
                />
                <Route
                  path="/tuyen-dung"
                  element={
                    <PublicRoute>
                      <Layout showFooter={false} showNavbar={false}>
                        <RecruiterAuthPage />
                      </Layout>
                    </PublicRoute>
                  }
                />
                <Route
                  path="/verify-email"
                  element={
                    <PublicRoute>
                      <Layout showFooter={false}>
                        <EmailOtpVerify />
                      </Layout>
                    </PublicRoute>
                  }
                />
                <Route
                  path="/forgot-password"
                  element={
                    <PublicRoute>
                      <Layout showFooter={false}>
                        <ForgotPasswordPage />
                      </Layout>
                    </PublicRoute>
                  }
                />

                {}
                <Route
                  path="/dashboard"
                  element={<Navigate to="/jobs" replace />}
                />
                <Route
                  path="/jobs/:jobId/apply"
                  element={
                    <ProtectedRoute roles={["applicant"]}>
                      <JobApplicationPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/applicant/applications"
                  element={
                    <ProtectedRoute roles={["applicant"]}>
                      <ApplicationsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/applicant/confirm-interview"
                  element={
                    <ProtectedRoute roles={["applicant"]}>
                      <ConfirmInterviewPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/saved-jobs"
                  element={
                    <ProtectedRoute roles={["applicant"]}>
                      <SavedJobsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute roles={["applicant"]}>
                      <ProfilePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/notifications/:notificationId"
                  element={
                    <ProtectedRoute roles={["applicant"]}>
                      <NotificationDetailPage
                        Layout={ApplicantLayout}
                        listPath="/notifications"
                      />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/notifications"
                  element={
                    <ProtectedRoute roles={["applicant"]}>
                      <NotificationsPage />
                    </ProtectedRoute>
                  }
                />

                {}
                
                <Route
                  path="/admin/recruiter-management"
                  element={
                    <ProtectedRoute roles={["admin"]}>
                      <RecruiterManagementPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/accounts"
                  element={
                    <ProtectedRoute roles={["admin"]}>
                      <AdminAccountsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/jobs"
                  element={
                    <ProtectedRoute roles={["admin"]}>
                      <AllJobsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/jobs/:jobId"
                  element={
                    <ProtectedRoute roles={["admin"]}>
                      <AdminJobDetailsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/job-status-requests"
                  element={
                    <ProtectedRoute roles={["admin"]}>
                      <JobStatusRequestsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/companies"
                  element={
                    <ProtectedRoute roles={["admin"]}>
                      <AdminCompaniesPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/notifications/:notificationId"
                  element={
                    <ProtectedRoute roles={["admin"]}>
                      <NotificationDetailPage
                        Layout={AdminLayout}
                        listPath="/admin/notifications"
                      />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/notifications"
                  element={
                    <ProtectedRoute roles={["admin"]}>
                      <AdminNotifications />
                    </ProtectedRoute>
                  }
                />

                {}
                <Route
                  path="/recruiter"
                  element={
                    <ProtectedRoute roles={["recruiter"]}>
                      <RecruiterDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/recruiter/dashboard"
                  element={
                    <ProtectedRoute roles={["recruiter"]}>
                      <RecruiterDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/recruiter/jobs"
                  element={
                    <ProtectedRoute roles={["recruiter"]}>
                      <RecruiterJobManagement />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/recruiter/jobs/create"
                  element={
                    <ProtectedRoute roles={["recruiter"]}>
                      <RecruiterCreateJob />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/recruiter/jobs/:jobId/edit"
                  element={
                    <ProtectedRoute roles={["recruiter"]}>
                      <RecruiterEditJob />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/recruiter/jobs/:jobId/applications"
                  element={
                    <ProtectedRoute roles={["recruiter"]}>
                      <RecruiterJobApplications />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/recruiter/applications"
                  element={
                    <ProtectedRoute roles={["recruiter", "admin"]}>
                      <RecruiterApplicationManagement />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/recruiter/notifications/:notificationId"
                  element={
                    <ProtectedRoute roles={["recruiter"]}>
                      <NotificationDetailPage
                        Layout={RecruiterLayout}
                        listPath="/recruiter/notifications"
                      />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/recruiter/notifications"
                  element={
                    <ProtectedRoute roles={["recruiter"]}>
                      <RecruiterNotifications />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/recruiter/profile"
                  element={
                    <ProtectedRoute roles={["recruiter"]}>
                      <RecruiterProfile />
                    </ProtectedRoute>
                  }
                />

                {}

                {}
                <Route
                  path="/unauthorized"
                  element={
                    <Layout showFooter={false}>
                      <UnauthorizedPage />
                    </Layout>
                  }
                />
                <Route
                  path="*"
                  element={
                    <Layout>
                      <NotFoundPage />
                    </Layout>
                  }
                />
              </Routes>
            </Router>
          </NotificationsProvider>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
export default App;

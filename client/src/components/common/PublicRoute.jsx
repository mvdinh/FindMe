import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

const getDashboardPathByRole = (role) => {
  if (role === "admin") return "/admin/dashboard";
  if (role === "recruiter") return "/recruiter/dashboard";
  return "/dashboard";
};

const PublicRoute = ({ children }) => {
  const { loading, isAuthenticated, user } = useAuth();

  if (loading) {
    return null;
  }

  if (isAuthenticated()) {
    // If the logged-in user is an applicant, allow them to access recruiter authentication and related pages
    // (so they can register or log in as a recruiter which will overwrite their session).
    const path = window.location.pathname.toLowerCase();
    const isRecruiterOrAuthHelperPath = 
      path === '/tuyen-dung' || 
      path === '/verify-email' || 
      path === '/forgot-password';

    if (user?.role === 'applicant' && isRecruiterOrAuthHelperPath) {
      return children;
    }
    return <Navigate to={getDashboardPathByRole(user?.role)} replace />;
  }

  return children;
};

export default PublicRoute;

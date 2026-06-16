import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
const ProtectedRoute = ({
  children,
  roles = []
}) => {
  const {
    user,
    isAuthenticated,
    hasRole,
    loading
  } = useAuth();
  const location = useLocation();
  if (loading) {
    return null;
  }
  if (!isAuthenticated()) {
    const isRecruiterPath = location.pathname.startsWith('/recruiter') || location.pathname.startsWith('/admin');
    const redirectPath = isRecruiterPath ? '/tuyen-dung' : '/login';
    return <Navigate to={redirectPath} state={{
      from: location
    }} replace />;
  }
  if (roles.length > 0 && !hasRole(roles)) {
    return <Navigate to="/unauthorized" replace />;
  }
  return children;
};
export default ProtectedRoute;
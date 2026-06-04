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
    return <Navigate to="/login" state={{
      from: location
    }} replace />;
  }
  if (roles.length > 0 && !hasRole(roles)) {
    return <Navigate to="/unauthorized" replace />;
  }
  return children;
};
export default ProtectedRoute;
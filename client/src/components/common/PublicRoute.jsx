import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const getDashboardPathByRole = role => {
  if (role === 'admin') return '/admin/dashboard';
  if (role === 'hr') return '/hr/dashboard';
  return '/dashboard';
};

const PublicRoute = ({ children }) => {
  const { loading, isAuthenticated, user } = useAuth();

  if (loading) {
    return null;
  }

  if (isAuthenticated()) {
    return <Navigate to={getDashboardPathByRole(user?.role)} replace />;
  }

  return children;
};

export default PublicRoute;

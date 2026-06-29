import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const getDashboardPath = (user) => {
  if (user.role === 'ADMIN') return '/admin';
  if (user.role === 'CREATOR') return user.kycStatus === 'APPROVED' ? '/creator' : '/kyc-verification';
  return '/donor';
};

const ProtectedRoute = ({ children, allowedRoles, requireApprovedKyc = false }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-darkbg flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-textSecondary text-sm font-medium">Verifying authorization credentials...</p>
      </div>
    );
  }

  if (!user) {
    // Redirect to login but save the current location
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={getDashboardPath(user)} replace />;
  }

  if (requireApprovedKyc && user.role === 'CREATOR' && user.kycStatus !== 'APPROVED') {
    return <Navigate to="/kyc-verification" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/src/contexts/AuthContext';
import { UserRole } from '@/src/types';

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children, allowedRoles }) => {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  // Still loading — render nothing but don't redirect yet
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Not logged in
  if (!user || profile === null) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Waiting for profile (user logged in but profile not yet fetched)
  if (profile === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    if (profile.role === 'worker') return <Navigate to="/worker" replace />;
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

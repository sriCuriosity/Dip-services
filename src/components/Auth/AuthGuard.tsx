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
  // Removed the global redirect to fix worker pages
  // Show spinner while:
  // 1. Auth is still initializing (loading=true)
  // 2. profile===undefined — initial state before onAuthStateChanged fires.
  //    This prevents a false redirect to /login in the brief window between
  //    navigate() being called in Login and onAuthStateChanged updating state.
  // Only block on first auth bootstrap — never hide nav after profile is known
  if (loading && profile === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-[#F95A2C] border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 text-sm font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  // Definitively not logged in (profile=null means fetch completed, no data)
  if (!user || profile === null) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Role-based access control
  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    if (profile.role === 'worker') return <Navigate to="/worker" replace />;
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

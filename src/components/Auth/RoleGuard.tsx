import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/src/contexts/AuthContext';
import { UserRole } from '@/src/types';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
}

/** Role check without a second full-screen loading gate (parent AuthGuard already ran). */
export const RoleGuard: React.FC<RoleGuardProps> = ({ children, allowedRoles }) => {
  const { profile } = useAuth();

  if (!profile) return null;

  if (!allowedRoles.includes(profile.role)) {
    if (profile.role === 'worker') return <Navigate to="/worker" replace />;
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { AuthGuard } from './components/Auth/AuthGuard';
import { RoleGuard } from './components/Auth/RoleGuard';
import { SplashScreen } from './components/Common/SplashScreen';
import { Login } from './components/Auth/Login';
import { MobileLayout } from './components/Layout/MobileLayout';
import { UserDashboard } from './components/User/UserDashboard';
import { ShopList } from './components/User/ShopList';
import { MembersList } from './components/User/MembersList';
import { OrderHistory } from './components/User/OrderHistory';
import { RentalsList } from './components/User/RentalsList';
import { WorkerDashboard } from './components/Worker/WorkerDashboard';
import { JobRequest } from './components/Worker/JobRequest';
import { WorkerProfileSetup } from './components/Worker/WorkerProfileSetup';
import { ShopProfileSetup } from './components/Profile/ShopProfileSetup';
import { Earnings } from './components/Worker/Earnings';
import { Profile } from './components/Profile/Profile';
import { UserFees } from './components/User/UserFees';
import { BookingHistory } from './components/User/BookingHistory';
import { JobHistory } from './components/Worker/JobHistory';
import { AdminDashboard } from './components/Admin/AdminDashboard';
import { isFirebaseConfigured } from './lib/firebase';
import { ConfigRequired } from './components/Common/ConfigRequired';
import { About } from './components/Common/About';
import { PrivacySecurity } from './components/Common/PrivacySecurity';
import { TermsOfService } from './components/Common/TermsOfService';
import { FAQ } from './components/Common/FAQ';
import { useState, useEffect } from 'react';
import { ScrollToTop } from './components/Common/ScrollToTop';
import { GlobalWorkerTracker } from './components/Worker/GlobalWorkerTracker';
import { FCMService } from './lib/fcmService';
import { useLocation, useNavigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AnimatePresence } from 'framer-motion';

function FCMNavigationGate() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    FCMService.setNavigateHandler((path) => {
      // Use fresh window location to avoid stale closure issues during rapid navigation
      const hashPath = (window.location.hash.replace(/^#/, '') || '/').split('?')[0];
      const currentPath = hashPath.startsWith('/') ? hashPath : `/${hashPath}`;
      if (currentPath !== path && !window.location.hash.includes(path)) {
        console.log('FCMNavigationGate: Navigating to', path);
        navigate(path);
      }
    });
    FCMService.checkAndRedirect();
  }, [navigate]);

  return null;
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  useEffect(() => {
    // FCMService.initGlobalListeners() is now called inside App.tsx useEffect for better React lifecycle integration.
  }, []);

  if (!isFirebaseConfigured) {
    return <ConfigRequired />;
  }

  return (
    <ThemeProvider>
      <AuthProvider>
        <LanguageProvider>
          <HashRouter>
            {/* Splash overlaid on top — everything else always mounted */}
            <AnimatePresence>
              {showSplash && (
                <SplashScreen onComplete={() => setShowSplash(false)} />
              )}
            </AnimatePresence>

            <ScrollToTop />
            <FCMNavigationGate />
            <GlobalWorkerTracker />
            <Routes>
              <Route path="/login" element={<Login />} />

              <Route element={<AuthGuard><MobileLayout /></AuthGuard>}>
                {/* User Routes */}
                <Route path="/" element={<UserDashboard />} />
                <Route path="/shops" element={<ShopList />} />
                <Route path="/members" element={<MembersList />} />
                <Route path="/orders" element={<OrderHistory />} />
                <Route path="/user/fees" element={<UserFees />} />
                <Route path="/user/history" element={<BookingHistory />} />
                <Route path="/rentals" element={<RentalsList />} />

                {/* Worker Routes */}
                <Route path="/worker" element={<RoleGuard allowedRoles={['worker']}><WorkerDashboard /></RoleGuard>} />
                <Route path="/worker/jobs" element={<RoleGuard allowedRoles={['worker']}><JobRequest /></RoleGuard>} />
                <Route path="/worker/profile" element={<RoleGuard allowedRoles={['worker']}><WorkerProfileSetup /></RoleGuard>} />
                <Route path="/worker/profile/:trade" element={<RoleGuard allowedRoles={['worker']}><WorkerProfileSetup /></RoleGuard>} />
                <Route path="/worker/shop-profile" element={<RoleGuard allowedRoles={['worker']}><ShopProfileSetup /></RoleGuard>} />
                <Route path="/worker/earnings" element={<RoleGuard allowedRoles={['worker']}><Earnings /></RoleGuard>} />
                <Route path="/worker/history" element={<RoleGuard allowedRoles={['worker']}><JobHistory /></RoleGuard>} />

                {/* Admin Routes */}
                <Route path="/admin" element={<RoleGuard allowedRoles={['admin']}><AdminDashboard /></RoleGuard>} />

                {/* Shared Routes */}
                <Route path="/profile" element={<Profile />} />
                <Route path="/profile/shop-setup" element={<ShopProfileSetup />} />
                <Route path="/about" element={<About />} />
                <Route path="/faq" element={<FAQ />} />
                <Route path="/privacy-security" element={<PrivacySecurity />} />
                <Route path="/terms" element={<TermsOfService />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </HashRouter>
        </LanguageProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

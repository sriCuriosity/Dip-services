import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { ref, set, get, update } from "firebase/database";
import { auth, db } from "@/src/lib/firebase";
import { useLanguage } from "@/src/contexts/LanguageContext";
import { useAuth } from "@/src/contexts/AuthContext";
import { Hammer, Eye, EyeOff, UserCircle, Globe, MapPin } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/src/lib/utils";
import { MapPicker } from "../Common/MapPicker";
import { CITIES_LIST } from "@/src/lib/citiesData";

export const Login: React.FC = () => {
  const { t, language, setLanguage } = useLanguage();
  const [currentView, setCurrentView] = useState<
    "welcome" | "login" | "register"
  >("login");
  const [showPassword, setShowPassword] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [landmark, setLandmark] = useState("");
  const [role, setRole] = useState<"user" | "worker">("user");
  const [latitude, setLatitude] = useState<number | undefined>();
  const [longitude, setLongitude] = useState<number | undefined>();
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();

  const isLogin = currentView === "login";

  // Redirect if already logged in (e.g. app restart while session active)
  React.useEffect(() => {
    if (!authLoading && user && profile) {
      if (profile.role === 'worker') {
        navigate("/worker", { replace: true });
      } else if (profile.role === 'admin') {
        navigate("/admin", { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    }
  }, [user, profile, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) {
      setError(
        "Firebase is not configured. Please check your environment variables.",
      );
      return;
    }
    setError("");
    setLoading(true);

    try {
      if (isLogin) {
        // --- SIGN IN ---
        const credential = await signInWithEmailAndPassword(
          auth,
          email,
          password,
        );
        // Update role to 'user' on login to ensure they land on User Dashboard
        try {
          await update(ref(db, `users/${credential.user.uid}`), { role: 'user' });
          // Clear any FCM-stored navigation target so it doesn't redirect to worker pages
          localStorage.removeItem('dip_pending_notif_target');
          // CRITICAL: Force AuthContext to reload the fresh profile so MobileLayout
          // sees role='user' and shows user nav (not worker nav) before we navigate.
          await refreshProfile(credential.user.uid);
          navigate("/", { replace: true });
        } catch {
          // Fallback: let the useEffect handle navigation
          localStorage.removeItem('dip_pending_notif_target');
          if (profile?.role === 'worker') {
            navigate("/worker", { replace: true });
          } else {
            navigate("/", { replace: true });
          }
        }
      } else {
        // --- SIGN UP ---

        const userCredential = await createUserWithEmailAndPassword(
          auth,
          email,
          password,
        );
        const { user: firebaseUser } = userCredential;

        const profileData = {
          uid: firebaseUser.uid,
          name,
          email,
          phone,
          address,
          city,
          landmark,
          role,
          latitude: latitude ?? null,
          longitude: longitude ?? null,
          createdAt: Date.now(),
        };

        await set(ref(db, `users/${firebaseUser.uid}`), profileData);

        if (role === "worker") {
          await set(ref(db, `workers/${firebaseUser.uid}`), {
            uid: firebaseUser.uid,
            trade: "",
            experience: "",
            bio: "",
            location: address,
            latitude: latitude ?? null,
            longitude: longitude ?? null,
            workingHours: "9 AM - 6 PM",
            rates: {
              fullDay: 800,
              halfDay: 500,
              quickVisit: 300,
            },
            rating: 5,
            totalJobs: 0,
            totalEarnings: 0,
            isAvailable: true,
          });
        }

        // Profile data is now in DB. onAuthStateChanged (already fired by
        // createUserWithEmailAndPassword) will pick it up via the retry logic
        // in AuthContext. Navigate now — AuthGuard will show a spinner until
        // the profile is ready.
        navigate("/", { replace: true });
      }
    } catch (err: any) {
      setError(
        err?.message || "Sign in failed. Please check your credentials.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={cn(
        "mobile-container overflow-hidden relative",
        currentView === "welcome"
          ? "bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#334155]"
          : "bg-gradient-to-br from-orange-50 via-white to-orange-50",
      )}
    >
      {/* Background Curves */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <svg
          className="absolute w-full h-full"
          viewBox="0 0 400 800"
          preserveAspectRatio="none"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M-50 -50 C 150 100 300 -50 450 150"
            stroke="#F95A2C"
            strokeOpacity="0.08"
            strokeWidth="1.5"
            fill="none"
          />
          <path
            d="M-50 200 C 100 400 -50 600 200 850"
            stroke="#F95A2C"
            strokeOpacity="0.08"
            strokeWidth="1.5"
            fill="none"
          />
          <path
            d="M450 400 C 250 500 350 700 150 900"
            stroke="#F95A2C"
            strokeOpacity="0.08"
            strokeWidth="1.5"
            fill="none"
          />
          <path
            d="M-100 700 C 100 600 300 800 500 700"
            stroke="#F95A2C"
            strokeOpacity="0.08"
            strokeWidth="1.5"
            fill="none"
          />
        </svg>
      </div>

      <div className="flex-1 flex flex-col relative z-10 h-full">
        <AnimatePresence mode="wait">
          {currentView === "welcome" && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center h-full px-8 text-center pt-16 pb-12 relative"
            >
              {/* Decorative blobs */}
              <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-[-10%] right-[-10%] w-64 h-64 bg-slate-400/10 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 w-full max-w-[320px] aspect-square mb-12 transform hover:scale-105 transition-transform duration-500">
                <div className="absolute inset-0 bg-white/5 backdrop-blur-xl rounded-[3rem] border border-white/10 shadow-2xl" />
                <img
                  src="/splash.png"
                  alt="Welcome"
                  className="w-full h-full object-cover rounded-[3rem] p-2"
                  onError={(e) => {
                    e.currentTarget.src = "/icon.png";
                  }}
                />
              </div>

              <div className="relative z-10 space-y-4 mb-20">
                <h1 className="text-4xl font-black text-white tracking-tight leading-tight">
                  {t("Discover Your")} <br />
                  <span className="text-blue-400">{t("Dream Service")}</span>
                </h1>
                <p className="text-slate-300 text-sm px-6 leading-relaxed font-medium">
                  {t(
                    "Expert local professionals for all your home needs, repairs and rentals.",
                  )}
                </p>
              </div>

              <div className="relative z-10 flex flex-col w-full gap-4 mt-auto">
                <button
                  onClick={() => setCurrentView("login")}
                  className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-lg shadow-[0_12px_30px_rgba(37,99,235,0.4)] active:scale-95 hover:bg-blue-700 transition-all uppercase tracking-widest"
                >
                  {t("Get Started")}
                </button>
                <div className="flex gap-4">
                  <button
                    onClick={() => setCurrentView("register")}
                    className="flex-1 bg-white/10 backdrop-blur-md text-white py-4 rounded-2xl font-bold active:scale-95 transition-all text-sm border border-white/20"
                  >
                    {t("Join Us")}
                  </button>
                  <button
                    onClick={() => setCurrentView("login")}
                    className="flex-1 bg-white text-slate-900 py-4 rounded-2xl font-bold active:scale-95 transition-all text-sm shadow-xl"
                  >
                    {t("Sign In")}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {currentView === "login" && (
            <motion.div
              key="login"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex flex-col h-full px-8 pt-20 pb-8"
            >
              <div className="text-center mb-12">
                <div className="flex items-center justify-center gap-2 mb-8">
                  <Hammer className="text-[#F95A2C]" size={24} />
                  <h1 className="text-xl font-black text-slate-900 tracking-tight">
                    {t("DIP Services")}
                  </h1>
                </div>
                <h1 className="text-3xl font-extrabold text-[#F95A2C] mb-6">
                  {t("Login here")}
                </h1>
                <h2 className="text-2xl font-bold text-slate-800 w-full mx-auto leading-tight break-words px-4">
                  {t("Welcome back you've been missed!")}
                </h2>
              </div>
              <form
                onSubmit={handleSubmit}
                className="space-y-6 flex-1 flex flex-col"
              >
                <input
                  type="email"
                  placeholder={t("Email")}
                  className="w-full px-5 py-4 bg-[#F8F9FA] border-2 border-transparent rounded-xl focus:outline-none focus:border-[#F95A2C] focus:bg-white transition-all text-slate-900 placeholder:text-slate-400 font-semibold"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder={t("Password")}
                    className="w-full px-5 py-4 bg-[#F8F9FA] border-2 border-transparent rounded-xl focus:outline-none focus:border-[#F95A2C] focus:bg-white transition-all text-slate-900 placeholder:text-slate-400 font-semibold pr-12"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#F95A2C] transition-colors p-1"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>

                {error && (
                  <div className="p-4 bg-red-50 text-red-600 text-sm font-medium rounded-xl border border-red-100 flex items-start gap-2">
                    <div className="mt-0.5">⚠️</div>
                    <div className="flex-1">{error}</div>
                  </div>
                )}

                <div className="mt-auto pt-8">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#F95A2C] text-white py-4 rounded-xl font-bold text-lg shadow-[0_8px_20px_rgba(249,90,44,0.3)] active:scale-[0.98] transition-all disabled:opacity-70 disabled:active:scale-100 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      t("Sign in")
                    )}
                  </button>

                  <div className="text-center mt-8">
                    <button
                      type="button"
                      onClick={() => setCurrentView("register")}
                      className="text-slate-600 text-sm font-bold hover:text-[#F95A2C] transition-colors"
                    >
                      {t("Create new account")}
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          )}

          {currentView === "register" && (
            <motion.div
              key="register"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex flex-col h-full px-6 pt-16 pb-8 overflow-y-auto no-scrollbar"
            >
              <div className="text-center mb-8">
                <div className="flex items-center justify-center gap-2 mb-6">
                  <Hammer className="text-[#F95A2C]" size={24} />
                  <h1 className="text-xl font-black text-slate-900 tracking-tight">
                    {t("DIP Services")}
                  </h1>
                </div>
                <h1 className="text-3xl font-extrabold text-[#F95A2C] mb-4">
                  {t("Create Account")}
                </h1>
                <p className="text-slate-500 text-sm max-w-[280px] mx-auto leading-relaxed font-medium">
                  {t(
                    "Create an account so you can explore all the existing services",
                  )}
                </p>
              </div>
              <form
                onSubmit={handleSubmit}
                className="space-y-4 flex-1 flex flex-col"
              >
                <input
                  type="text"
                  placeholder={t("Full Name")}
                  className="w-full px-5 py-4 bg-[#F8F9FA] border-2 border-transparent rounded-xl focus:outline-none focus:border-[#F95A2C] focus:bg-white transition-all text-slate-900 placeholder:text-slate-400 font-semibold"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                <input
                  type="tel"
                  placeholder={t("Phone Number")}
                  className="w-full px-5 py-4 bg-[#F8F9FA] border-2 border-transparent rounded-xl focus:outline-none focus:border-[#F95A2C] focus:bg-white transition-all text-slate-900 placeholder:text-slate-400 font-semibold"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
                <input
                  type="text"
                  placeholder={t("Address / Locality")}
                  className="w-full px-5 py-4 bg-[#F8F9FA] border-2 border-transparent rounded-xl focus:outline-none focus:border-[#F95A2C] focus:bg-white transition-all text-slate-900 placeholder:text-slate-400 font-semibold"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <input
                      type="text"
                      list="cities-list"
                      placeholder={t("City")}
                      className="w-full px-5 py-4 bg-[#F8F9FA] border-2 border-transparent rounded-xl focus:outline-none focus:border-[#F95A2C] focus:bg-white transition-all text-slate-900 placeholder:text-slate-400 font-semibold text-sm"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      required
                    />
                    <datalist id="cities-list">
                      {CITIES_LIST.map((c) => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                  </div>
                  <input
                    type="text"
                    placeholder={t("Landmark")}
                    className="w-full px-5 py-4 bg-[#F8F9FA] border-2 border-transparent rounded-xl focus:outline-none focus:border-[#F95A2C] focus:bg-white transition-all text-slate-900 placeholder:text-slate-400 font-semibold text-sm"
                    value={landmark}
                    onChange={(e) => setLandmark(e.target.value)}
                    required
                  />
                </div>



                <input
                  type="email"
                  placeholder={t("Email")}
                  className="w-full px-5 py-4 bg-[#F8F9FA] border-2 border-transparent rounded-xl focus:outline-none focus:border-[#F95A2C] focus:bg-white transition-all text-slate-900 placeholder:text-slate-400 font-semibold"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder={t("Password")}
                    className="w-full px-5 py-4 bg-[#F8F9FA] border-2 border-transparent rounded-xl focus:outline-none focus:border-[#F95A2C] focus:bg-white transition-all text-slate-900 placeholder:text-slate-400 font-semibold pr-12"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#F95A2C] transition-colors p-1"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>

                {error && (
                  <div className="p-4 bg-red-50 text-red-600 text-sm font-medium rounded-xl border border-red-100 flex items-start gap-2">
                    <div className="mt-0.5">⚠️</div>
                    <div className="flex-1">{error}</div>
                  </div>
                )}

                <div className="mt-6 pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#F95A2C] text-white py-4 rounded-xl font-bold text-lg shadow-[0_8px_20px_rgba(249,90,44,0.3)] active:scale-[0.98] transition-all disabled:opacity-70 disabled:active:scale-100 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      t("Sign up")
                    )}
                  </button>

                  <div className="text-center mt-8 pb-4">
                    <button
                      type="button"
                      onClick={() => setCurrentView("login")}
                      className="text-slate-600 text-sm font-bold hover:text-[#F95A2C] transition-colors"
                    >
                      {t("Already have an account")}
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showMapPicker && (
            <MapPicker
              key="login-map-picker"
              onClose={() => setShowMapPicker(false)}
              onLocationSelect={(loc) => {
                setAddress(loc.address);
                setCity(loc.city);
                setLandmark(loc.landmark);
                setLatitude(loc.lat);
                setLongitude(loc.lng);
                setShowMapPicker(false);
              }}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

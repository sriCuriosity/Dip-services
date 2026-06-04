import React, { useState, useEffect } from "react";
import { flushSync } from "react-dom";
import { useAuth } from "@/src/contexts/AuthContext";
import { useLanguage } from "@/src/contexts/LanguageContext";
import { auth, db, storage } from "@/src/lib/firebase";
import { signOut } from "firebase/auth";
import { ref, update, get, set } from "firebase/database";
import {
  LogOut,
  User,
  Phone,
  MapPin,
  Mail,
  Camera,
  ChevronRight,
  ShieldCheck,
  Briefcase,
  Settings,
  Loader2,
  Car,
  Repeat,
  ChevronDown,
  ChevronUp,
  Edit2,
  Building2,
  Clock,
  X,
  Users,
  Heart,
  Download,
  Globe,
  CreditCard,
  Monitor,
  Trash2,
  History,
  ChevronLeft,
  MessageSquare,
  Info,
  PlayCircle,
} from "lucide-react";
import { CITIES_LIST } from "../../lib/citiesData";
import { DirectMessageModal } from "../Common/DirectMessageModal";
import { SettingsModal } from "../Common/SettingsModal";
import { FullScreenImage } from "../Common/FullScreenImage";
import { cn } from "@/src/lib/utils";
import { motion } from "framer-motion";
import { compressImage, fileToBase64 } from "@/src/lib/imageUtils";
import {
  uploadBytes,
  getDownloadURL,
  ref as storageRef,
} from "firebase/storage";

import { useLayoutOutlet } from "@/src/contexts/LayoutOutletContext";

export const Profile: React.FC = () => {
  const { profile, patchProfile, refreshProfile } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const { navigateTo } = useLayoutOutlet();
  const [isEditing, setIsEditing] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [name, setName] = useState(profile?.name || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [address, setAddress] = useState(profile?.address || "");
  const [city, setCity] = useState(profile?.city || "");
  const [landmark, setLandmark] = useState(profile?.landmark || "");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadSize, setUploadSize] = useState<string | null>(null);
  const [hasWorkerProfile, setHasWorkerProfile] = useState(false);
  const [workerData, setWorkerData] = useState<any>(null);
  const [previewImage, setPreviewImage] = useState<{
    src: string;
    alt: string;
  } | null>(null);
  const [switchingRole, setSwitchingRole] = useState(false);

  const handleSetPreviewImage = (
    image: { src: string; alt: string } | null,
  ) => {
    setPreviewImage(image);
  };

  const handleOpenChat = () => {
    setIsChatOpen(true);
  };

  const handleOpenSettings = () => {
    setIsSettingsOpen(true);
  };

  const handleOpenEditing = () => {
    setIsEditing(true);
  };

  useEffect(() => {
    if (!profile) return;
    const workerRef = ref(db, `workers/${profile.uid}`);
    get(workerRef).then((snapshot) => {
      setHasWorkerProfile(snapshot.exists());
      if (snapshot.exists()) {
        setWorkerData(snapshot.val());
      }
    });
  }, [profile]);

  const handleSwitchRole = async () => {
    if (!profile || switchingRole) return;

    const nextRole = profile.role === "user" ? "worker" : "user";
    setSwitchingRole(true);

    try {
      if (nextRole === "worker") {
        const workerRef = ref(db, `workers/${profile.uid}`);
        get(workerRef).then((snapshot) => {
          if (!snapshot.exists()) {
            void set(workerRef, {
              uid: profile.uid,
              trade: "",
              experience: "",
              bio: "",
              location: profile.address || "",
              phone: profile.phone || "",
              email: profile.email || "",
              workingHours: "9 AM - 6 PM",
              rates: { fullDay: 800, halfDay: 500, quickVisit: 300 },
              rating: 5,
              totalJobs: 0,
              totalEarnings: 0,
              totalRatings: 0,
              isAvailable: true,
            });
          }
        });
      }

      await update(ref(db, `users/${profile.uid}`), { role: nextRole });
      flushSync(() => patchProfile({ role: nextRole }));
      navigateTo(nextRole === "worker" ? "/worker/jobs" : "/");
    } catch (err) {
      console.error("Role switch failed:", err);
    } finally {
      setSwitchingRole(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  const [localPhotoURL, setLocalPhotoURL] = useState(profile?.photoURL || "");

  useEffect(() => {
    setLocalPhotoURL(profile?.photoURL || "");
  }, [profile]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    setUploading(true);
    try {
      const compressed = await compressImage(file);
      const base64Url = await fileToBase64(compressed);
      const sizeInKb = Math.round((base64Url.length * 3) / 4 / 1024);
      setUploadSize(`${sizeInKb} KB`);
      await update(ref(db, `users/${profile.uid}`), { photoURL: base64Url });
      setLocalPhotoURL(base64Url);
      await refreshProfile();
      setTimeout(() => setUploadSize(null), 5000);
    } catch (error) {
      console.error("Upload error:", error);
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!profile) return;
    setUploading(true);
    try {
      await update(ref(db, `users/${profile.uid}`), { photoURL: null });
      setLocalPhotoURL("");
      await refreshProfile();
    } catch (error) {
      console.error("Remove photo error:", error);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteTrade = async (tradeName: string) => {
    if (
      !profile ||
      !window.confirm(t("Are you sure you want to delete this service?"))
    )
      return;

    try {
      const updates: any = {};
      updates[`workers/${profile.uid}/trades/${tradeName}`] = null;
      await update(ref(db), updates);

      // Update local state
      setWorkerData((prev: any) => {
        const newTrades = { ...prev.trades };
        delete newTrades[tradeName];
        return { ...prev, trades: newTrades };
      });

      alert(t("Service deleted successfully"));
    } catch (error) {
      console.error("Delete trade error:", error);
      alert(t("Error deleting service"));
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setLoading(true);
    try {
      const updates: any = {
        [`users/${profile.uid}/name`]: name,
        [`users/${profile.uid}/phone`]: phone,
        [`users/${profile.uid}/address`]: address,
        [`users/${profile.uid}/city`]: city,
        [`users/${profile.uid}/landmark`]: landmark,
      };

      const workerSnap = await get(ref(db, `workers/${profile.uid}`));
      if (workerSnap.exists()) {
        updates[`workers/${profile.uid}/phone`] = phone;
        updates[`workers/${profile.uid}/email`] = profile.email || "";
        updates[`workers/${profile.uid}/address`] = address;
        updates[`workers/${profile.uid}/city`] = city;
        updates[`workers/${profile.uid}/landmark`] = landmark;
      }

      const shopSnap = await get(ref(db, `shops/${profile.uid}`));
      if (shopSnap.exists()) {
        updates[`shops/${profile.uid}/phone`] = phone;
        updates[`shops/${profile.uid}/email`] = profile.email || "";
        updates[`shops/${profile.uid}/address`] = address;
        updates[`shops/${profile.uid}/city`] = city;
        updates[`shops/${profile.uid}/landmark`] = landmark;
      }

      await update(ref(db), updates);
      await refreshProfile();
      setIsEditing(false);
    } catch (error) {
      console.error("Update error:", error);
    } finally {
      setLoading(false);
    }
  };

  const ProfileOption = ({
    icon: Icon,
    label,
    onClick,
    color = "text-slate-700",
    subLabel,
  }: {
    icon: any;
    label: string;
    onClick?: () => void;
    color?: string;
    subLabel?: string;
  }) => (
    <button
      type="button"
      onPointerUp={(e) => {
        e.preventDefault();
        onClick?.();
      }}
      onClick={(e) => {
        e.preventDefault();
        onClick?.();
      }}
      className="w-full flex items-center justify-between py-3.5 px-4 group active:bg-slate-50 transition-all duration-200 rounded-xl hover:bg-slate-50/50"
    >
      <div className="flex items-center gap-3.5 flex-1 min-w-0">
        <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-slate-100/50 text-slate-500 group-hover:bg-white group-hover:text-blue-600 group-hover:shadow-sm transition-all duration-300 shrink-0">
          <Icon size={18} />
        </div>
        <div className="text-left flex-1 min-w-0 py-1">
          <span
            className={cn(
              "font-semibold text-[14px] block break-words leading-tight",
              color,
            )}
          >
            {label}
          </span>
          {subLabel && (
            <span className="text-[11px] text-slate-400 block mt-0.5 break-words leading-tight">
              {subLabel}
            </span>
          )}
        </div>
      </div>
      <ChevronRight
        size={16}
        className="text-slate-300 group-hover:text-slate-400 group-hover:translate-x-0.5 transition-all shrink-0 ml-2"
      />
    </button>
  );

  const SectionHeader = ({ title }: { title: string }) => (
    <h3 className="px-2 text-[11px] font-bold text-slate-400 uppercase tracking-[0.1em] mb-3 mt-6 first:mt-0">
      {title}
    </h3>
  );

  if (isEditing) {
    return (
      <div className="flex flex-col min-h-full bg-slate-50/50">
        <div className="px-6 pt-12 pb-6 flex items-center justify-between bg-white border-b border-slate-100 sticky top-0 z-20">
          <button
            type="button"
            onClick={() => navigateTo("/profile")}
            className="p-2 -ml-2 text-slate-900 hover:bg-slate-50 rounded-full transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-lg font-bold text-slate-900">
            {t("Edit Profile")}
          </h1>
          <div className="w-10" />
        </div>

        <form onSubmit={handleUpdate} className="p-6 space-y-6">
          <div className="flex flex-col items-center gap-4 mb-8">
            <div className="relative group">
              <div
                className="w-28 h-28 bg-slate-100 rounded-full flex items-center justify-center border-4 border-white shadow-2xl shadow-slate-200 overflow-hidden cursor-zoom-in transition-transform group-hover:scale-[1.02]"
                onClick={() => {
                  if (localPhotoURL) {
                    handleSetPreviewImage({
                      src: localPhotoURL,
                      alt: profile?.name || "Profile",
                    });
                  }
                }}
              >
                {uploading ? (
                  <Loader2 className="text-blue-600 animate-spin" size={32} />
                ) : localPhotoURL ? (
                  <img
                    src={localPhotoURL}
                    alt={profile?.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <User size={44} className="text-slate-300" />
                )}
              </div>
              <label className="absolute bottom-1 right-1 w-9 h-9 bg-blue-600 text-white rounded-full flex items-center justify-center border-2 border-white shadow-lg cursor-pointer hover:bg-blue-700 active:scale-90 transition-all">
                <Camera size={16} />
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  disabled={uploading}
                />
              </label>
              {localPhotoURL && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="absolute -bottom-1 -left-1 w-9 h-9 bg-red-500 text-white rounded-full flex items-center justify-center border-2 border-white shadow-lg cursor-pointer hover:bg-red-600 active:scale-90 transition-all"
                  title={t("Remove Photo")}
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
            {uploadSize && (
              <p className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                {uploadSize}
              </p>
            )}
          </div>

          <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-5">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">
                {t("Full Name")}
              </label>
              <div className="relative">
                <User
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"
                  size={18}
                />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 px-11 py-3.5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all text-slate-900 font-semibold text-sm"
                  placeholder={t("Enter your name")}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">
                {t("Phone Number")}
              </label>
              <div className="relative">
                <Phone
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"
                  size={18}
                />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 px-11 py-3.5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all text-slate-900 font-semibold text-sm"
                  placeholder={t("Enter phone number")}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">
                {t("City")}
              </label>
              <div className="relative">
                <MapPin
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"
                  size={18}
                />
                <input
                  type="text"
                  list="profile-cities-list"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 px-11 py-3.5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all text-slate-900 font-semibold text-sm"
                  placeholder={t("Enter City")}
                  required
                />
                <datalist id="profile-cities-list">
                  {CITIES_LIST.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </datalist>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">
                  {t("Address")}
                </label>
              </div>
              <div className="relative">
                <MapPin
                  className="absolute left-4 top-4 text-slate-300"
                  size={18}
                />
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 px-11 py-3.5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all text-slate-900 font-semibold text-sm min-h-[100px] resize-none"
                  placeholder={t("Enter full address")}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">
                {t("Landmark")}
              </label>
              <div className="relative">
                <MapPin
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"
                  size={18}
                />
                <input
                  type="text"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 px-11 py-3.5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all text-slate-900 font-semibold text-sm"
                  placeholder={t("Enter landmark")}
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-xl shadow-blue-100 hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <ShieldCheck size={20} />
            )}
            {t("Save Changes")}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full bg-slate-50/30">
      {/* Header Section with Gradient and Bubbles */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-900 pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-4 px-3.5 rounded-b-[2.5rem] shadow-2xl shadow-blue-200/40">
        {/* Animated-like Bubble Patterns */}
        <div className="absolute top-[-15%] left-[-10%] w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-[-25%] right-[-15%] w-96 h-96 bg-blue-400/20 rounded-full blur-3xl" />
        <div className="absolute top-[15%] right-[5%] w-40 h-40 bg-white/5 rounded-full blur-2xl" />

        {/* Navigation */}
        <div className="relative z-10 flex items-center justify-between mb-1">
          <button
            type="button"
            onClick={() => navigateTo("/profile")}
            className="p-2.5 -ml-2 text-white/90 hover:text-white hover:bg-white/10 rounded-full transition-all active:scale-90"
          >
            <ChevronLeft size={22} />
          </button>
          <h1 className="text-sm font-black text-white/90 tracking-[0.25em] uppercase">
            {t("My Profile")}
          </h1>
          <button
            onClick={() => handleOpenSettings()}
            className="p-2.5 -mr-2 text-white/90 hover:text-white hover:bg-white/10 rounded-full transition-all active:scale-90"
          >
            <Settings size={22} />
          </button>
        </div>

        {/* Profile Info */}
        <div className="relative z-10 flex flex-col items-center text-center sm:flex-row sm:text-left sm:items-center gap-1.5">
          {/* Profile Picture */}
          <div
            className="w-20 h-20 sm:w-24 sm:h-24 bg-white/10 backdrop-blur-xl rounded-full flex items-center justify-center border-4 border-white/20 shadow-2xl overflow-hidden cursor-zoom-in relative group transition-transform hover:scale-105"
            onClick={() => {
              if (localPhotoURL) {
                handleSetPreviewImage({
                  src: localPhotoURL,
                  alt: profile?.name || "Profile",
                });
              }
            }}
          >
            {localPhotoURL ? (
              <img
                src={localPhotoURL}
                alt={profile?.name}
                className="w-full h-full object-cover transition-transform group-hover:scale-110"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-blue-500/30 text-white/50">
                <User size={48} />
              </div>
            )}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
              <Camera
                size={20}
                className="text-white opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all"
              />
            </div>
          </div>

          <div className="flex-1 min-w-0 flex flex-col gap-1.5 py-0.5">
            <h2 className="text-lg font-black text-white break-words tracking-[-0.05em] mb-0 drop-shadow-sm leading-tight">
              {profile?.name}
            </h2>
            <p className="text-blue-100/70 text-[10px] break-words mb-0 font-semibold tracking-normal leading-normal">
              {profile?.email}
            </p>
            <div className="flex items-center justify-start gap-1.5 mt-0.5">
              <button
                onClick={() => handleOpenEditing()}
                className="bg-white text-blue-700 px-2 py-1.5 rounded-lg text-[9px] font-black shadow-lg shadow-blue-900/30 hover:bg-blue-50 active:scale-95 transition-all uppercase tracking-wide flex items-center gap-1 whitespace-nowrap"
              >
                <Edit2 size={10} />
                {t("Edit Profile")}
              </button>
              {profile && (
                <button
                  type="button"
                  disabled={switchingRole}
                  onPointerUp={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    void handleSwitchRole();
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    void handleSwitchRole();
                  }}
                  className="bg-white/10 backdrop-blur-md text-white px-2 py-1.5 rounded-lg text-[9px] font-black active:scale-95 transition-all flex items-center gap-1 border border-white/20 hover:bg-white/20 shadow-lg uppercase tracking-wide whitespace-nowrap disabled:opacity-60"
                >
                  {switchingRole ? (
                    <Loader2 size={10} className="animate-spin" />
                  ) : (
                    <Repeat size={10} />
                  )}
                  {profile?.role === "worker"
                    ? t("Switch to User")
                    : t("Switch to Worker")}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Options List */}
      <div className="px-6 py-6 pb-32 space-y-6">
        {profile?.role === "worker" && (
          <div className="space-y-4">
            <SectionHeader title={t("Business Management")} />
            <div className="space-y-3">
              <button
                onClick={() => navigateTo("/worker/profile")}
                className="w-full bg-white p-5 rounded-[28px] border border-slate-100 flex items-center justify-between active:scale-[0.98] transition-all shadow-sm hover:shadow-md hover:border-blue-100"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-100">
                    <Briefcase size={24} />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-slate-900 text-[15px]">
                      {t("Service Profile")}
                    </p>
                    <p className="text-slate-400 text-[11px] font-medium">
                      {t("Manage your trade and rates")}
                    </p>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center">
                  <ChevronRight size={18} className="text-slate-300" />
                </div>
              </button>

              {workerData?.trades && (
                <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                      {t("My Services")}
                    </h2>
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                      {Object.keys(workerData.trades).length} {t("Active")}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {Object.entries(workerData.trades).map(
                      ([tradeName, tradeData]: [string, any]) => (
                        <div
                          key={tradeName}
                          className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-50/50 p-4 rounded-2xl border border-slate-100/50 hover:bg-white hover:border-blue-100 transition-all group gap-3"
                        >
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-slate-800 text-sm break-words">
                              {t(tradeName)}
                            </h3>
                            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-tight">
                              {tradeData.experience} {t("Experience")}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                            <div
                              className={cn(
                                "px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 shrink-0",
                                tradeData.verificationStatus === "approved"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : tradeData.verificationStatus === "rejected"
                                    ? "bg-red-100 text-red-700"
                                    : "bg-amber-100 text-amber-700",
                              )}
                            >
                              {tradeData.verificationStatus === "approved" ? (
                                <ShieldCheck size={10} />
                              ) : tradeData.verificationStatus ===
                                "rejected" ? (
                                <X size={10} />
                              ) : (
                                <Clock size={10} />
                              )}
                              {t(
                                tradeData.verificationStatus === "approved"
                                  ? "Verified"
                                  : tradeData.verificationStatus === "rejected"
                                    ? "Rejected"
                                    : "Pending",
                              )}
                            </div>
                            <button
                              onClick={() =>
                                navigateTo(`/worker/profile/${tradeName}`)
                              }
                              className="text-blue-600 text-[10px] font-bold px-4 py-2 bg-white rounded-xl border border-slate-100 shadow-sm group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-all shrink-0"
                            >
                              {t("Edit")}
                            </button>
                            <button
                              onClick={() => handleDeleteTrade(tradeName)}
                              className="text-red-500 text-[10px] font-bold px-4 py-2 bg-white rounded-xl border border-slate-100 shadow-sm hover:bg-red-500 hover:text-white hover:border-red-500 transition-all shrink-0"
                            >
                              {t("Delete")}
                            </button>
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              )}

              <button
                onClick={() => navigateTo("/profile/shop-setup")}
                className="w-full bg-white p-5 rounded-[28px] border border-slate-100 flex items-center justify-between active:scale-[0.98] transition-all shadow-sm hover:shadow-md hover:border-orange-100"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-orange-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-orange-100">
                    <Building2 size={24} />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-slate-900 text-[15px]">
                      {t("Shop Profile")}
                    </p>
                    <p className="text-slate-400 text-[11px] font-medium">
                      {t("Manage your shop")}
                    </p>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center">
                  <ChevronRight size={18} className="text-slate-300" />
                </div>
              </button>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <SectionHeader title={t("Activity")} />
          <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden p-2">
            {profile?.role === "worker" ? (
              <>
                <ProfileOption
                  icon={History}
                  label={t("Job History")}
                  onClick={() => navigateTo("/worker/history")}
                  subLabel={t("View your performance")}
                />
                <div className="h-[1px] bg-slate-50 mx-4" />
                <ProfileOption
                  icon={CreditCard}
                  label={t("My Earnings")}
                  onClick={() => navigateTo("/worker/earnings")}
                  subLabel={t("View your income")}
                />
              </>
            ) : (
              <>
                <ProfileOption
                  icon={History}
                  label={t("Booking History")}
                  onClick={() => navigateTo("/user/history")}
                  subLabel={t("View past requests")}
                />
                <div className="h-[1px] bg-slate-50 mx-4" />
                <ProfileOption
                  icon={CreditCard}
                  label={t("Cancellation Fees")}
                  onClick={() => navigateTo("/user/fees")}
                  subLabel={t("View pending fines")}
                />
              </>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <SectionHeader title={t("Preferences")} />
          <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden p-2">
            {profile?.role !== "worker" && (
              <>
                <ProfileOption
                  icon={Building2}
                  label={t("Shops")}
                  onClick={() => navigateTo("/shops")}
                  subLabel={t("Browse local businesses")}
                />
                <div className="h-[1px] bg-slate-50 mx-4" />
              </>
            )}
            <ProfileOption
              icon={Users}
              label={t("Members")}
              onClick={() => navigateTo("/members")}
              subLabel={t("Community members")}
            />
            <div className="h-[1px] bg-slate-50 mx-4" />
            <ProfileOption
              icon={MessageSquare}
              label={t("Chat with Admin")}
              onClick={() => handleOpenChat()}
              subLabel={t("Contact support team")}
            />
          </div>
        </div>

        <div className="space-y-4">
          <SectionHeader title={t("Account")} />
          <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden p-2">
            <ProfileOption
              icon={PlayCircle}
              label={t("Helping Video")}
              subLabel={t("Watch how to use the app")}
            />
            <div className="h-[1px] bg-slate-50 mx-4" />
            <ProfileOption
              icon={LogOut}
              label={t("Logout")}
              onClick={handleLogout}
              color="text-red-500"
              subLabel={t("Sign out of your account")}
            />
          </div>
        </div>
      </div>

      <FullScreenImage
        src={previewImage?.src || ""}
        alt={previewImage?.alt}
        isOpen={!!previewImage}
        onClose={() => setPreviewImage(null)}
      />

      {isChatOpen && profile && (
        <DirectMessageModal
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          isAdmin={profile.role === "admin"}
          targetId={profile.uid}
          targetName={profile.name}
        />
      )}

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
};

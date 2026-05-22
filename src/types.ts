export interface ShopProfile {
  uid: string;
  name: string;
  bio: string;
  address: string;
  city: string;
  landmark: string;
  phone: string;
  email: string;
  photoURL?: string;
  rating: number;
  totalRatings?: number;
  createdAt: number;
  deleted?: boolean;
}

export interface Review {
  id: string;
  workerId: string;
  userId: string;
  rating: number;
  comment: string;
  timestamp: number;
}

export type UserRole = 'user' | 'worker' | 'admin';

export type OutdoorTrade = 'Auto' | 'Tempo' | 'Van' | 'JCB' | 'Car' | 'Marriage hall' | 'Catering' | 'House Rent' | 'Shop Rent';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  landmark: string;
  role: UserRole;
  photoURL?: string;
  createdAt: number;
  deleted?: boolean;
  fcmToken?: string;
  latitude?: number;
  longitude?: number;
}

export interface TradeProfile {
  trade: string;
  experience: string;
  bio: string;
  rates: {
    fullDay: number;
    halfDay: number;
    quickVisit: number;
    ratePerKm?: number;
    ratePerHour?: number;
    ratePerTree?: number;
    advance?: number;
    monthlyRent?: number;
    oneDayRate?: number;
    twoDayRate?: number;
    oneTimeRate?: number;
    twoTimeRate?: number;
  };
  verificationStatus?: 'pending' | 'approved' | 'rejected';
  isAvailable: boolean;
  totalJobs: number;
  totalEarnings: number;
  rating: number;
  totalRatings?: number;
  workingHours?: string;
}

export interface WorkerProfile extends UserProfile {
  trades: { [trade: string]: TradeProfile };
  trade?: string;
  location: string;
  workingHours: string;
  rating: number;
  totalJobs: number;
  totalEarnings: number;
  totalRatings?: number;
}

export interface OutdoorProfile {
  uid: string;
  trade: OutdoorTrade;
  experience: string;
  bio: string;
  address: string;
  city: string;
  landmark: string;
  phone: string;
  email: string;
  verificationStatus?: 'pending' | 'approved' | 'rejected';
  rates: {
    base: number;
    perKm?: number;
    perDay?: number;
    perHour?: number;
    advance?: number;
    oneMonthRent?: number;
    fullDayRate?: number;
    halfDayRate?: number;
    cateringTime?: string;
  };
  rating: number;
  totalRatings?: number;
  totalJobs: number;
  isAvailable: boolean;
  createdAt: number;
}

export type OrderStatus = 'pending' | 'accepted' | 'completed' | 'rejected';

export interface Order {
  id: string;
  userId: string;
  workerId: string;
  userName: string;
  userPhone: string;
  userAddress: string;
  city: string;
  landmark: string;
  workerName: string;
  workerPhone: string;
  workerEmail: string;
  trade: string;
  description: string;
  preferredTime: string;
  bookingDate: string;
  duration: 'fullDay' | 'halfDay' | 'quickVisit';
  offeredAmount: number;
  status: OrderStatus;
  paymentStatus?: 'paid' | 'pending';
  createdAt: number;
  acceptedAt?: number;
  completedAt?: number;
  rejectedAt?: number;
  commissionPaid: boolean;
  commissionAmount: number;
  feeDueDate?: number;
  receivedAmount?: number;
  platformFee?: number;
  isRated?: boolean;
  userCancellationFee?: number;
  userCancellationPaid?: boolean;
  userCancellationPaymentRequested?: boolean;
  rejectionReason?: string;
  rejectedBy?: 'user' | 'worker';
  broadcastedTo?: string[];
}

export interface AppStats {
  totalOrders: number;
  totalWorkers: number;
  totalUsers: number;
  totalEarnings: number;
  totalCommission: number;
}

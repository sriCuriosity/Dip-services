# Implemented Features - DIP Services

This document details the features implemented in the DIP Services platform.

## 1. Authentication & Role Management
- **Role Selection**: Users can register as a Customer or a Worker.
- **Admin Access**: Hidden toggle for Admin role activation.
- **Auth Guarding**: Private routes protected based on authentication state and user role.
- **Profile Persistence**: Session management via Firebase Auth.

## 2. Customer Features
- **Worker Discovery**: Browse workers by category (Painter, Plumber, etc.).
- **Search & Filtering**: Search by name, address, or city. Filter by category.
- **Map View**: Interactive Leaflet map showing nearby workers.
- **Worker Profiles**: View detailed profiles, experience, and service rates.
- **Booking System**: Select service type (Quick Visit, Half Day, Full Day) and submit job requests.
- **Order History**: Track status of current and past bookings.
- **Reviews & Ratings**: Rate workers after job completion.

## 3. Worker Features
- **Professional Onboarding**: Set up trades, experience, and service rates.
- **Availability Toggle**: Switch between "Available" and "Busy" status.
- **Job Inbox**: Receive and review incoming job requests.
- **Accept/Decline**: Workers can choose to accept or decline job requests.
- **Earnings Dashboard**: Track total earnings and platform commission due.
- **Payment Verification**: Submit commission payment details for Admin approval.

## 4. Admin Features
- **Dashboard Overview**: Key metrics (total users, workers, orders, earnings).
- **Worker Verification**: Review and approve/reject worker profiles.
- **Payment Management**: Verify commission payments submitted by workers.
- **Broadcast Notifications**: Send push notifications to all users or specific groups.

## 5. Core Systems
- **Geo-Location (25km)**: Haversine-based distance calculation for booking validation.
- **Bilingual Interface**: Support for English and Tamil via `LanguageContext`.
- **Image Handling**: Client-side image compression for profile and service photos.
- **Push Notifications**: FCM integration for real-time status updates and job alerts.
- **Auto/Transport System**: Special broadcast system for transport requests within a 10km radius.

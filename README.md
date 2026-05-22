# DIP Doorstep Services

A hyperlocal, mobile-first service worker booking platform built for **Tamil Nadu, India**.

![Project Status](https://img.shields.io/badge/Status-Development-orange)
![Tech Stack](https://img.shields.io/badge/Stack-React_19_%2B_Firebase_%2B_Express-blue)

## 📖 Project Overview

DIP Services connects customers with verified local service providers (Plumbers, Electricians, Painters, etc.) within a **25km radius**. The platform ensures trust through a verification system and provides real-time job matching and notifications.

### Key Features
- **Hyperlocal Matching**: Customers only see and book workers within 25km.
- **Role-Based Dashboards**: Distinct interfaces for Customers, Workers, and Admins.
- **Multi-Service Support**: From skilled trades to transport (Auto/Tempo) and rentals.
- **Real-time Notifications**: Background push notifications via FCM for job requests.
- **Bilingual Support**: Full interface support for English and Tamil.
- **Map Integration**: Visual discovery of workers using Leaflet maps.

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Framer Motion.
- **Backend**: Node.js, Express, `tsx`.
- **Database/Auth**: Firebase Realtime Database, Firebase Authentication.
- **Mobile**: Capacitor (Cross-platform).
- **Maps**: React Leaflet, ArcGIS/Photon Geocoding.

## 🚀 Quick Start

### 1. Prerequisites
- Node.js (v18+)
- Firebase Account

### 2. Installation
```bash
npm install
```

### 3. Environment Setup
Create a `.env` file based on `.env.example` and fill in your Firebase credentials.

### 4. Running Development
```bash
npm run dev
```
The app will be available at `http://localhost:3000`.

## 📂 Documentation

Detailed documentation is available in the [`/docs`](./docs/DOCUMENTATION_INDEX.md) folder:
- [System Architecture](./docs/SYSTEM_ARCHITECTURE.md)
- [User Flows](./docs/USER_FLOW.md)
- [API Documentation](./docs/API_DOCUMENTATION.md)
- [Database Schema](./docs/DATABASE_SCHEMA.md)
- [Location Matching System](./docs/LOCATION_MATCHING_SYSTEM.md)

## 🗺️ Roadmap
- [ ] OTP Phone Verification
- [ ] In-app Chat System
- [ ] Razorpay Payment Integration
- [ ] Gemini AI Worker Recommendations

## 📄 License
Private Repository. All rights reserved.

# Deployment Guide - DIP Services

This document explains how to deploy the DIP Services platform for local development and production.

## 🏠 Local Development

### 1. Setup Environment
Ensure you have `.env` populated with valid Firebase credentials (see [FIREBASE_SETUP.md](./setup/FIREBASE_SETUP.md)).

### 2. Install & Run
```bash
npm install
npm run dev
```
The server will start on `http://localhost:3000`.

## 🚢 Production Deployment

### 1. Build the Frontend
Generate the optimized React build:
```bash
npm run build
```
This creates a `dist` folder.

### 2. Prepare the Server
The `server.ts` is configured to serve the `dist` folder automatically when `NODE_ENV=production` or when Vite middleware is not explicitly in "dev" mode.

### 3. Environment Variables
Ensure all variables from `.env.example` are configured on your hosting provider (Vercel, Railway, Heroku, etc.).

### 4. Hosting Suggestions
- **Frontend + Backend**: Render, Railway, or Heroku (Node.js environment).
- **Database/Auth**: Managed by Firebase.
- **Mobile**: Use Capacitor to build APK/IPA:
```bash
npx cap add android
npx cap copy
npx cap open android
```

## 🐳 Docker Setup (Optional)
If you prefer containerization, create a `Dockerfile`:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## ⚠️ Post-Deployment Checklist
1. Switch Firebase Realtime Database to **Locked Mode**.
2. Set up **FCM VAPID Keys** for web notifications.
3. Configure **CORS** if the backend and frontend are on different domains.
4. Ensure `APP_URL` environment variable is set to your production URL.

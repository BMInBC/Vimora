// Vimora Firebase Configuration
// Public SDK config (safe to include in frontend)

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

export const firebaseConfig: FirebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyCTEn7C3V2UXu-I2EsbsHdXckMJlKuX7W8",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "vimora-video-converter.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "vimora-video-converter",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "vimora-video-converter.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "542337835311",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:542337835311:web:05240a52698ce62d3c01da",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-D1TNYD73PF",
};

// Admin email - only this account can access /admin
export const ADMIN_EMAIL = "fawazadekanmbi19@gmail.com";

export const isFirebaseConfigured = (): boolean => true;
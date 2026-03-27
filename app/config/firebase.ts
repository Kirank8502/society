// Place this file at app/config/firebase.ts
// Update these values with your Firebase project credentials from Firebase Console

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
    apiKey: "AIzaSyD3cPKT7nmAquLuZqTpOE8GmeJ-Y7nTSwU",
    authDomain: "graphina-firebase-3b123.firebaseapp.com",
    projectId: "graphina-firebase-3b123",
    storageBucket: "graphina-firebase-3b123.firebasestorage.app",
    messagingSenderId: "115071670015",
    appId: "1:115071670015:web:e039d3ea75c1146b4adeca"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth
export const auth = getAuth(app);

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Storage
export const storage = getStorage(app);

export default app;

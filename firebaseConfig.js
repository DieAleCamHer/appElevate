// firebaseConfig.js
import { initializeApp } from 'firebase/app';
import {
  initializeAuth,
  getReactNativePersistence
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage'; // 🔹 nueva importación

const firebaseConfig = {
  apiKey: "AIzaSyAekfXKEkHZUl2y1Y1S3hHPCDrIQmZAN78",
  authDomain: "elevate-2b09f.firebaseapp.com",
  projectId: "elevate-2b09f",
  storageBucket: "elevate-2b09f.appspot.com",
  messagingSenderId: "219025653445",
  appId: "1:219025653445:web:6d046a3f13dc34c96e7aac"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// 🔐 Inicializar Auth con persistencia en AsyncStorage
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

// Firestore
const db = getFirestore(app);

export { auth, db };

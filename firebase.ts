// Standard Firebase v9+ modular SDK initialization
import { initializeApp } from 'firebase/app';
import { getDatabase, ref } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyAR_kPmsLV2-EY6N4-JvqpzNLELy_tuQ80",
  authDomain: "test-e0321.firebaseapp.com",
  databaseURL: "https://test-e0321-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "test-e0321",
  storageBucket: "test-e0321.firebasestorage.app",
  messagingSenderId: "352522120968",
  appId: "1:352522120968:web:movie-site"
};

// Initialize Firebase using the modular SDK approach (v9+)
const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const baseRef = ref(db, 'chatsForPrivate');
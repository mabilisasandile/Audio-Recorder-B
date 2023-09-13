
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import {getAuth} from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { ref } from "firebase/storage";


const firebaseConfig = {
  apiKey: "AIzaSyBVxolW1kr1EUIk-j02yRX_wN4844N2JtY",
  authDomain: "audio-recorder-67133.firebaseapp.com",
  projectId: "audio-recorder-67133",
  storageBucket: "audio-recorder-67133.appspot.com",
  messagingSenderId: "376020284137",
  appId: "1:376020284137:web:7f304629ad92925914b678",
  measurementId: "G-ZYY846WZ34"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const storageRef = ref(storage);

export default app;
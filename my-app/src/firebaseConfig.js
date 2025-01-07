// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCXBRAtEgUMwhkO4IFVAxqtAFJc71ZuFbE",
  authDomain: "chatgenius-73a1f.firebaseapp.com",
  projectId: "chatgenius-73a1f",
  storageBucket: "chatgenius-73a1f.firebasestorage.app",
  messagingSenderId: "202514282318",
  appId: "1:202514282318:web:28d6cd8608504db320901f",
  measurementId: "G-ZJ4P79T3BF"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app); 
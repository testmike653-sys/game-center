// src/services/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDyi2l-2M5RhbAiRG6Nf2zMmiWDOQTH63E",
  authDomain: "dev-panel-22570.firebaseapp.com",
  projectId: "dev-panel-22570",
  storageBucket: "dev-panel-22570.firebasestorage.app",
  messagingSenderId: "23870097316",
  appId: "1:23870097316:web:975211e03d85b4c8106331"
};

// Инициализируем Firebase
const app = initializeApp(firebaseConfig);

// Инициализируем Firestore и экспортируем
export const db = getFirestore(app);
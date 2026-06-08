import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// 這是你剛剛從 Firebase 控制台取得的專屬金鑰
const firebaseConfig = {
  apiKey: "AIzaSyDJ8yQx0ZcIHU53pjCZyP15u1CSgUWZ10Q",
  authDomain: "ishigaki-trip-39237.firebaseapp.com",
  projectId: "ishigaki-trip-39237",
  storageBucket: "ishigaki-trip-39237.firebasestorage.app",
  messagingSenderId: "580429758338",
  appId: "1:580429758338:web:f7a3bf6e9c7b7c6a24d99b"
};

// 初始化 Firebase 應用程式
const app = initializeApp(firebaseConfig);

// 初始化並匯出 Firestore 資料庫，讓其他檔案可以使用
export const db = getFirestore(app);
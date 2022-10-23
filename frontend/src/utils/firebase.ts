import { initializeApp } from "firebase/app"

const firebaseConfig = {
  apiKey: "AIzaSyBJFITLUMkRyVvG8CH3m9waEEyweGhTS84",
  authDomain: "feuer-io.firebaseapp.com",
  databaseURL: "https://feuer-io.firebaseio.com",
  projectId: "feuer-io",
  storageBucket: "feuer-io.appspot.com",
  messagingSenderId: "45127508791",
  appId: "1:45127508791:web:93f89eb58e282999b8f0b2"
};

export const initFirebase = () => {
  return initializeApp(firebaseConfig)
}
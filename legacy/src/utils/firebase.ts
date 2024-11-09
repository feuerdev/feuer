import { FirebaseApp, initializeApp } from "firebase/app"
import { User, getAuth } from "firebase/auth"

const firebaseConfig = {
  apiKey: "AIzaSyBJFITLUMkRyVvG8CH3m9waEEyweGhTS84",
  authDomain: "feuer-io.firebaseapp.com",
  databaseURL: "https://feuer-io.firebaseio.com",
  projectId: "feuer-io",
  storageBucket: "feuer-io.appspot.com",
  messagingSenderId: "45127508791",
  appId: "1:45127508791:web:93f89eb58e282999b8f0b2",
}

let firebaseApp: FirebaseApp | undefined = undefined
const initFirebase = () => {
  if (firebaseApp) {
    return firebaseApp
  } else {
    return initializeApp(firebaseConfig)
  }
}

export const getFirebaseAuth = () => {
  return getAuth(initFirebase())
}

export const isLoggedIn = async () => {
  return await new Promise<User>((resolve, reject) =>
    getAuth(initFirebase()).onAuthStateChanged((user) => {
      if (user) {
        resolve(user)
      } else {
        // No user is signed in.
        reject()
      }
    })
  )
}

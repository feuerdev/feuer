import { initializeApp } from "firebase/app"
import {
  getAuth,
  signInAnonymously,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth"

const COOKIE_NAME = "__session"
const COOKIE_MAXAGE = 60 * 60 * 24 * 7 * 4 //Vier Wochen

/**
 * Loads up firebase instance
 */
const app = initializeApp({
  apiKey: "AIzaSyBJFITLUMkRyVvG8CH3m9waEEyweGhTS84",
  authDomain: "feuer-io.firebaseapp.com",
  // databaseURL: "https://feuer-io.firebaseio.com",
  projectId: "feuer-io",
  storageBucket: "feuer-io.appspot.com",
  messagingSenderId: "45127508791",
})

/**
 * Sleep function to use with await
 * @param ms time to wait in ms
 * @returns
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function setUid(uid: string) {
  localStorage.setItem("uid", uid)
}

/**
 * Sets token and waits until it is actually set
 * @param idToken auth token
 */
async function setCookie(idToken: string): Promise<void> {
  document.cookie = `${COOKIE_NAME}=${idToken};max-age=${COOKIE_MAXAGE}`

  while (!document.cookie.includes(idToken)) {
    console.debug("Waiting for cookie to be set")
    await sleep(200)
  }
}

/**
 * Removes a cookie by setting its expiration to 0
 */
function invalidateCookie() {
  document.cookie = `${COOKIE_NAME}=;max-age=0`
}

/**
 * Removes a cookie by setting its expiration to 0
 */
function invalidateUid() {
  localStorage.removeItem("uid")
}

export function getUid(): string {
  return getAuth(app).currentUser.uid
}

export async function refreshToken(): Promise<void> {
  const user = getAuth(app).currentUser
  if (!user) {
    invalidateCookie()
    window.location.replace("/login")
    return
  }
  const token = await user.getIdToken()
  await setCookie(token)
  window.location.replace("/")
}

/**
 * Signs out and invalidates the cookie
 */
export async function signOut(): Promise<void> {
  await getAuth(app).signOut()
  invalidateCookie()
  invalidateUid()
}

/**
 * Login to Firebase and redirect to home route if successful
 * @param email
 * @param password
 */
export async function login(email: string, password: string): Promise<void> {
  try {
    const credential = await signInWithEmailAndPassword(
      getAuth(app),
      email,
      password
    )
    const idToken = await credential.user.getIdToken()
    setUid(credential.user.uid)
    await setCookie(idToken)

    console.log("Login successful")

    window.location.replace("/")
  } catch (error) {
    console.error(error)
  }
}

/**
 * Register with firebase, register with database server and redirect to home if successful
 * @param email
 * @param password
 * @param username
 */
export async function register(
  email: string,
  password: string,
  username: string
): Promise<void> {
  try {
    const credentials = await createUserWithEmailAndPassword(
      getAuth(app),
      email,
      password
    )
    const idToken = await credentials.user.getIdToken()
    setUid(credentials.user.uid)
    await setCookie(idToken)

    const result = await fetch("/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: username,
      }),
    })

    if (!result.ok) {
      console.log(`Error registering '${username}'`)
    }

    console.log(`User '${username}' successfully registered, redirecting`)
    window.location.replace("/")
  } catch (error) {
    console.error(error)
  }
}

export async function registerAnonymously(): Promise<void> {
  try {
    const credentials = await signInAnonymously(getAuth(app))
    const idToken = await credentials.user.getIdToken()

    setUid(credentials.user.uid)
    await setCookie(idToken)

    const result = await fetch("/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: "Guest",
      }),
    })

    if (!result.ok) {
      console.log("Error registering guest")
      window.location.replace("/logout")
    }

    console.log("Guest successfully registered, redirecting")
    window.location.replace("/")
  } catch (error) {
    console.error(error)
  }
}

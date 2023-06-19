import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously,
  signOut,
  User,
} from "firebase/auth"
import { useAuthState } from "react-firebase-hooks/auth"
import Loading from "./Loading"
import { initFirebase } from "../utils/firebase"

const AuthContext = createContext<
  | {
      user: User | null | undefined
      idToken: string | undefined
      loading: boolean
      signInAsGuest: () => void
      signInWithGoogle: () => void
      logout: () => void
    }
  | undefined
>(undefined)

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const auth = getAuth(initFirebase())
  const [user, loading] = useAuthState(auth)
  const [authing, setAuthing] = useState(false)
  const [idToken, setIdToken] = useState<string | undefined>(undefined)

  // Get idToken when user is loggedIn
  useEffect(() => {
    if (!user) {
      return
    }

    ;(async () => {
      const token = await user.getIdToken()
      setIdToken(token)
    })()
  }, [user])

  const signInAsGuest = async () => {
    setAuthing(true)
    await signInAnonymously(auth)
    setAuthing(false)
  }

  const signInWithGoogle = async () => {
    setAuthing(true)
    const provider = new GoogleAuthProvider()
    await signInWithPopup(auth, provider)
    setAuthing(false)
  }

  const logout = async () => {
    setAuthing(true)
    await signOut(auth)
    setAuthing(false)
  }

  if (loading) {
    return <Loading />
  }

  return <AuthContext.Provider value={{
    user,
    idToken,
    loading: loading || authing,
    signInAsGuest,
    signInWithGoogle,
    logout,
  }}>{children}</AuthContext.Provider>
}

export const useAuthContext = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuthContext must be used within a AuthProvider")
  }
  return context
}

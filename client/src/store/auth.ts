import { PayloadAction, createSlice } from "@reduxjs/toolkit"
import {
  GoogleAuthProvider,
  User,
  UserCredential,
  signInAnonymously,
  signInWithPopup,
  signOut,
} from "firebase/auth"
import { takeLeading, put, takeEvery } from "redux-saga/effects"
import { getFirebaseAuth, isLoggedIn } from "../utils/firebase"
import { RootState } from "./store"

export const authSlice = createSlice({
  name: "auth",
  initialState: {
    user: undefined as User | undefined,
    idToken: undefined as string | undefined,
    loading: true,
  },
  reducers: {
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload
    },
    setIdToken: (state, action: PayloadAction<string>) => {
      state.idToken = action.payload
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload
    },
  },
})

export const { setUser, setIdToken, setLoading } = authSlice.actions

export const selectUser = (state: RootState) => state.auth.user
export const selectLoading = (state: RootState) => state.auth.loading
export const selectIdToken = (state: RootState) => state.auth.idToken

function* signInGuestSaga() {
  const auth = getFirebaseAuth()
  yield put(setLoading(true))
  const { user }: UserCredential = yield signInAnonymously(auth)
  const token = yield user.getIdToken()
  yield put(setUser(user))
  yield put(setIdToken(token))
  yield put(setLoading(false))
}

function* signInWithGoogleSaga() {
  const auth = getFirebaseAuth()
  yield put(setLoading(true))
  const provider = new GoogleAuthProvider()
  const { user }: UserCredential = yield signInWithPopup(auth, provider)
  const token = yield user.getIdToken()
  yield put(setUser(user))
  yield put(setIdToken(token))
  yield put(setLoading(false))
}

function* logoutSaga() {
  const auth = getFirebaseAuth()
  yield put(setLoading(true))
  yield signOut(auth)
  yield put(setUser(null))
  yield put(setIdToken(null))
  yield put(setLoading(false))
}

function* checkAuthenticationSaga() {
  try {
    const user: User = yield isLoggedIn()
    const token = yield user.getIdToken()
    yield put(setUser(user))
    yield put(setIdToken(token))
  } catch (e) {
    yield put(setUser(null))
    yield put(setIdToken(null))
  }
  yield put(setLoading(false))
}

export default authSlice.reducer

export function* authSaga() {
  yield takeLeading("SIGN_IN_AS_GUEST", signInGuestSaga)
  yield takeLeading("SIGN_IN_WITH_GOOGLE", signInWithGoogleSaga)
  yield takeLeading("LOGOUT", logoutSaga)
  yield takeEvery("CHECK_AUTHENTICATION", checkAuthenticationSaga)
}

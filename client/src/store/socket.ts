import { createSlice } from "@reduxjs/toolkit"
import { put, takeEvery } from "redux-saga/effects";
import { RootState } from "./store";
import { setIdToken } from "./auth";
import { appSelect } from "./hooks";
import { connect, disconnect } from "../game/socket";

export const socketSlice = createSlice({
  name: "socket",
  initialState: {
    connected: false,
  },
  reducers: {
    setConnected: (state) => { state.connected = true},
    setDisconnected: (state) => { state.connected = false},
  },
})

export const { setConnected, setDisconnected } = socketSlice.actions
export const selectConnected = (state: RootState) => state.socket.connected

export default socketSlice.reducer

function* connectSocket() {
    const idToken = yield appSelect(state => state.auth.idToken)
    if(idToken) {
        connect(idToken)
    }
}

function* disconnectSocket() {
    yield disconnect()
}

function* setConnectedSaga() {
    yield put(setConnected())
}

function* setDisconnectedSaga() {
    yield put(setDisconnected())
}

export function* socketSaga() {
  yield takeEvery("SOCKET_CONNECTION_ESTABLISHED", setConnectedSaga)
  yield takeEvery("SOCKET_CONNECTION_DISCONNECTED", setDisconnectedSaga)
  yield takeEvery(setIdToken().type, connectSocket)
  yield takeEvery("DISCONNECT", disconnectSocket)
}

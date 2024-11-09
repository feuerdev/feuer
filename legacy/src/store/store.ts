import { configureStore } from "@reduxjs/toolkit"
import selectionReducer, { selectionSaga } from "./selection"
import createSagaMiddleware from "redux-saga"
import { all } from "redux-saga/effects"
import { authSaga, authSlice } from "./auth"
import { socketSaga, socketSlice } from "./socket"
import { gameSaga, gameSlice } from "./game"

const sagaMiddleware = createSagaMiddleware()
const middleware = [sagaMiddleware]
export const store = configureStore({
  reducer: {
    selection: selectionReducer,
    auth: authSlice.reducer,
    socket: socketSlice.reducer,
    game: gameSlice.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: false }).concat(middleware),
})

sagaMiddleware.run(rootSaga)

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

export function* rootSaga() {
  yield all([authSaga(), selectionSaga(), socketSaga(), gameSaga()])
}

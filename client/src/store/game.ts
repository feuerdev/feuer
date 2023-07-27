import { createSlice } from "@reduxjs/toolkit"
import { put, takeEvery } from "redux-saga/effects";
import { RootState } from "./store";
import { loadTextures } from "../game/renderer";

export const gameSlice = createSlice({
  name: "game",
  initialState: {
    texturesLoaded: false,
  },
  reducers: {
    setTexturesLoaded: (state) => { state.texturesLoaded = true},
  },
})

export const { setTexturesLoaded } = gameSlice.actions
export const selectTexturesLoaded = (state: RootState) => state.game.texturesLoaded

export default gameSlice.reducer

function* _loadTextures() {
  yield loadTextures()
  yield put(setTexturesLoaded())
}

export function* gameSaga() {
  yield takeEvery("LOAD_TEXTURES", _loadTextures)
}

import { PayloadAction, createSlice } from "@reduxjs/toolkit"
import { SelectionType } from "../game/selection"
import { put, takeEvery } from "redux-saga/effects";

export const selectionSlice = createSlice({
  name: "selection",
  initialState: {
    id: undefined as number | undefined,
    type: SelectionType.None as SelectionType,
    refresher: 0,
  },
  reducers: {
    select: (
      state,
      action: PayloadAction<{ id?: number; type: SelectionType }>
    ) => {
      state.id = action.payload.id
      state.type = action.payload.type
    },
    deselect: (state) => {
      state.id = undefined
      state.type = SelectionType.None
    },
    refresh: (state) => {
      state.refresher += 1
    }
  },
})

export const { select, deselect, refresh } = selectionSlice.actions

export default selectionSlice.reducer

function* refreshSelectionSaga() {
  yield put(refresh())
}

export function* selectionSaga() {
  yield takeEvery("REFRESH_SELECTION", refreshSelectionSaga)
}

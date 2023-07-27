import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux"
import { AppDispatch, RootState } from "./store"
import { select } from "redux-saga/effects"

type DispatchFunc = () => AppDispatch

export const useAppDispatch: DispatchFunc = useDispatch
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector
export function* appSelect<TSelected>( selector: (state: RootState) => TSelected, ): Generator<any, TSelected, TSelected> { return yield select(selector); }

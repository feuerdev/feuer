import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import { SelectionType } from "../game/selection";

export const selectionSlice = createSlice({
    name: 'selection',
    initialState: {
        id: undefined as number | undefined,
        type: SelectionType.None as SelectionType
    },
    reducers: {
        select: (state, action: PayloadAction<{ id?: number, type: SelectionType }>) => {
            state.id = action.payload.id;
            state.type = action.payload.type;
        },
        deselect: (state) => {
            state.id = undefined;
            state.type = SelectionType.None;
        }
    }
});

export const { select, deselect } = selectionSlice.actions;

export default selectionSlice.reducer;
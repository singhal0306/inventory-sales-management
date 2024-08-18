import { createSlice } from "@reduxjs/toolkit"

const inventorySlice = createSlice({
    name: 'inventory',
    initialState: {
        loading: false,
        items: [],
        error: false
    },
    reducers:{
        getItemsRequest(state) {
            state.loading = true;
        },
        getItemsSuccess (state, action){
            state.items = action.payload;
            state.loading= false;
            state.error= false;
        },
        getItemsFail(state, action){
            state.error = true;
            state.loading= false;
        },
        addItemRequest(state){
            state.loading = true;
        },
        addItemSuccess(state, action){
            state.loading = false;
        }
    }
})

export const inventoryAction = inventorySlice.actions;
export default inventorySlice.reducer
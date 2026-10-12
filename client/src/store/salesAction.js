import { salesActions } from "./salesSlice";
import { getBills } from "./billAction";
import { getItems } from "./inventoryAction";
import axios from "axios";

export const newBill = (newSale) => {
    return async (dispatch) => {
        try {
            const response = await axios.post('/api/bill/newbill', newSale)
            dispatch(salesActions.resetSalesData())
            await Promise.all([dispatch(getItems()), dispatch(getBills())]);
            return response.data.bill;
        } catch (error) {
            throw new Error(error.response?.data?.message || "Could not create bill");
        }
    }
};

export const billsData = () =>{
    return async (dispatch) =>{
        try {
            const response = await axios.get('/api/bill/allbills')
            console.log(response.data.bills)
        } catch (error) {
            console.log(error)
        }
    }
}
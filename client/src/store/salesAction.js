import { salesActions } from "./salesSlice";
import axios from "axios";

export const newBill = (newSale) => {
    return async (dispatch) => {
        try {
            const response = await axios.post('/api/bill/newbill', newSale)
            console.log(response.data.message)
            dispatch(salesActions.resetSalesData())
        } catch (error) {
            console.log(error)
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
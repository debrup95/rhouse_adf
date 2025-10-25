import { createSlice, PayloadAction } from '@reduxjs/toolkit';
interface UserState {
    user_id: string,
    email: string;
    fname: string;
    lname: string;
    mobile: string;
    token: string;
    isLoggedIn: boolean;
}

const initialState: UserState = {
    user_id: '',
    email: '',
    fname: '',
    lname: '',
    mobile: '',
    token: '',
    isLoggedIn: false,
};

const userSlice = createSlice({
    name: 'user',
    initialState,
    reducers: {
        setUserData: (state, action: PayloadAction<Partial<UserState>>) => {
            Object.assign(state, action.payload);
            state.isLoggedIn = true;
        },
        clearUserData: (state) => {
            state.user_id = '';
            state.email = '';
            state.fname = '';
            state.lname = '';
            state.mobile = '';
            state.token = '';
            state.isLoggedIn = false;
        },
    },
});

export const { setUserData, clearUserData } = userSlice.actions;
export default userSlice.reducer;

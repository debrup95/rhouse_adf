import { configureStore, combineReducers } from '@reduxjs/toolkit';
import userReducer from './userSlice';
import addressReducer from './addressSlice';
import propertyReducer from './propertySlice';
import buyerReducer from './buyerSlice';
import underwriteReducer from './underwriteSlice';
import buyerMatchingReducer from './buyerMatchingSlice';
import creditReducer from './creditSlice';
import skipTraceReducer from './skipTraceSlice';
import {
    persistStore,
    persistReducer,
    FLUSH,
    REHYDRATE,
    PAUSE,
    PERSIST,
    PURGE,
    REGISTER,
} from 'redux-persist';
import storage from 'redux-persist/lib/storage';

const rootReducer = combineReducers({
    user: userReducer,
    address: addressReducer,
    property: propertyReducer,
    buyers: buyerReducer,
    underwrite: underwriteReducer,
    buyerMatching: buyerMatchingReducer,
    credit: creditReducer,
    skipTrace: skipTraceReducer,
});

const persistConfig = {
    key: 'root',
    storage,
    whitelist: ['user', 'address', 'property', 'buyers', 'underwrite', 'buyerMatching', 'credit', 'skipTrace'],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
    reducer: persistedReducer,
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: { ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER] },
        }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

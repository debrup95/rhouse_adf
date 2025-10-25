import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { ChakraProvider } from '@chakra-ui/react';
import theme from './theme';
import { Provider } from 'react-redux';
import { store, persistor } from './rehouzd/estimator/store/index';
import { PersistGate } from 'redux-persist/integration/react';
import { BrowserRouter } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import config from './config';

// Add fonts to the document head
const fontLinks = document.createElement('div');
fontLinks.innerHTML = `
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Canva+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">
`;
document.head.appendChild(fontLinks.firstChild as Node);
document.head.appendChild(fontLinks.firstChild as Node);
document.head.appendChild(fontLinks.firstChild as Node);

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

// Check if Google Client ID is available
const hasGoogleClientId = Boolean(config.googleClientId && config.googleClientId.trim());


const AppContent = () => (
  <Provider store={store}>
    <PersistGate loading={null} persistor={persistor}>
      <ChakraProvider theme={theme}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ChakraProvider>
    </PersistGate>
  </Provider>
);

root.render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={config.googleClientId || 'dummy-client-id'}>
      <AppContent />
    </GoogleOAuthProvider>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();

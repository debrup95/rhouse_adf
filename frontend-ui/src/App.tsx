import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './rehouzd/estimator/landing/LandingPage';
import Navbar from './rehouzd/estimator/landing/components/Navbar';
import Footer from './rehouzd/estimator/landing/components/Footer';
import AccountSettingsPage from "./rehouzd/estimator/auth/components/AccountSettingsPage";
import EstimatePage from "./rehouzd/estimator/estimates/EstimatePage";

function App() {
  return (
      <BrowserRouter>
          <Navbar />
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/account" element={<AccountSettingsPage />} />
            <Route path="/estimate" element={<EstimatePage />} />
          </Routes>
          <Footer />
    </BrowserRouter>
  );
}

export default App;

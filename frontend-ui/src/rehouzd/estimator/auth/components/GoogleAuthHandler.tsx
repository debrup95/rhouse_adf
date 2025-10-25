import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppDispatch } from '../../store/hooks';
import { setUserData } from '../../store/userSlice';

const GoogleAuthHandler = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const email = searchParams.get('email');
  const firstName = searchParams.get('firstName');
  const lastName = searchParams.get('lastName');
  const userId = searchParams.get('userId');
  const mobileNumber = searchParams.get('mobileNumber');
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const isNewUserParam = searchParams.get('isNewUser') === 'true';

  useEffect(() => {
    // Check for OAuth errors first
    const error = searchParams.get('error');
    const errorReason = searchParams.get('reason');
    const errorMessage = searchParams.get('message');
    
    if (error) {
      // Don't automatically retry - prevent redirect loops
      const errorDetails = {
        error,
        reason: errorReason,
        message: errorMessage ? decodeURIComponent(errorMessage) : undefined,
        timestamp: new Date().toISOString()
      };
      
      // Store error details for display
      localStorage.setItem('oauth_error', JSON.stringify(errorDetails));
      
      navigate(`/?oauth_error=${error}&reason=${errorReason}`);
      return;
    }
    
    if (!token || !email) {
      navigate('/?error=missing_oauth_params');
      return;
    }

    if (!userId) {
      navigate('/?error=missing_user_id');
      return;
    }

    const isNewUser = String(isNewUserParam).toLowerCase() === 'true';

    const user = {
      user_id: userId,
      email,
      fname: firstName || '',
      lname: lastName || '',
      mobile: mobileNumber || '',
      token,
    };

    try {
      // Save user to Redux and localStorage
      dispatch(setUserData(user));
      localStorage.setItem('token', token);
      localStorage.setItem('email', email);
      localStorage.setItem('user', JSON.stringify(user));
      
      // Clear any previous OAuth errors
      localStorage.removeItem('oauth_error');

      // Redirect based on user status
      if (isNewUser) {
        navigate(`/?welcome=true`);
      } else {
        navigate('/estimate');
      }
    } catch (saveError) {
      navigate('/?error=save_failed');
    }
  }, [token, email, firstName, lastName, userId, mobileNumber, dispatch, navigate, isNewUserParam]);

  return null;
};

export default GoogleAuthHandler;

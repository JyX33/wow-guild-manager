import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    const handleAuthCallback = async () => {
      const fragment = globalThis.location.hash.substring(1);
      const params = new URLSearchParams(fragment);
      const accessToken = params.get('accessToken');
      const refreshToken = params.get('refreshToken');

      if (accessToken && refreshToken) {
        // Store tokens (will implement storage in AuthContext)
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);

        // Redirect to dashboard or intended page
        navigate('/dashboard'); // Or a different route after successful auth
      } else {
        // Handle error or missing tokens
        console.error('Access or refresh token missing from URL fragment');
        navigate('/login'); // Redirect to login on failure
      }
    };

    handleAuthCallback();
  }, [navigate]); // Depend on navigate

  useEffect(() => {
    // Existing logic for redirecting based on user/loading state
    // This might need adjustment depending on how AuthContext is updated
    if (!loading && user) {
      navigate('/dashboard');
    } else if (!loading && !user) {
      // Only redirect to login if tokens were not found/handled by handleAuthCallback
      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
         navigate('/login');
      }
    }
  }, [user, loading, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h2 className="text-xl mb-4">Authenticating...</h2>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
      </div>
    </div>
  );
};

export default AuthCallback;
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const Login: React.FC = () => {
  const { login } = useAuth();
  const [region, setRegion] = useState('eu');

  const handleLogin = () => {
    login(region);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        <h1 className="text-2xl font-bold mb-6 text-center">WoW Guild Manager</h1>
        
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Select Region</label>
          <select
            className="w-full p-2 border rounded"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
          >
            <option value="eu">Europe</option>
            <option value="us">Americas</option>
            <option value="kr">Korea</option>
            <option value="tw">Taiwan</option>
          </select>
        </div>
        
        <button
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
          onClick={handleLogin}
        >
          Login with Battle.net
        </button>
      </div>
    </div>
  );
};

export default Login;
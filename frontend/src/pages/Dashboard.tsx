import React from 'react';
import withAuth from '../components/withAuth';
import UserGuilds from '../components/UserGuilds';
import { useAuth } from '../context/AuthContext';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const { user, logout, refreshUser } = useAuth();
  const location = useLocation();


  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">WoW Guild Manager</h1>
        <div className="flex items-center">
          <span className="mr-4">Welcome, {user?.battletag}</span>
          <button
            onClick={logout}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Logout
          </button>
        </div>
      </div>

      
      <div className="mt-8 mb-8">
        <UserGuilds />
      </div>
    </div>
  );
};

export default withAuth(Dashboard);
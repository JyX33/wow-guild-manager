import React from 'react';
import { Link } from 'react-router-dom';
import GuildSelector from '../components/GuildSelector';
import { useAuth } from '../context/AuthContext';

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  
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
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div>
          <GuildSelector />
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold mb-4">Recent Guilds</h2>
          <p className="text-gray-500">You haven't visited any guilds yet.</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Link
          to="/characters"
          className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200"
        >
          <h2 className="text-xl font-bold mb-4">Character Management</h2>
          <p className="text-gray-600">Manage your characters and set your main character.</p>
        </Link>
      </div>
    </div>
  );
};

export default Dashboard;
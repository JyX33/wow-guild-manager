import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { guildApi } from '../services/api.service';

const GuildSelector: React.FC = () => {
  const navigate = useNavigate();
  const [region, setRegion] = useState('eu');
  const [realm, setRealm] = useState('');
  const [guildName, setGuildName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!realm || !guildName) {
      setError('Please enter both realm and guild name');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const response = await guildApi.getGuildByName(region, realm, guildName);
      navigate(`/guild/${response.data.id}`);
    } catch (error) {
      setError('Failed to find guild. Please check the realm and guild name.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Select Your Guild</h2>
      
      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Region</label>
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
        
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Realm</label>
          <input
            type="text"
            className="w-full p-2 border rounded"
            value={realm}
            onChange={(e) => setRealm(e.target.value)}
            placeholder="Enter realm name"
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Guild Name</label>
          <input
            type="text"
            className="w-full p-2 border rounded"
            value={guildName}
            onChange={(e) => setGuildName(e.target.value)}
            placeholder="Enter guild name"
          />
        </div>
        
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Find Guild'}
        </button>
      </form>
    </div>
  );
};

export default GuildSelector;
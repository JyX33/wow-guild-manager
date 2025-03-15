import React, { useState } from 'react';
import { Character } from '../../../shared/types';
import { CharacterList } from '../components/CharacterList';
import { CharacterForm } from '../components/forms/CharacterForm';
import { characterService } from '../services/api';
import withAuth from '../components/withAuth';

const CharactersPage: React.FC = () => {
  const [isAddingCharacter, setIsAddingCharacter] = useState<boolean>(false);
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [refreshList, setRefreshList] = useState<number>(0); // Used to trigger re-fetch

  const handleCreateCharacter = async (values: Partial<Character>) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await characterService.createCharacter(values);
      
      if (response.success && response.data) {
        setSuccess('Character created successfully');
        setIsAddingCharacter(false);
        setRefreshList(prev => prev + 1); // Trigger re-fetch
      } else {
        setError(response.error?.message || 'Failed to create character');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCharacter = async (values: Partial<Character>) => {
    if (!editingCharacter) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await characterService.updateCharacter(editingCharacter.id, values);
      
      if (response.success && response.data) {
        setSuccess('Character updated successfully');
        setEditingCharacter(null);
        setRefreshList(prev => prev + 1); // Trigger re-fetch
      } else {
        setError(response.error?.message || 'Failed to update character');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleEditCharacter = (character: Character) => {
    setEditingCharacter(character);
    setIsAddingCharacter(false);
  };

  const handleCancelForm = () => {
    setIsAddingCharacter(false);
    setEditingCharacter(null);
    setError(null);
    setSuccess(null);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Character Management</h1>
        
        {!isAddingCharacter && !editingCharacter && (
          <button
            onClick={() => setIsAddingCharacter(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Add Character
          </button>
        )}
      </div>
      
      {success && !isAddingCharacter && !editingCharacter && (
        <div className="mb-4 p-4 bg-green-100 text-green-700 rounded-md">
          {success}
        </div>
      )}
      
      {isAddingCharacter ? (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6">
          <h2 className="text-xl font-medium text-gray-900 mb-4">Add New Character</h2>
          <CharacterForm
            onSubmit={handleCreateCharacter}
            onCancel={handleCancelForm}
            loading={loading}
            error={error}
          />
        </div>
      ) : editingCharacter ? (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6">
          <h2 className="text-xl font-medium text-gray-900 mb-4">Edit Character</h2>
          <CharacterForm
            character={editingCharacter}
            onSubmit={handleUpdateCharacter}
            onCancel={handleCancelForm}
            loading={loading}
            error={error}
          />
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <CharacterList 
            key={refreshList} // Force re-render on refresh
            onEditCharacter={handleEditCharacter}
          />
        </div>
      )}
      
      {!isAddingCharacter && !editingCharacter && (
        <div className="mt-6 text-sm text-gray-500">
          <p>
            <strong>Main Character:</strong> The main character will be suggested by default when joining events.
          </p>
          <p className="mt-2">
            <strong>Delete Character:</strong> You cannot delete a character that is currently signed up for an event.
          </p>
        </div>
      )}
    </div>
  );
};

export default withAuth(CharactersPage);
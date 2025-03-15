import React, { useState, useEffect } from 'react';
import { characterService } from '../services/api';
import { Character } from '../../../shared/types';
import  LoadingSpinner  from './LoadingSpinner';
import  ConfirmationDialog  from './ConfirmationDialog';

interface CharacterListProps {
  onEditCharacter?: (character: Character) => void;
  onSelectCharacter?: (character: Character) => void;
  selectable?: boolean;
  className?: string;
}

export const CharacterList: React.FC<CharacterListProps> = ({
  onEditCharacter,
  onSelectCharacter,
  selectable = false,
  className = ''
}) => {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState<boolean>(false);
  const [characterToDelete, setCharacterToDelete] = useState<Character | null>(null);

  const fetchCharacters = async () => {
    setLoading(true);
    const response = await characterService.getUserCharacters();
    
    if (response.success && response.data) {
      setCharacters(response.data);
      setError(null);
    } else {
      setError(response.error?.message || 'Failed to load characters');
    }
    
    setLoading(false);
  };

  useEffect(() => {
    fetchCharacters();
  }, []);

  const handleSetMainCharacter = async (characterId: number) => {
    const response = await characterService.setMainCharacter(characterId);
    
    if (response.success && response.data) {
      // Update the character list to reflect the new main character
      fetchCharacters();
    } else {
      setError(response.error?.message || 'Failed to set main character');
    }
  };

  const openDeleteConfirmation = (character: Character) => {
    setCharacterToDelete(character);
    setDeleteConfirmOpen(true);
  };

  const closeDeleteConfirmation = () => {
    setDeleteConfirmOpen(false);
    setCharacterToDelete(null);
  };

  const handleDeleteCharacter = async () => {
    if (!characterToDelete) return;
    
    const response = await characterService.deleteCharacter(characterToDelete.id);
    
    if (response.success) {
      // Remove the character from the list
      setCharacters(characters.filter(c => c.id !== characterToDelete.id));
      closeDeleteConfirmation();
    } else {
      setError(response.error?.message || 'Failed to delete character');
      closeDeleteConfirmation();
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  if (characters.length === 0) {
    return (
      <div className="text-center p-4">
        <p className="text-gray-500">You haven't added any characters yet.</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Character
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Class
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Role
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Level
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Main
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {characters.map((character) => (
            <tr 
              key={character.id}
              className={`${selectable ? 'cursor-pointer hover:bg-gray-50' : ''}`}
              onClick={selectable && onSelectCharacter ? () => onSelectCharacter(character) : undefined}
            >
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="text-sm font-medium text-gray-900">
                    {character.name}
                  </div>
                  <div className="text-sm text-gray-500 ml-2">
                    {character.realm}
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">{character.class}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                  ${character.role === 'Tank' ? 'bg-blue-100 text-blue-800' : 
                    character.role === 'Healer' ? 'bg-green-100 text-green-800' : 
                    'bg-red-100 text-red-800'}`}>
                  {character.role}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {character.level}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {character.is_main ? (
                  <span className="text-green-600">Main</span>
                ) : (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSetMainCharacter(character.id);
                    }}
                    className="text-indigo-600 hover:text-indigo-900"
                  >
                    Set as Main
                  </button>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                {onEditCharacter && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditCharacter(character);
                    }}
                    className="text-indigo-600 hover:text-indigo-900 mr-4"
                  >
                    Edit
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openDeleteConfirmation(character);
                  }}
                  className="text-red-600 hover:text-red-900"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <ConfirmationDialog
        isOpen={deleteConfirmOpen}
        onClose={closeDeleteConfirmation}
        onConfirm={handleDeleteCharacter}
        title="Delete Character"
        message={`Are you sure you want to delete ${characterToDelete?.name}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  );
};
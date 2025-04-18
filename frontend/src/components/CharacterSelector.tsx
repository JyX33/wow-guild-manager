import React, { useState, useEffect } from 'react';
import { Character } from '../../../shared/types';
import { characterService } from '../services/api';
import LoadingSpinner from './LoadingSpinner';

interface CharacterSelectorProps {
  selectedCharacterId?: number | null;
  onSelectCharacter: (characterId: number) => void;
  className?: string;
}

export const CharacterSelector: React.FC<CharacterSelectorProps> = ({
  selectedCharacterId,
  onSelectCharacter,
  className = ''
}) => {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCharacters = async () => {
      setLoading(true);
      const response = await characterService.getUserCharacters();
      
      if (response.success && response.data) {
        setCharacters(response.data);
        
        // If no character is selected and we have a main character, select it
        if (!selectedCharacterId && response.data.length > 0) {
          const mainCharacter = response.data.find(char => char.is_main);
          if (mainCharacter) {
            onSelectCharacter(mainCharacter.id);
          } else {
            // If no main character, select the first one
            onSelectCharacter(response.data[0].id);
          }
        }
        
        setError(null);
      } else {
        setError(response.error?.message || 'Failed to load characters');
      }
      
      setLoading(false);
    };

    fetchCharacters();
  }, [selectedCharacterId, onSelectCharacter]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  if (characters.length === 0) {
    return (
      <div className="text-red-500">
        You need to add a character before you can subscribe to an event.
      </div>
    );
  }

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700">
        Character
      </label>
      <select
        value={selectedCharacterId || ''}
        onChange={(e) => onSelectCharacter(parseInt(e.target.value))}
        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
      >
        {characters.map((character) => (
          <option key={character.id} value={character.id}>
            {character.name} - Level {character.level} {character.class} ({character.role})
            {character.is_main ? ' (Main)' : ''}
          </option>
        ))}
      </select>
    </div>
  );
};
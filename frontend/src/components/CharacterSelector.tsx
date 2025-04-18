import React from 'react';
import { Character } from '../../../shared/types';

interface CharacterSelectorProps {
  selectedCharacterId?: number | null;
  onSelectCharacter: (characterId: number) => void;
  className?: string;
  characters: Character[]; // Add characters prop
}

export const CharacterSelector: React.FC<CharacterSelectorProps> = ({
  selectedCharacterId,
  onSelectCharacter,
  className = '',
  characters // Destructure characters prop
}) => {

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
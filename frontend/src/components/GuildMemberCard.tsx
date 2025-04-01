import React from 'react';
import { ClassifiedMember } from '../../../shared/types/guild';

// Helper functions (can be shared or defined locally)
const getItemLevel = (member: ClassifiedMember): number => {
  return member.character?.profile_json?.equipped_item_level ||
         member.character?.profile_json?.average_item_level ||
         0;
};

const getCharacterLevel = (member: ClassifiedMember): number => {
  return member.character?.level || 0;
};

// TODO: Implement class color mapping
const getClassColor = (className: string): string => {
  const colors: { [key: string]: string } = {
    'Death Knight': 'text-red-700', // Example
    'Druid': 'text-orange-500', // Example
    'Hunter': 'text-green-500', // Example
    'Mage': 'text-blue-400', // Example
    'Paladin': 'text-pink-400', // Example
    'Priest': 'text-white', // Example (adjust for light/dark mode)
    'Rogue': 'text-yellow-400', // Example
    'Shaman': 'text-blue-600', // Example
    'Warlock': 'text-purple-500', // Example
    'Warrior': 'text-yellow-700', // Example
    'Demon Hunter': 'text-purple-700', // Example
    'Monk': 'text-teal-500', // Example
    'Evoker': 'text-teal-300', // Example
  };
  return colors[className] || 'text-gray-800'; // Default color
};

interface GuildMemberCardProps {
  member: ClassifiedMember; // Expecting a 'Main' character here
  getRankName: (rankId: number) => string;
  onViewAlts: (member: ClassifiedMember) => void;
  altCount: number;
  // userRole?: 'Guild Master' | 'Officer' | 'Member'; // For admin actions later
}

export const GuildMemberCard: React.FC<GuildMemberCardProps> = ({
  member,
  getRankName,
  onViewAlts,
  altCount,
  // userRole 
}) => {
  
  const character = member.character; // Convenience variable
  const profile = character?.profile_json;

  if (!character) {
    // Handle case where character data might be missing unexpectedly
    return (
      <div className="border p-4 rounded shadow bg-white text-red-500">
        Error: Character data missing for member ID {member.character_id}.
      </div>
    );
  }

  return (
    <div className="border p-4 rounded shadow bg-white flex flex-col h-full">
      {/* Card Header */}
      <div className="mb-2">
        <h3 className={`font-bold text-lg truncate ${getClassColor(profile?.character_class?.name || character.class)}`}>
          {character.name}
        </h3>
        <p className="text-sm text-gray-600">{getRankName(member.rank)}</p>
      </div>

      {/* Core Stats */}
      <div className="mb-3 text-sm space-y-1">
        <p>Level: {getCharacterLevel(member)}</p>
        <p>Item Level: {getItemLevel(member)}</p>
        <p>
          Class: {profile?.character_class?.name || character.class}
          {profile?.active_spec && (
            <span className="text-gray-500 ml-1">({profile.active_spec.name})</span>
          )}
        </p>
        {/* M+ Info */}
        {character?.mythic_profile_json?.current_mythic_rating && (
           <p>M+ Rating: {Math.round(character.mythic_profile_json.current_mythic_rating.rating || 0)}</p>
        )}
        {/* Professions Info */}
        {character?.professions_json && character.professions_json.length > 0 && (
          <div>
            Professions:
            <ul className="list-disc list-inside text-xs text-gray-600">
              {character.professions_json.map(prof => (
                <li key={prof.profession.id}>
                  {prof.profession.name}
                  {prof.skill_points && ` (${prof.skill_points}/${prof.max_skill_points || '?'})`}
                </li>
              ))}
            </ul>
          </div>
        )}
        {/* TODO: Add M+ Info */}
        {/* TODO: Add Professions Info */}
      </div>

      {/* Spacer to push button to bottom */}
      <div className="flex-grow"></div> 

      {/* Footer Actions */}
      <div className="mt-auto pt-2 border-t border-gray-200">
        {/* Alt Button */}
        {altCount > 0 && (
          <button
            onClick={() => onViewAlts(member)}
            className="text-sm text-blue-600 hover:underline"
            aria-label={`View ${altCount} alts for ${character.name}`}
          >
            View Alts ({altCount})
          </button>
        )}
        {altCount === 0 && (
           <span className="text-sm text-gray-400 italic">No alts</span>
        )}

        {/* Admin Actions Placeholder */}
        {/* {userRole === 'Guild Master' || userRole === 'Officer' ? (
          <div className="mt-2 flex justify-end space-x-2">
            <button className="text-xs px-2 py-1 border rounded hover:bg-gray-100">Manage Rank</button>
            <button className="text-xs px-2 py-1 border rounded hover:bg-gray-100">Set Status</button>
          </div>
        ) : null} */}
      </div>
    </div>
  );
};
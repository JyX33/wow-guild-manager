import React, { useRef } from 'react'; // Import useRef
import { ClassifiedMember } from '../../../shared/types/guild';
import { useClassBackgroundImage } from '../hooks/useClassBackgroundImage'; // Import the hook

// Helper functions (can be shared or defined locally)
const getItemLevel = (member: ClassifiedMember): number => {
  return member.character?.profile_json?.equipped_item_level ||
         member.character?.profile_json?.average_item_level ||
         0;
};

const getCharacterLevel = (member: ClassifiedMember): number => {
  return member.character?.level || 0;
};

interface GuildMemberCardProps {
  member: ClassifiedMember; // Expecting a 'Main' character here
  getRankName: (rankId: number) => string;
  onViewAlts: (member: ClassifiedMember) => void;
  altCount: number;
}

export const GuildMemberCard: React.FC<GuildMemberCardProps> = ({
  member,
  getRankName,
  onViewAlts,
  altCount,
}) => {
  
  const character = member.character; // Convenience variable
  const profile = character?.profile_json;
  const characterClassName = profile?.character_class?.name || character.class; // Get class name
  
  // Create a ref for the card element
  const cardRef = useRef<HTMLDivElement>(null);

  // Pass the ref to the hook
  const backgroundImageUrl = useClassBackgroundImage(characterClassName, cardRef as React.RefObject<HTMLElement>);

  if (!character) {
    // Handle case where character data might be missing unexpectedly
    return (
      <div className="border p-4 rounded shadow bg-white text-red-500">
        Error: Character data missing for member ID {member.character_id}.
      </div>
    );
  }

  return (
    <div
      ref={cardRef} // Attach the ref to the main div
      className="border rounded shadow flex flex-col h-full relative overflow-hidden"
      style={{
        backgroundImage: backgroundImageUrl ? `url(${backgroundImageUrl})` : 'none', // Apply dynamic background
        backgroundSize: 'cover',
        backgroundPosition: 'center center',
        backgroundColor: '#1f2937', // Fallback background color
        minHeight: '150px', // Prevent collapse before image loads
      }}
    >
      {/* Content Wrapper */}
      <div className="relative flex flex-col h-full p-4 text-white">
         
         {/* Card Header */}
         <div className="mb-2 bg-black/60 p-1 rounded">
           <h3 className="font-bold text-lg truncate text-white">
             {character.name}
           </h3>
           <p className="text-sm text-gray-300">
             {getRankName(member.rank)}
           </p>
         </div>

         {/* Stats */}
         <div className="mb-3 text-sm space-y-1 text-gray-200 bg-black/60 p-1 rounded">
           <p>Level: {getCharacterLevel(member)}</p>
           <p>Item Level: {getItemLevel(member)}</p>
           <p>
             Class: {characterClassName}
             {profile?.active_spec && (
               <span className="text-gray-400 ml-1">({profile.active_spec.name})</span>
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
               <ul className="list-disc list-inside text-xs text-gray-300">
                 {character.professions_json.map(prof => (
                   <li key={prof.profession.id}>
                     {prof.profession.name}
                     {prof.skill_points && ` (${prof.skill_points}/${prof.max_skill_points || '?'})`}
                   </li>
                 ))}
               </ul>
             </div>
           )}
         </div>

         {/* Spacer */}
         <div className="flex-grow"></div>

         {/* Footer Actions */}
         <div className="mt-auto pt-2 border-t border-gray-600">
           {altCount > 0 && (
             <button
               onClick={() => onViewAlts(member)}
               className="text-sm text-blue-400 hover:underline"
               aria-label={`View ${altCount} alts for ${character.name}`}
             >
               View Alts ({altCount})
             </button>
           )}
           {altCount === 0 && (
              <span className="text-sm text-gray-500 italic">
                No alts
              </span>
           )}
         </div>
      </div>
    </div>
  );
};
import React from 'react';
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

// Removed getClassColor function as it's replaced by background image + overlay

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
  const characterClassName = profile?.character_class?.name || character.class; // Get class name
  const backgroundImageUrl = useClassBackgroundImage(characterClassName); // Use the hook
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
      className="border rounded shadow flex flex-col h-full relative overflow-hidden" // Removed bg-gray-700, Base dark background, relative for overlay, overflow hidden
      style={{
        backgroundImage: backgroundImageUrl ? `url(${backgroundImageUrl})` : 'none', // Apply dynamic background
        backgroundSize: 'cover',
        backgroundPosition: 'center center',
      }}
    >
      {/* Overlay removed, using text-shadow instead */}
      
      {/* Content Wrapper */}
      {/* Removed z-10 as overlay is gone */}
      <div className="relative flex flex-col h-full p-4 text-white"> {/* Padding moved here, text white base */}
         
         {/* Card Header - Adjusted text colors */}
         {/* Added wrapper with background for header */}
         <div className="mb-2 bg-black/60 p-1 rounded">
           <h3 className="font-bold text-lg truncate text-white">
             {character.name}
           </h3>
           <p className="text-sm text-gray-300">
             {getRankName(member.rank)}
           </p>
         </div>

         {/* Added wrapper with background for stats */}
         <div className="mb-3 text-sm space-y-1 text-gray-200 bg-black/60 p-1 rounded">
           <p>Level: {getCharacterLevel(member)}</p>
           <p>Item Level: {getItemLevel(member)}</p>
           <p>
             Class: {characterClassName} {/* Use variable */}
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
               <ul className="list-disc list-inside text-xs text-gray-300"> {/* Adjusted list color */}
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

         {/* Footer Actions - Adjusted colors */}
         <div className="mt-auto pt-2 border-t border-gray-600"> {/* Adjusted border color */}
           {/* Alt Button */}
           {altCount > 0 && (
             <button
               onClick={() => onViewAlts(member)}
               className="text-sm text-blue-400 hover:underline" // Adjusted link color, removed text shadow
               aria-label={`View ${altCount} alts for ${character.name}`}
             >
               View Alts ({altCount})
             </button>
           )}
           {altCount === 0 && (
              <span className="text-sm text-gray-500 italic"> {/* Removed text shadow */}
                No alts
              </span>
           )}

           {/* Admin Actions Placeholder */}
           {/* {userRole === 'Guild Master' || userRole === 'Officer' ? (
             <div className="mt-2 flex justify-end space-x-2">
               <button className="text-xs px-2 py-1 border rounded hover:bg-gray-100">Manage Rank</button>
               <button className="text-xs px-2 py-1 border rounded hover:bg-gray-100">Set Status</button>
             </div>
           ) : null} */}
         </div>
      </div> {/* End Content Wrapper */}
    </div>
  );
};
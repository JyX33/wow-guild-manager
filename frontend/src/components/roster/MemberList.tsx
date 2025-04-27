import { RosterMember } from '@shared/types/api';

interface MemberListProps {
  members: RosterMember[];
  isSubmitting: boolean;
  // onUpdateRole removed as roles are now read-only
  onRemoveMember: (member: RosterMember) => void;
  removingMembers: Set<number>;
}

const getClassColor = (className: string): string => {
  const colors: { [key: string]: string } = {
    'Death Knight': 'text-red-600',
    'Demon Hunter': 'text-purple-600',
    'Druid': 'text-orange-500',
    'Hunter': 'text-green-400',
    'Mage': 'text-blue-400',
    'Monk': 'text-teal-400',
    'Paladin': 'text-pink-400',
    'Priest': 'text-white',
    'Rogue': 'text-yellow-400',
    'Shaman': 'text-blue-600',
    'Warlock': 'text-purple-400',
    'Warrior': 'text-orange-700',
    'Evoker': 'text-teal-600',
  };
  return colors[className] || 'text-gray-400';
};

import React from 'react'; // Removed useState, useCallback

const MemberList: React.FC<MemberListProps> = React.memo(({
  members,
  isSubmitting,
  // onUpdateRole removed
  onRemoveMember,
  removingMembers,
}) => {
  // Removed roleInputs state and related handlers

  return (
    <div className="overflow-x-auto max-h-96 overflow-y-auto border border-gray-600 rounded">
      <table className="min-w-full divide-y divide-gray-600">
        <thead className="bg-gray-800 sticky top-0 z-10">
          <tr>
            <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Name</th>
            <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Rank</th>
            <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Class</th>
            <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Role</th>
            <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-gray-700 divide-y divide-gray-600">
          {Array.isArray(members) && members.map((member) => {
            const rowIsLoading = isSubmitting || removingMembers.has(member.characterId);
            return (
              <tr key={member.characterId} className="hover:bg-gray-600/50">
                <td className={`px-4 py-2 whitespace-nowrap text-sm font-medium ${getClassColor(member.class)}`}>{member.name}</td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-300">{member.rank}</td>
                <td className={`px-4 py-2 whitespace-nowrap text-sm ${getClassColor(member.class)}`}>{member.class}</td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-300">
                  {/* Display role as read-only text */}
                  <span>{member.role || '-'}</span>
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => {
                      console.log(`[MemberList] Remove button clicked for member: ${member.name} (ID: ${member.characterId})`); // <<< ADD LOG
                      onRemoveMember(member);
                    }}
                    disabled={rowIsLoading}
                    className="text-red-400 hover:text-red-300 text-xs p-1 rounded bg-gray-800 hover:bg-red-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
                    title={`Remove ${member.name}`}
                  >
                    {removingMembers.has(member.characterId) ? 'Removing...' : 'Remove'}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
});

export default MemberList;

import React from 'react';
import LoadingSpinner from '../LoadingSpinner';
import { Roster } from '@shared/types/api';

interface RosterListProps {
  rosters: Roster[];
  selectedRosterId: number | null;
  loading: boolean; // Loading state for fetching the list of rosters
  isSubmitting: boolean; // Submitting state for roster creation/deletion
  newRosterName: string;
  onRosterNameChange: (name: string) => void;
  onSelectRoster: (rosterId: number) => void;
  onCreateRoster: (e: React.FormEvent) => void;
  onDeleteRoster: (roster: Roster) => void;
}

const RosterList: React.FC<RosterListProps> = ({
  rosters,
  selectedRosterId,
  loading, // Use the loading prop passed from parent
  isSubmitting, // Use the isSubmitting prop passed from parent
  newRosterName,
  onRosterNameChange,
  onSelectRoster,
  onCreateRoster,
  onDeleteRoster,
}) => (
  <div className="md:col-span-1 flex flex-col">
    <h3 className="text-xl font-semibold mb-3 text-yellow-300">Rosters</h3>
    {loading ? ( // Use the loading prop here
      <LoadingSpinner />
    ) : (
      <>
        <div className="flex-grow overflow-hidden mb-4">
          <ul className="space-y-2 max-h-72 overflow-y-auto pr-2 border border-gray-700 rounded p-2 bg-gray-900/50">
            {Array.isArray(rosters) && rosters.map((roster) => (
              <li key={roster.id}
                  className={`flex justify-between items-center p-2 rounded cursor-pointer transition-colors duration-150 ${selectedRosterId === roster.id ? 'bg-blue-700 hover:bg-blue-600 ring-1 ring-blue-400' : 'bg-gray-700 hover:bg-gray-600'}`}
                  onClick={() => onSelectRoster(roster.id)}>
                <span className="font-medium truncate" title={roster.name}>{roster.name}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); onDeleteRoster(roster); }}
                  disabled={isSubmitting} // Use the isSubmitting prop here
                  className="ml-2 text-red-400 hover:text-red-300 text-xs p-1 rounded bg-gray-800 hover:bg-red-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
                  title={`Delete ${roster.name}`}
                >
                  🗑️
                </button>
              </li>
            ))}
            {rosters.length === 0 && <li className="text-gray-400 italic p-2">No rosters found.</li>}
          </ul>
        </div>
        <form onSubmit={onCreateRoster} className="flex space-x-2 mt-auto">
          <input
            type="text"
            value={newRosterName}
            onChange={(e) => onRosterNameChange(e.target.value)}
            placeholder="New Roster Name"
            disabled={isSubmitting} // Use the isSubmitting prop here
            className="flex-grow p-2 rounded bg-gray-900 border border-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
          />
          <button type="submit" disabled={isSubmitting || !newRosterName.trim()} className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed">
            {isSubmitting ? <LoadingSpinner size="sm" /> : 'Create'} {/* Use the isSubmitting prop here */}
          </button>
        </form>
      </>
    )}
  </div>
);

export default RosterList;

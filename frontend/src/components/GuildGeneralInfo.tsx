import React, { useState, useEffect } from 'react';
import { Guild } from '../../../shared/types/guild';
import { GuildMember } from '../../../shared/types/guild';
import { guildService } from '../services/api/guild.service';
import LoadingSpinner from './LoadingSpinner';

interface GuildGeneralInfoProps {
  guild: Guild;
}

interface RoleCounts {
  dps: number;
  healer: number;
  tank: number;
  unknown: number;
}
interface ClassCounts {
  [key: string]: number;
}

/**
 * Component to display general information about a guild, including roster stats.
 * Fetches guild members to calculate role breakdown.
 * @param {GuildGeneralInfoProps} props - Component props.
 * @param {Guild} props.guild - The guild data object.
 * @returns {React.ReactElement} The rendered component.
 */
const GuildGeneralInfo: React.FC<GuildGeneralInfoProps> = ({ guild }) => {
  const [members, setMembers] = useState<GuildMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roleCounts, setRoleCounts] = useState<RoleCounts>({ dps: 0, healer: 0, tank: 0, unknown: 0 });
  const [classCounts, setClassCounts] = useState<ClassCounts>({});

  useEffect(() => {
    const fetchMembers = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await guildService.getGuildMembers(guild.id);
        if (response.success && response.data) {
          setMembers(response.data);
          calculateRoleCounts(response.data);
          calculateClassCounts(response.data);
        } else {
          setError(response.error?.message || 'Failed to load guild members');
        }
      } catch (err) {
        console.error('Error fetching guild members:', err);
        setError('An error occurred while fetching guild members.');
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, [guild.id]);

  /**
   * Calculates the count of characters for each role (DPS, Healer, Tank).
   * Assumes a simple role determination based on common class/spec patterns.
   * This might need refinement based on actual data structure or game logic.
   * @param {GuildMember[]} memberList - The list of members in the guild.
   */
  const calculateRoleCounts = (memberList: GuildMember[]) => {
    const counts: RoleCounts = { dps: 0, healer: 0, tank: 0, unknown: 0 };
    memberList.forEach(member => {
      const role = (member.character_role ?? 'unknown').toLowerCase();
      if (role === 'dps') counts.dps++;
      else if (role === 'healer') counts.healer++;
      else if (role === 'tank') counts.tank++;
      else counts.unknown++; // Count 'Support' or any other unexpected roles as unknown for now
    });
    setRoleCounts(counts);
  };
  /**
   * Calculates the count of characters for each class.
   * @param {GuildMember[]} memberList - The list of members in the guild.
   */
  const calculateClassCounts = (memberList: GuildMember[]) => {
    const counts: ClassCounts = {};
    memberList.forEach(member => {
      const className = member.character_class ?? 'Unknown Class';
      counts[className] = (counts[className] || 0) + 1;
    });
    setClassCounts(counts);
  };

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">General Information</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <p className="text-gray-600">Guild Name</p>
          <p className="text-lg font-medium">{guild.name}</p>
        </div>
        <div>
          <p className="text-gray-600">Server (Realm)</p>
          <p className="text-lg font-medium">{guild.realm} ({guild.region.toUpperCase()})</p>
        </div>
      </div>

      <h3 className="text-xl font-semibold mb-3">Roster Overview</h3>
      {loading && (
        <div className="flex justify-center items-center py-4">
          <LoadingSpinner />
          <span className="ml-2">Loading roster details...</span>
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      {!loading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gray-100 p-4 rounded">
            <p className="text-gray-600">Total Members</p>
            <p className="text-2xl font-bold">{members.length}</p>
          </div>
          <div className="bg-red-100 p-4 rounded">
            <p className="text-red-700">DPS</p>
            <p className="text-2xl font-bold">{roleCounts.dps}</p>
          </div>
          <div className="bg-green-100 p-4 rounded">
            <p className="text-green-700">Healers</p>
            <p className="text-2xl font-bold">{roleCounts.healer}</p>
          </div>
          <div className="bg-blue-100 p-4 rounded">
            <p className="text-blue-700">Tanks</p>
            <p className="text-2xl font-bold">{roleCounts.tank}</p>
          </div>
           {roleCounts.unknown > 0 && (
             <div className="bg-yellow-100 p-4 rounded">
               <p className="text-yellow-700">Unknown Role</p>
               <p className="text-2xl font-bold">{roleCounts.unknown}</p>
             </div>
           )}
        <h3 className="text-xl font-semibold mb-3">Class Breakdown</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(classCounts).map(([className, count]) => (
            <div key={className} className="bg-gray-100 p-4 rounded">
              <p className="text-gray-600">{className}</p>
              <p className="text-2xl font-bold">{count}</p>
            </div>
          ))}
        </div>
        </div>
      )}
    </div>
  );
};

export default GuildGeneralInfo;
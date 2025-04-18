import * as crypto from 'crypto';
import axios from 'axios';
import { DbCharacter } from '../../../../shared/types/guild.js';
import { BattleNetRegion } from '../../../../shared/types/user.js';
import logger from '../../utils/logger.js';
import { createSlug } from '../../utils/slugify.js';
import { BattleNetApiClient } from '../../services/battlenet-api.client.js';

type ToyCollectionData = {
  toys: { toy: { id: number } }[];
};

const NO_TOYS_HASH = 'a3741d687719e1c015f4f115371c77064771f699817f81f09016350165a19111';

export async function calculateCharacterToyHash(apiClient: BattleNetApiClient, character: Pick<DbCharacter, 'id' | 'name' | 'realm' | 'region' | 'user_id'>): Promise<string | null> {
  if (character.user_id !== null) {
    logger.trace({ charId: character.id, charName: character.name }, `[SyncService][ToyHash] Skipping calculation for linked character.`);
    return null;
  }
  if (!character.name || !character.realm || !character.region) {
    logger.warn({ charId: character.id, name: character.name, realm: character.realm, region: character.region }, '[SyncService][ToyHash] Cannot calculate: Missing character name, realm, or region.');
    return null;
  }

  const region = character.region as BattleNetRegion;
  const realmSlug = createSlug(character.realm);
  const characterNameLower = character.name.toLowerCase();
  const logContext = { charId: character.id, charName: character.name, realmSlug, region };
  logger.debug(logContext, `[SyncService][ToyHash] Calculating for unlinked character ${character.name}.`);

  try {
    logger.trace(logContext, `[SyncService][ToyHash] Fetching collections index.`);
    const collectionsIndex = await apiClient.getCharacterCollectionsIndex(realmSlug, characterNameLower, region);

    if (!collectionsIndex?.toys?.href) {
      logger.debug(logContext, `[SyncService][ToyHash] Toys collection href not found in index. Using NO_TOYS_HASH.`);
      return NO_TOYS_HASH;
    }

    const toysHref = collectionsIndex.toys.href;
    logger.trace({ ...logContext, href: toysHref }, `[SyncService][ToyHash] Fetching toys data from href.`);
    const toyJobId = `char-toys-${region}-${realmSlug}-${characterNameLower}`;
    const toysData = await apiClient.getGenericBattleNetData<ToyCollectionData>(toysHref, toyJobId);

    if (toysData?.toys && Array.isArray(toysData.toys) && toysData.toys.length > 0) {
      const toyIds = toysData.toys
        .map((t: { toy?: { id: number } }) => t?.toy?.id)
        .filter((id: any): id is number => typeof id === 'number')
        .sort((a: number, b: number) => a - b);

      if (toyIds.length === 0) {
        logger.debug(logContext, `[SyncService][ToyHash] No valid toy IDs found in fetched data. Using NO_TOYS_HASH.`);
        return NO_TOYS_HASH;
      }

      const toyIdString = toyIds.join(',');
      const calculatedHash = crypto.createHash('sha256').update(toyIdString).digest('hex');
      logger.debug({ ...logContext, toyCount: toyIds.length, hash: calculatedHash }, `[SyncService][ToyHash] Calculated hash.`);
      return calculatedHash;
    } else {
      logger.debug(logContext, `[SyncService][ToyHash] No toys found or invalid format in fetched data. Using NO_TOYS_HASH.`);
      return NO_TOYS_HASH;
    }
  } catch (error: unknown) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      logger.warn(logContext, `[SyncService][ToyHash] Collections index or toys endpoint returned 404. Assuming no toys/profile issue. Using NO_TOYS_HASH.`);
      return NO_TOYS_HASH;
    } else {
      logger.error({ err: error, ...logContext }, `[SyncService][ToyHash] Error calculating toy hash. Returning null.`);
      return null;
    }
  }
}

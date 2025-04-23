import logger from '../../utils/logger.js';

interface TokenDetails {
    discordId: string;
    discordUsername: string;
    timestamp: number;
}

const tokenStore = new Map<string, TokenDetails>();
const TOKEN_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

export function storeToken(token: string, details: { discordId: string, discordUsername: string }): void {
    const storeDetails: TokenDetails = { ...details, timestamp: Date.now() };
    tokenStore.set(token, storeDetails);
    logger.info(`Stored token ${token} for ${details.discordUsername}`);
    // Optional: Add cleanup logic for very old tokens if needed
}

export function retrieveTokenDetails(token: string): { discordId: string, discordUsername: string } | undefined {
    const details = tokenStore.get(token);
    if (!details) {
        logger.warn(`Token ${token} not found in store.`);
        return undefined;
    }

    const now = Date.now();
    if (now - details.timestamp > TOKEN_EXPIRY_MS) {
        logger.warn(`Token ${token} expired.`);
        tokenStore.delete(token); // Clean up expired token
        return undefined;
    }

    tokenStore.delete(token); // Token is single-use, delete after retrieval
    logger.info(`Retrieved and deleted token ${token} for ${details.discordUsername}`);
    return { discordId: details.discordId, discordUsername: details.discordUsername };
}

// Optional: Function to explicitly delete if needed elsewhere
export function deleteToken(token: string): void {
    tokenStore.delete(token);
}
/**
 * Actions Index
 * 
 * Central export point for all server actions.
 * This file maintains backward compatibility by re-exporting all actions
 * from their respective modules.
 * 
 * @module actions
 */

// Re-export all actions from their respective modules
export * from './auth';
export * from './profile';

// Note: Other modules (property, favorite, review, booking, rental, admin)
// will be added as they are created. For now, these are still in utils/actions.ts


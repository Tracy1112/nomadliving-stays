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
export * from './property';
export * from './favorite';
export * from './review';
export * from './booking';
export * from './rental';
export * from './admin';


/**
 * Colors Utility Module
 * 
 * Provides utilities for consistent color generation and management across the application.
 * Used primarily for generating avatar background colors based on user/workspace identifiers.
 */

/**
 * Predefined color palette for avatars
 * Carefully selected for:
 * - Visual appeal and harmony
 * - Sufficient contrast with white text
 * - Distinct recognition between different avatars
 */
const avatarColors = [
  '#FF6B2C', // Orange - Primary accent color
  '#2196F3', // Blue - Information and interaction
  '#4CAF50', // Green - Success and active states
  '#9C27B0', // Purple - Brand identity
  '#E91E63', // Pink - Emphasis and highlights
  '#00BCD4', // Cyan - Secondary accent
  '#3F51B5', // Indigo - Navigation and structure
  '#F44336', // Red - Alerts and important actions
  '#009688', // Teal - Alternative success states
  '#673AB7', // Deep Purple - Alternative brand color
  '#FFC107', // Amber - Warnings and notifications
  '#795548', // Brown - Neutral and earth tones
];

/**
 * Generates a consistent color based on an identifier string
 * Uses a simple but effective hashing algorithm to ensure the same identifier
 * always gets the same color, providing visual consistency across sessions.
 * 
 * @param {string} identifier - String to generate color from (e.g., user ID, workspace ID)
 * @returns {string} Hex color code from the avatar colors palette
 * 
 * @example
 * const userColor = getAvatarColor(userId);
 * const workspaceColor = getAvatarColor(workspaceId);
 */
export const getAvatarColor = (identifier) => {
  // Handle null/undefined identifiers
  if (!identifier) return avatarColors[0];

  // Create a simple hash of the identifier
  const hash = identifier.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);

  // Use the hash to select a color from the array
  const index = Math.abs(hash) % avatarColors.length;
  return avatarColors[index];
}; 
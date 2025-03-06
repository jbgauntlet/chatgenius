// Array of visually pleasing colors for avatars
const avatarColors = [
  '#FF6B2C', // Orange
  '#2196F3', // Blue
  '#4CAF50', // Green
  '#9C27B0', // Purple
  '#E91E63', // Pink
  '#00BCD4', // Cyan
  '#3F51B5', // Indigo
  '#F44336', // Red
  '#009688', // Teal
  '#673AB7', // Deep Purple
  '#FFC107', // Amber
  '#795548', // Brown
];

// Function to get a consistent color based on user ID or name
export const getAvatarColor = (identifier) => {
  // Create a simple hash of the identifier
  const hash = identifier.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);

  // Use the hash to select a color from the array
  const index = Math.abs(hash) % avatarColors.length;
  return avatarColors[index];
}; 
/**
 * Text Animation Utility Module
 * 
 * Provides utilities for animating text input in a typewriter-style effect.
 * Used for creating natural-looking text animations when displaying AI-generated content.
 */

/**
 * Simulates typing text into an element with a typewriter effect
 * 
 * This function gradually adds characters to an element's text content,
 * creating a typing animation effect. It supports a customizable typing speed
 * and can trigger a callback after each character is typed.
 * 
 * @example
 * // Basic usage
 * typeText("Hello, world!", element, 50);
 * 
 * // With height adjustment callback
 * typeText("Hello, world!", element, 50, () => {
 *   element.style.height = 'auto';
 * });
 * 
 * @param {string} text - The text to type
 * @param {HTMLElement} element - The element to type into
 * @param {number} speed - Typing speed in milliseconds per character
 * @param {Function} onCharacterTyped - Callback function called after each character is typed
 * @returns {Promise} Resolves when typing is complete
 */
export const typeText = (text, element, speed = 50, onCharacterTyped) => {
  return new Promise((resolve) => {
    let index = 0;
    
    const type = () => {
      if (index < text.length) {
        element.textContent += text[index];
        index++;
        
        // Call the callback after each character is typed
        if (onCharacterTyped) {
          onCharacterTyped();
        }
        
        setTimeout(type, speed);
      } else {
        resolve();
      }
    };

    type();
  });
}; 
/**
 * Simulates typing text into an element
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
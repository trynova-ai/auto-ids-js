/**
 * This script sets up a MutationObserver to automatically assign 'data-testid' attributes
 * to newly added 'input', 'button', and 'a' elements in the DOM. The strategy is as follows:
 *
 * 1. When new nodes are added to the DOM, the observer processes each node and its descendants.
 * 2. For each target element, it checks if a 'data-testid' attribute is already present.
 *    - If not, it generates a unique 'data-testid' using the element's text content or placeholder,
 *      along with text content from up to **2 levels of ancestor elements**.
 *    - Each text content segment is truncated to a maximum of **20 characters**.
 *    - It combines up to **2 text content segments** with dashes to form the 'baseId'.
 *    - The combined `baseId` is capped at **30 characters total**.
 *    - It appends a DOM index path (up to **3 levels** of ancestor indices) to ensure uniqueness
 *      when elements have the same text content.
 * 3. If no text content or placeholder is found, it falls back to generating a 'data-testid'
 *    based on the DOM path of the element.
 * 4. The 'sanitizeText' function is used to clean up text content by removing punctuation
 *    and replacing spaces with hyphens.
 */

export default function testDataIdObserver(): MutationObserver {
  const observer = new MutationObserver((mutations: MutationRecord[]) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if ((node as HTMLElement).nodeType === 1) { // Only process element nodes

            const htmlNode = node as HTMLElement;

            // Function to process each element for data-testid
            const processElement = (element: HTMLElement) => {
              const elementsToCheck = ['input', 'button', 'a'];
              elementsToCheck.forEach(selector => {
                // Check if the element matches the selector or is the element itself
                const foundElement = element.querySelector(selector) || (element.tagName.toUpperCase() === selector.toUpperCase() && element);
                if (foundElement && !(foundElement as HTMLElement).hasAttribute('data-testid')) {
                  // Assign a generated data-testid if it doesn't already have one
                  (foundElement as HTMLElement).setAttribute('data-testid', generateTestId(foundElement as HTMLElement));
                }
              });
            };

            // Process the newly added node and its children
            processElement(htmlNode);

            // Also check if any of its descendants should be processed
            htmlNode.querySelectorAll('input, button, a').forEach((element) => {
              processElement(element as HTMLElement);
            });
          }
        });
      }
    });
  });

  // Start observing the document body for added child elements and their descendants
  observer.observe(document.body, { childList: true, subtree: true });

  // Optionally return the observer to allow disconnecting later
  return observer;
}

/**
 * Function to generate a data-testid based on the strategy provided
 * It uses the element's text content or placeholder and appends a DOM index path for uniqueness.
 */
function generateTestId(element: HTMLElement): string {
  let baseId = '';

  /**
   * Function to get text content from the element and its ancestors, avoiding duplicates.
   * It recursively checks the element and its ancestors up to `maxLevels` and sanitizes the text.
   */
  function getTextContentsUpToLevels(el: HTMLElement, maxLevels: number): string[] {
    const contents = [];
    const seenTexts = new Set<string>(); // Track added text to avoid duplicates
    let currentElement: HTMLElement | null = el;
    let level = 0;

    while (currentElement && level < maxLevels) {
      let textContent = '';

      // Collect text from the element itself or its placeholder
      if (currentElement instanceof HTMLInputElement && currentElement.placeholder && currentElement.placeholder.trim()) {
        textContent = currentElement.placeholder.trim();
      } else if (currentElement.textContent && currentElement.textContent.trim()) {
        textContent = currentElement.textContent.trim();
      }

      // Sanitize and truncate the text
      const sanitizedText = truncateText(sanitizeText(textContent), 20);

      // Check if the text is not already added and is not empty
      if (sanitizedText && !seenTexts.has(sanitizedText)) {
        contents.push(sanitizedText);
        seenTexts.add(sanitizedText);
      }

      currentElement = currentElement.parentElement;
      level++;
    }

    // Limit the number of text segments to a maximum of 2
    return contents.slice(0, 2);
  }

  // Attempt to get the baseId from text content or placeholder
  const textContents = getTextContentsUpToLevels(element, 2);

  if (textContents.length > 0) {
    // Combine text contents into baseId with dashes
    baseId = textContents.reverse().join('-');

    // Further truncate the baseId to a maximum total length
    baseId = truncateText(baseId, 30);  // This ensures no matter what, the final text is at most 30 characters
  } else {
    baseId = '';
  }

  // **limit on the number of ancestor levels for indexPath**:
  let indexPath = '';
  let currentElement = element;
  let level = 0;
  while (currentElement.parentElement && level < 3) { // Use 3 levels for uniqueness
    const index = Array.from(currentElement.parentElement.children).indexOf(currentElement);
    indexPath = `${index}-${indexPath}`;
    currentElement = currentElement.parentElement;
    level++;
  }
  indexPath = indexPath.slice(0, -1); // Remove the trailing '-'

  if (baseId) {
    baseId = `${baseId}-${indexPath}`;
  } else {
    // If no text content or placeholder is found, use the DOM path as a fallback
    let path = '';
    currentElement = element;
    while (currentElement.parentElement && currentElement !== document.body) {
      const siblingIndex = Array.from(currentElement.parentElement.children).indexOf(currentElement);
      path = `${currentElement.tagName.toLowerCase()}-${siblingIndex}/${path}`;
      currentElement = currentElement.parentElement;
    }
    baseId = `path-${path.toLowerCase().slice(0, -1)}`; // Remove the trailing '/'
  }

  return `auto-${baseId}`;
}

/**
 * Helper function to sanitize text by removing punctuation and replacing spaces with hyphens.
 * It ensures the text is clean and URL-safe.
 */
function sanitizeText(text: string): string {
  return text.replace(/[\.,-\/#!$%\^&\*;:{}=\-_`~()]/g,"") // Remove punctuation
             .replace(/\s+/g, '-').toLowerCase();           // Replace spaces with hyphens and convert to lowercase
}

/**
 * Helper function to truncate text to a maximum length.
 * It ensures the text stays within a reasonable length for use in a data-testid.
 */
function truncateText(text: string, maxLength: number): string {
  return text.length <= maxLength ? text : text.substring(0, maxLength);
}

/**
 * Utility functions for handling original design URLs in product metadata
 */

/**
 * Extract the original design URL from a product description
 * Looks for the pattern [ORIGINAL_DESIGN_URL:url] in the description
 */
export function extractOriginalDesignUrl(description: string): string | null {
  if (!description) return null;
  
  const match = description.match(/\[ORIGINAL_DESIGN_URL:([^\]]+)\]/);
  return match ? match[1] : null;
}

/**
 * Remove the original design URL metadata from a description for display purposes
 */
export function cleanProductDescription(description: string): string {
  if (!description) return '';
  
  return description.replace(/\s*\[ORIGINAL_DESIGN_URL:[^\]]+\]/, '').trim();
}

/**
 * Check if a product has an embedded original design URL
 */
export function hasOriginalDesignUrl(description: string): boolean {
  return extractOriginalDesignUrl(description) !== null;
}
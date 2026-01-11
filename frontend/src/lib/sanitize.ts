// import DOMPurify from 'dompurify';

// Sanitize HTML content to prevent XSS
export const sanitizeHtml = (html: string): string => {
  // Temporarily disable DOMPurify until package is installed
  return html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
             .replace(/<[^>]*>/g, (tag) => {
               // Only allow safe tags
               if (tag.match(/^<(b|i|em|strong|br)\b[^>]*>$/i)) {
                 return tag;
               }
               return '';
             });
};

// Sanitize text content
export const sanitizeText = (text: string): string => {
  if (typeof text !== 'string') return '';
  return text
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .trim()
    .slice(0, 1000); // Limit length
};

// Validate and sanitize file names
export const sanitizeFileName = (fileName: string): string => {
  if (typeof fileName !== 'string') return '';
  return fileName
    .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace special chars with underscore
    .slice(0, 255); // Limit length
};

// Validate URLs
export const isValidUrl = (url: string): boolean => {
  try {
    const urlObj = new URL(url);
    return ['http:', 'https:'].includes(urlObj.protocol);
  } catch {
    return false;
  }
};

// Sanitize user input for database queries
export const sanitizeInput = (input: any): string => {
  if (typeof input !== 'string') return '';
  return input
    .replace(/[<>'"&]/g, '') // Remove potentially dangerous characters
    .trim()
    .slice(0, 500);
};

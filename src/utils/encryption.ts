
// Simple encryption utility for client-side token protection
const ENCRYPTION_KEY = 'linkedin-posts-app-2024'; // In production, this should be from environment

export const encryptData = (data: string): string => {
  try {
    // Simple XOR encryption for client-side protection
    let encrypted = '';
    for (let i = 0; i < data.length; i++) {
      encrypted += String.fromCharCode(
        data.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length)
      );
    }
    return btoa(encrypted);
  } catch {
    return data; // Fallback to original if encryption fails
  }
};

export const decryptData = (encryptedData: string): string => {
  try {
    const data = atob(encryptedData);
    let decrypted = '';
    for (let i = 0; i < data.length; i++) {
      decrypted += String.fromCharCode(
        data.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length)
      );
    }
    return decrypted;
  } catch {
    return encryptedData; // Fallback to original if decryption fails
  }
};

export const sanitizeForDevTools = (obj: any): any => {
  if (typeof obj !== 'object' || obj === null) return obj;
  
  const sanitized = { ...obj };
  
  // Remove or mask sensitive fields
  const sensitiveFields = ['access_token', 'refresh_token', 'linkedin_post_id', 'member_id'];
  
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[PROTECTED]';
    }
  });
  
  return sanitized;
};

// Validation utility functions

// Email validation regex
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Phone number validation
export const isValidPhoneNumber = (phone: string): boolean => {
  // Allow formats: (123) 456-7890, 123-456-7890, 123.456.7890, 1234567890
  const phoneRegex = /^(\+\d{1,2}\s?)?(\(?\d{3}\)?[\s.-]?)?\d{3}[\s.-]?\d{4}$/;
  return phoneRegex.test(phone);
};

// Name validation - allow letters, spaces, hyphens, apostrophes
export const isValidName = (name: string): boolean => {
  if (name.trim().length < 2) return false; // Name should be at least 2 characters
  const nameRegex = /^[a-zA-Z\s\-']+$/;
  return nameRegex.test(name);
};

// Password validation - at least 8 characters, 1 uppercase, 1 lowercase, 1 number
export const isValidPassword = (password: string): boolean => {
  if (password.length < 8) return false;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  return hasUpperCase && hasLowerCase && hasNumbers;
};

// Validate that passwords match
export const doPasswordsMatch = (password: string, confirmPassword: string): boolean => {
  return password === confirmPassword;
};

// Format phone number for display
export const formatPhoneNumber = (phoneNumber: string): string => {
  // Remove all non-digits
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // Check if the input is of correct length
  if (cleaned.length < 10 || cleaned.length > 11) return phoneNumber;
  
  let formatted = '';
  if (cleaned.length === 11) {
    formatted = `+${cleaned.charAt(0)} (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  } else {
    formatted = `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  
  return formatted;
}; 
export function validatePassword(password: string): string {
  const minLength = password.length >= 8;
  const hasCapital = /[A-Z]/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password);
  const hasProblematicChars = /[('"`~,%_;)]/.test(password);

  if (!minLength) {
    return "Password must be at least 8 characters long";
  }
  if (!hasCapital) {
    return "Password must contain at least one capital letter";
  }
  if (!hasSpecialChar) {
    return "Password must contain at least one special character";
  }
  if (hasProblematicChars) {
    return "Password cannot contain these special characters [!@#$%^&*+\"'`()]";
  }
  return "";
}

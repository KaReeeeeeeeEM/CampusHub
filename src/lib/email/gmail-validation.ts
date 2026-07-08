export const gmailEmailPattern = /^[A-Z0-9._%+-]+@gmail\.com$/i;

export function isGmailAddress(email: string) {
  return gmailEmailPattern.test(email.trim());
}

export const gmailEmailMessage =
  "Use a Gmail address, for example yourname@gmail.com.";

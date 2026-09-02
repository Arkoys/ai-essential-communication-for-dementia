'use client';

// A basic anonymizer for the MVP.
// In a real production app, this would use a more robust NLP model (like Presidio) 
// to detect and redact PHI (Protected Health Information).

export function anonymize(text: string): string {
  let cleanText = text;

  // 1. Redact SSNs (e.g., 123-45-6789)
  cleanText = cleanText.replace(/\b\d{3}-\d{2}-\d{4}\b/g, "[REDACTED_SSN]");

  // 2. Redact Phone Numbers (e.g., (123) 456-7890, 123-456-7890)
  cleanText = cleanText.replace(/\b\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, "[REDACTED_PHONE]");

  // 3. Redact Emails
  cleanText = cleanText.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, "[REDACTED_EMAIL]");

  // 4. Redact Dates (e.g., MM/DD/YYYY, YYYY-MM-DD)
  cleanText = cleanText.replace(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g, "[REDACTED_DATE]");
  cleanText = cleanText.replace(/\b\d{4}-\d{1,2}-\d{1,2}\b/g, "[REDACTED_DATE]");

  // Note: Names and addresses are much harder to redact with simple regex.
  // We rely on the user warning for the MVP.
  
  return cleanText;
}

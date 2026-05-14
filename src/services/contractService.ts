export interface ContractValidationResult {
  approved: boolean;
  reason?: string;
  credits_required?: number;
}

export async function validatePrompt(prompt: string): Promise<ContractValidationResult> {
  const bannedWords = [
    "scam",
    "illegal",
    "fraud",
    "hate"
  ];

  const detected = bannedWords.find(word =>
    prompt.toLowerCase().includes(word)
  );

  if (detected) {
    return {
      approved: false,
      reason: `Blocked keyword: ${detected}`
    };
  }

  return {
    approved: true,
    credits_required: 10
  };
}
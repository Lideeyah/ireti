/**
 * Identity verification adapter.
 * Production: NIBSS BVN validation via the bank's existing identity provider.
 * Demo: format validation plus a simulated verification delay. The BVN value is
 * never stored — only the verification outcome.
 */
export interface IdentityVerificationService {
  verifyBvn(bvn: string): Promise<{ verified: boolean; reason?: string }>;
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const demoIdentityService: IdentityVerificationService = {
  async verifyBvn(bvn) {
    await delay(1400);
    if (!/^\d{11}$/.test(bvn)) return { verified: false, reason: "A BVN is an 11-digit number." };
    if (bvn === "00000000000") return { verified: false, reason: "The BVN could not be matched to an identity record." };
    return { verified: true };
  },
};

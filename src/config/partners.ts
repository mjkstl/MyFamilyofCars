export interface PartnerConfig {
  id: string;
  code: string;
  displayName: string;
  active: boolean;
  permittedCampaignMetadata: readonly string[];
}

export const PARTNERS: readonly PartnerConfig[] = [];

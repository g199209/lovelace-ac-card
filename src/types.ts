import { LovelaceCardConfig } from 'custom-card-helpers';

export interface AcCardConfig extends LovelaceCardConfig {
  type: string;
  entity: string;
  name?: string;
}

// keep editor.ts compiling without changes
export type BoilerplateCardConfig = AcCardConfig;

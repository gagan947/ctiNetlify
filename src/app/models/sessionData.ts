import { SubFeature } from "./projects";

export interface ProjectData {
  clientEnquryId: number;
  PhasesDeliverables: [];
  estimatedDate: string; // ISO string format for date
  estimated_time: number;
  finalCost: number;
  logoStyle: string | null;
  platform: string[];
  projectId: string;
  projectLogo: string | null;
  projectName: string;
  selectdFeature: SelectedFeature[];
  speed: string;
  totalCost: number;
  featuresCost: number;
  customisationCost: number;
  no_of_features: number;
  paymentPlan: string;
  installmentType: string;
}

export interface SelectedFeature {
  featuresName: string;
  estimated_time: number;
  subFeaturesListWithPrice: SubFeature[];
  totalSubFeaturedPrice: number;
}

import { SubFeature } from "./projects";

export interface ProjectData {
  clientEnquryId: number;
  phases_deliverables: [];
  estimatedDate: string; // ISO string format for date
  estimated_time: number;
  total_cost_delivery: number;
  logoStyle: string | null;
  platform: string[];
  projectId: string;
  projectLogo: string | null;
  projectName: string;
  selectdFeature: SelectedFeature[];
  speed: string;
  features_cost: number;
  featuresCost: number;
  customisationCost: number;
  no_of_features: number;
  paymentPlan: string;
  installmentType: string;
  final_cost_with_tax_discount: number;
}

export interface SelectedFeature {
  featuresName: string;
  estimated_time: number;
  subFeaturesListWithPrice: SubFeature[];
  totalSubFeaturedPrice: number;
}

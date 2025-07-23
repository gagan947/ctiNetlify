export interface ProjectResponse {
  success: boolean;
  status: number;
  message: string;
  data: Project[];
}

export interface Project {
  id: number;
  projectName: string;
  descriptions: string;
  contain: string[];
  projectImage: string;
  status: number;
  createdAt: string;
  updatedAt: string;
  subFeaturesCounts: number;
}


export interface SubFeature {
  customisationPrice: number;
  subFeaturesName: string;
  subFeaturedPrice: number;
}

export interface Feature {
  featuresName: string;
  totalSubFeaturedPrice: number;
  estimated_time: number;
  countSubFeaturesName: number;
  totalCustomisationPrice: number
  subFeaturesListWithPrice: SubFeature[];
}

export interface FeatureResponse {
  success: boolean;
  status: number;
  message: string;
  data: Feature[];
}
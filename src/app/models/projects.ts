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
  subFeaturesCount: number;
}


export interface SubFeature {
  id: number;
  estimated_time: any,
  subFeatureName: string
}

export interface Feature {
  id: number;
  featureName: string;
  subFeatures:SubFeature[];
  featureTime: any
}

export interface FeatureResponse {
  success: boolean;
  status: number;
  message: string;
  data: Feature[];
}
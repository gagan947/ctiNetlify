

export interface CommonFeatures {
    success: boolean;
    status: number;
    message: string;
    data: ALLFeatures[];
  }
  
  export interface ALLFeatures {
    id: number;
    featureName: string;
    subFeatures: SubFeature[];
 
  }
  
  export interface SubFeature {
    id: number;
    estimated_time: any,
    subFeaturesName: string
  }
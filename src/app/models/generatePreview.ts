export interface GenerateTemplateResponse {
    status: number;
    success: boolean;
    message: string;
    data: TemplateData;
    
  }
  
  export interface TemplateData {
    pages: TemplatePages;
    login_redirect: string;
    react_files: Record<string, ReactFileContent>;
    user_template_id: string;
  }
  
  export interface TemplatePages {
    [pageName: string]: PageContent;
  }
  
  export interface PageContent {
    html: string;
    css: string;
    js_keys: string[];
  }
  
  export interface ReactFileContent {
    jsx: string;
    css: string;
  }
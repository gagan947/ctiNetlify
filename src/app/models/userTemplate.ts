export interface GetUserTemplatesResponse {
    status: number;
    success: boolean;
    message: string;
    data: UserTemplate[];
    is_project_deployed: number;
    project_status: number;
    deployed_url: string | null;
    templateExists: boolean;
  }

  export interface UserTemplate {
    public_template_id: string;
    preview_html_css: string;
    react_code_file: string;
    react_build_url: string;
    react_build_status: number;
    is_selected: number;
  }
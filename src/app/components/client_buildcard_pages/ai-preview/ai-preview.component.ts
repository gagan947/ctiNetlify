import { Component } from '@angular/core';
import { ApiService } from '../../../services/api.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-ai-preview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ai-preview.component.html',
  styleUrl: './ai-preview.component.css'
})
export class AiPreviewComponent {
  pages: any[] = [];
  currentHtml: string = '';
  currentCss: string = '';
  currentJs: string = '';
  
  loading: boolean = false;
  error: string = '';

  constructor(private apiService: ApiService) {
    this.GetAiPreview();
  }

  GetAiPreview() {
    let formData = {
      
        "projectName": "Social Media App",
        "pages": [
          {
            "pageName": "Login Page",
            "description": "User login screen with email, password and login button.",
            "features": ["email input", "password input", "login button", "forgot password link"]
          },
          {
            "pageName": "Signup Page",
            "description": "Create account with name, email, password.",
            "features": ["full name input", "email input", "password input", "signup button"]
          },
          {
            "pageName": "Feed Page",
            "description": "Main feed where users scroll posts.",
            "features": ["post card", "like button", "comment button", "share button", "bottom navbar"]
          },
          {
            "pageName": "Chat Screen",
            "description": "User chat screen with message list and input box.",
            "features": ["message list", "send message box", "send button", "user header"]
          },
          {
            "pageName": "Profile Page",
            "description": "User profile with photo, bio and follower counts.",
            "features": ["profile picture", "cover photo", "bio", "followers count", "edit profile button"]
          }
        ],
        "style": {
          "theme": "modern clean UI",
          "colors": ["#4A90E2", "#FFFFFF", "#222222"]
        },
        "output": {
          "includeCSS": true,
          "includeJS": true,
          "multiPage": true
        }
      }
      
      this.apiService.postAPI<any, any>('api/user/generateCode', formData)
        .subscribe({
          next: (res: any) => {
            this.loading = false;
            this.pages = res.data;
    
            if (this.pages.length > 0) {
              this.loadPage(this.pages[0]);
            }
          },
          error: (err: any) => {
            this.loading = false;
            this.error = err.error.message;
          }
        });
    
    }

    loadPage(page: any) {
      this.currentHtml = page.html;
      this.currentCss = page.css;
      this.currentJs = page.js;
  
      this.injectCSS(page.css);
      this.runJS(page.js);
    }
  
    injectCSS(css: string) {
      const styleTag = document.getElementById('dynamic-ai-style');
      if (styleTag) {
        styleTag.innerHTML = css;
        return;
      }
  
      const style = document.createElement('style');
      style.id = 'dynamic-ai-style';
      style.innerHTML = css;
      document.head.appendChild(style);
    }
  
    runJS(jsCode: string) {
      const oldScript = document.getElementById('dynamic-ai-script');
      if (oldScript) oldScript.remove();
  
      const script = document.createElement('script');
      script.id = 'dynamic-ai-script';
      script.innerHTML = jsCode;
      
      document.body.appendChild(script);
    }


}

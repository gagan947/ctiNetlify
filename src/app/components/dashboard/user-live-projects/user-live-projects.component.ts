import { Component, Input, OnInit } from '@angular/core';
import { SidebarComponent } from "../../client_buildcard_pages/sidebar/sidebar.component";
import { Router } from '@angular/router';
import { NzMessageService } from 'ng-zorro-antd/message';
import { ApiService } from '../../../services/api.service';
import { CommonModule } from '@angular/common';
import { WorkspaceHeaderComponent } from "../../client_buildcard_pages/workspace-header/workspace-header.component";
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-user-live-projects',
  standalone: true,
  imports: [SidebarComponent, CommonModule, WorkspaceHeaderComponent],
  templateUrl: './user-live-projects.component.html',
  styleUrl: './user-live-projects.component.css'
})
export class UserLiveProjectsComponent implements OnInit {
  @Input() id: any;
  projectData: any;
  baseUrl = this.apiService.reactBuildURl;
  imagebaseUrl = this.apiService.imageUrl;
  projectFeatures: any = [];
  addedFeatures: any = [];
  safeUrl: SafeResourceUrl | null = null;

  constructor(
    private apiService: ApiService,
    private message: NzMessageService,
    private router: Router,
    private sanitizer: DomSanitizer
  ) { }

  ngOnInit(): void {
    sessionStorage.clear();
    this.getProjects();

  }

  getProjects() {
    this.apiService.postAPI('api/user/getClientProjectDetails', { inquiryId: this.id }).subscribe(
      (res: any) => {
        if (res.success) {
          this.projectData = res.data[0];
          if (this.projectData.deployed_url) {
            let url = this.projectData.deployed_url;
            if (!url.startsWith('http')) {
              url = 'https://' + url;
            }
            this.safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
          }
        } else {
          this.router.navigate(['/dashboard']);
          this.message.error(res.message);
        }
      },
      (err: any) => {
        this.message.error(err.message);
      }
    );


  }

}

import { Component, Input } from '@angular/core';
import { SidebarComponent } from "../../client_buildcard_pages/sidebar/sidebar.component";
import { Router } from '@angular/router';
import { NzMessageService } from 'ng-zorro-antd/message';
import { ApiService } from '../../../services/api.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-user-live-projects',
  standalone: true,
  imports: [SidebarComponent, CommonModule],
  templateUrl: './user-live-projects.component.html',
  styleUrl: './user-live-projects.component.css'
})
export class UserLiveProjectsComponent {
  @Input() id: any
  projectData: any;
  baseUrl = this.apiService.reactBuildURl;
  constructor(private apiService: ApiService, private message: NzMessageService, private router: Router) {
  }
  ngOnInit(): void {
    sessionStorage.clear();
    this.getProjects();

  }

  getProjects() {
    this.apiService.postAPI('api/user/getClientProjectDetails', { inquiryId: this.id }).subscribe(
      (res: any) => {
        if (res.success) {
          this.projectData = res.data[0];
          // sessionStorage.setItem('projectData', JSON.stringify(res.data));
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

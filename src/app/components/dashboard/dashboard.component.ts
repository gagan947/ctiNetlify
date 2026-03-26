import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { NzMessageService } from 'ng-zorro-antd/message';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from "../client_buildcard_pages/sidebar/sidebar.component";

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, CommonModule, SidebarComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent {
  allProjectsList: any[] = []
  orgProjectList: any[] = []
  estimatedDate: Date | undefined;
  status: number | null = null;
  activePlan = '';
  baseURl = this.apiService.reactBuildURl;
  constructor(private apiService: ApiService, private message: NzMessageService, private router: Router) {
  }
  ngOnInit(): void {
    sessionStorage.clear();
    this.getProjects();
    this.getUserSubscriptionPlan();
  }

  getProjects() {
    this.apiService.getApi<any>('api/user/fetchClientAllProjects').subscribe(
      (res) => {
        if (res.success) {
          this.allProjectsList = this.orgProjectList = res.data;
          this.allProjectsList = this.allProjectsList.map(item => {
            const activeStep = item.currentRoutes?.split("/")[1]?.replace("-", " ") || "";
            const activeIndex = this.steps.findIndex(step => step.routes.includes(activeStep));
            return { ...item, activeIndex };
          });
        }
      }
    );

  }

  getUserSubscriptionPlan() {
    this.apiService.getApi<any>(`api/user/getMySubscription`)
      .subscribe({
        next: (res) => {
          this.activePlan = res.planType
    
        },
        error: err => {
          // this.loading = false
        }
      });
  }

  Navigate(data: any) {
       if(data.project_deployed){
        this.router.navigate([`user-live-projects/${data.inquiryId}`]);
       }else{
         let projectData = {
           clientEnquryId: data.inquiryId,
           projectId: data.projectId,
           phases_deliverables: data.phases_deliverables,
           bellingDetails: data.billing_details,
           estimated_time: data.durations,
           final_cost_with_tax_discount: data.final_cost_with_tax_discount,
           platform: data.platforms,
           projectLogo: data.clientProjectLogo,
           selectdFeature: data.projectFeatures,
           speed: data.development_speed,
           total_cost_delivery: data.total_cost_delivery,
           paymentPlan: data.payment_plan == 'Installment' ? '2' : '1',
           installmentType: data.installment_type,
           features_cost: data.features_cost,
           no_of_features: data.no_of_features,
           projectName: data.projectName
         };

         sessionStorage.setItem('htmlCode', data.html_pages);
         sessionStorage.setItem('projectData', JSON.stringify(projectData));
         this.router.navigate(['/code-generator/', data.inquiryId], { state: { projectData } });

       }
         
  }

  discardProject(id: number) {
    this.apiService.getApi(`api/user/discardProject?id=${id}`).subscribe({
      next: (res: any) => {
        this.message.success(res.message);
        this.getProjects();
      },
      error: (err: any) => {
        this.message.error(err);
      }
    })
  }

  checkStatus(status: number): string {
    switch (status) {
      case 0:
        return 'Draft';
      case 1:
        return 'Live';
      case 2:
        return 'Expired';
      case 3:
        return 'Completed';
      default:
        return 'Draft';
    }
  }

  getStatusClass(status: number): string {
    switch (status) {
      case 0:
        return 'ct_yellow_badge_bg';
      case 1:
        return 'ct_green_badge_bg';
      case 2:
        return 'ct_blue_badge_bg';
      case 3:
        return 'Completed';
      default:
        return 'Draft';
    }
  }

  steps = [
    { id: "list_1", icon: "🏗️", routes: ["make it-mine"] },
    { id: "list_2", icon: "✏️", routes: ["refine idea",] },
    { id: "list_3", icon: "💡", routes: ["plan delivery",] },
    { id: "list_4", icon: "📝", routes: ["billing details",] },
    { id: "list_5", icon: "💰", routes: ["payment plan",] },
    // { id: "list_6", icon: "💳", routes: ["payment option"] }
  ];


  filterByStatus(status: number | null) {
    this.status = status;
    this.applyFilters();
  }

  applyFilters() {
    this.allProjectsList = this.orgProjectList.filter((item: {
      projectStatus: number
    }) => {
      const matchStatus =
        this.status == null || item.projectStatus === this.status;
      return matchStatus
    }).map(item => {
      const activeStep = item.currentRoutes?.split("/")[1]?.replace("-", " ") || "";
      const activeIndex = this.steps.findIndex(step => step.routes.includes(activeStep));
      return { ...item, activeIndex };
    });
  }
}

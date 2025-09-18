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
  estimatedDate: Date | undefined;
  constructor(private apiService: ApiService, private message: NzMessageService, private router: Router) {
  }
  ngOnInit(): void {
    this.getProjects();
  }

  getProjects() {
    this.apiService.getApi<any>('api/user/fetchClientAllProjects').subscribe(
      (res) => {
        if (res.success) {
          this.allProjectsList = res.data;
          this.allProjectsList = this.allProjectsList.map(item => {
            const activeStep = item.currentRoutes?.split("/")[1]?.replace("-", " ") || "";
            console.log(activeStep);
            const activeIndex = this.steps.findIndex(step => step.routes.includes(activeStep));
            console.log(activeIndex);
            return { ...item, activeIndex };
          });
        }
      }
    );
  
  }

  Navigate(url: string, id: number) {

    const today = new Date();
    this.estimatedDate = new Date(today);
    this.apiService.getApi(`api/user/fetchClientInquries?inquiryId=${id}`).subscribe(
      {
        next: (res: any) => {
          if (res.success) {
            const data = res.data
            let projectData = {
              clientEnquryId: id,
              PhasesDeliverables: data.PhasesAndDeliverables,
              bellingDetails: data.bellingDetails,
              estimated_time: data.durations,
              finalCost: data.gstTotalCost ? data.gstTotalCost : data.totalCost,
              logoStyle: data.logoSize,
              platform: data.platforms,
              projectLogo: data.clientProjectLogo,
              projectName: data.clientProjectName,
              selectdFeature: data.projectFeatures,
              speed: data.developmentSpeed,
              totalCost: data.totalCost,
              paymentPlan: data.paymentPlan == 'Installment' ? '2' : '1',
              installmentType: data.installmentType,
              featuresCost: data.featuresPrice,
              customisationCost: data.totalCost - data.featuresPrice,
              estimatedDate: this.estimatedDate?.setDate(today.getDate() + data.durations * 7)
            };
            sessionStorage.setItem('htmlCode', data.html_pages);
            sessionStorage.setItem('projectData', JSON.stringify(projectData));
            this.router.navigate([url]);
          }
        }
      }
    )
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
        return 'Paid';
      case 2:
        return 'Running';
      case 4:
        return 'Completed';
      default:
        return 'Draft';
    }
  }

  steps = [
    { id: "list_1", icon: "🏗️", routes: ["make it-mine"] },
    { id: "list_2", icon: "✏️", routes: ["refine idea",] },
    { id: "list_3", icon: "💡", routes: ["plan delivery", ] },
    { id: "list_4", icon: "📝", routes: ["billing details", ] },
    { id: "list_5", icon: "💳", routes: ["payment plan", ] },
    { id: "list_6", icon: "💳", routes: ["payment option"] }
  ];
  
 
  
 
}

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
    this.apiService.getApi<any>('api/user/fetchClientAllProjects').subscribe(
      (res) => (res.success ? (this.allProjectsList = res.data) : null)
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
            sessionStorage.setItem('projectData', JSON.stringify(projectData));
            this.router.navigate([url]);
          }
        }
      }
    )
  }

  checkStatus(url: string): string {
    switch (url) {
      case '/payment-plan':
        return 'Ready';
      default:
        return 'Draft';
    }
  }
}

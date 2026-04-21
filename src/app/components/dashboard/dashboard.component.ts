import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NzMessageService } from 'ng-zorro-antd/message';
import { WorkspaceHeaderComponent } from '../client_buildcard_pages/workspace-header/workspace-header.component';
import { ApiService } from '../../services/api.service';
import { SubcriptionService } from '../../services/subcription.service';

interface DashboardProject {
  inquiryId: string;
  projectId: string | null;
  projectName: string;
  currentRoutes: string | null;
  projectStatus: number;
  clientProjectLogo: string | null;
  projectFeatures: any;
  project_deployed: number;
  deployed_url: string | null;
  build_status: number;
  countsTowardsPlanLimit: boolean;
  createdAt: string;
  phases_deliverables?: any;
  billing_details?: any;
  durations?: any;
  final_cost_with_tax_discount?: any;
  platforms?: any;
  development_speed?: any;
  total_cost_delivery?: any;
  payment_plan?: string;
  installment_type?: any;
  features_cost?: any;
  no_of_features?: any;
  html_pages?: string;
}

type DashboardFilter = 'all' | 'draft' | 'live' | 'expired';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, CommonModule, WorkspaceHeaderComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent {
  allProjectsList: DashboardProject[] = [];
  originalProjectsList: DashboardProject[] = [];
  activePlan = '';
  activeFilter: DashboardFilter = 'all';

  readonly filters: Array<{ key: DashboardFilter; label: string }> = [
    { key: 'all', label: 'All' },
    { key: 'draft', label: 'Draft' },
    { key: 'live', label: 'Live' },
  ];

  constructor(
    private apiService: ApiService,
    private message: NzMessageService,
    private router: Router,
    private subscriptionService: SubcriptionService
  ) { }

  ngOnInit(): void {
    sessionStorage.clear();
    this.getProjects();
    this.subscriptionService.loadSubscription();
    this.getUserSubscriptionPlan();
  }

  getProjects() {
    this.apiService.getApi<any>('api/user/fetchClientAllProjects').subscribe({
      next: (res) => {
        if (!res?.success) {
          this.allProjectsList = [];
          this.originalProjectsList = [];
          return;
        }

        this.originalProjectsList = res.data || [];
        this.applyFilters();
      },
      error: () => {
        this.message.error('Unable to load your projects right now.');
        this.allProjectsList = [];
        this.originalProjectsList = [];
      }
    });
  }

  getUserSubscriptionPlan() {
    this.subscriptionService.subscription$.subscribe((res: any) => {
      if (!res) {
        return;
      }

      this.activePlan = String(res.planType || '');
    });
  }

  navigate(project: DashboardProject) {
    if (project.project_deployed) {
      this.router.navigate([`user-live-projects/${project.inquiryId}`]);
      return;
    }

    const projectData = {
      clientEnquryId: project.inquiryId,
      projectId: project.projectId,
      phases_deliverables: project.phases_deliverables,
      bellingDetails: project.billing_details,
      estimated_time: project.durations,
      final_cost_with_tax_discount: project.final_cost_with_tax_discount,
      platform: project.platforms,
      projectLogo: project.clientProjectLogo,
      selectdFeature: project.projectFeatures,
      speed: project.development_speed,
      total_cost_delivery: project.total_cost_delivery,
      paymentPlan: project.payment_plan === 'Installment' ? '2' : '1',
      installmentType: project.installment_type,
      features_cost: project.features_cost,
      no_of_features: project.no_of_features,
      projectName: project.projectName
    };
    this.apiService.postAPI('api/user/projectRemovedHeader', { inquiryId: project.projectId }).subscribe()
    sessionStorage.setItem('htmlCode', project.html_pages || '');
    sessionStorage.setItem('projectData', JSON.stringify(projectData));
    this.router.navigate(['/code-generator/', project.inquiryId], { state: { projectData } });
  }

  discardProject(inquiryId: string) {
    this.apiService.getApi(`api/user/discardProject?id=${inquiryId}`).subscribe({
      next: (res: any) => {
        this.message.success(res.message || 'Project removed successfully.');
        this.getProjects();
      },
      error: () => {
        this.message.error('Unable to remove this project right now.');
      }
    });
  }

  setFilter(filter: DashboardFilter) {
    this.activeFilter = filter;
    this.applyFilters();
  }

  applyFilters() {
    this.allProjectsList = this.originalProjectsList.filter((project) => {
      if (this.activeFilter === 'all') {
        return true;
      }

      return this.getProjectStatusKey(project) === this.activeFilter;
    });
  }

  getProjectStatusLabel(project: DashboardProject): string {
    switch (this.getProjectStatusKey(project)) {
      case 'live':
        return 'Live';
      case 'expired':
        return 'Expired';
      case 'draft':
      default:
        return 'Draft';
    }
  }

  getProjectStatusKey(project: DashboardProject): DashboardFilter {
    if (project.project_deployed === 1) {
      return 'live';
    }

    if (project.projectStatus === 2) {
      return 'expired';
    }

    return 'draft';
  }

  getStatusClass(project: DashboardProject): string {
    switch (this.getProjectStatusKey(project)) {
      case 'live':
        return 'ct_dashboard_status_badge--live';
      case 'expired':
        return 'ct_dashboard_status_badge--expired';
      case 'draft':
      default:
        return 'ct_dashboard_status_badge--draft';
    }
  }

  getActionLabel(project: DashboardProject): string {
    return project.project_deployed === 1 ? 'View Details' : 'Continue Building';
  }

  getDeployedUrlLabel(project: DashboardProject): string {
    if (!project.deployed_url) {
      return 'Not published yet';
    }

    return project.deployed_url.replace(/^https?:\/\//, '');
  }

  getFilterCount(filter: DashboardFilter): number {
    if (filter === 'all') {
      return this.originalProjectsList.length;
    }

    return this.originalProjectsList.filter((project) => this.getProjectStatusKey(project) === filter).length;
  }

  trackByInquiryId(_index: number, project: DashboardProject): string {
    return project.inquiryId;
  }
}

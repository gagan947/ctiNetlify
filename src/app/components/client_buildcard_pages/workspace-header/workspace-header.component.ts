import { Component, ElementRef, EventEmitter, HostListener, Input, Output, ViewChild } from '@angular/core';
import { ApiService } from '../../../services/api.service';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SubscriptionModalService } from '../../../services/subscription-modal.service';
import { SubcriptionService } from '../../../services/subcription.service';
import { CommonModule } from '@angular/common';

interface UserProjectTab {
  inquiryId: string;
  projectId: number;
  projectName: string;
  currentRoutes?: string | null;
  projectStatus?: number;
  project_deployed?: number;
  createdAt?: string;
}

interface UserProfileSummary {
  email?: string;
  name?: string;
  companyName?: string | null;
  profile_image?: string | null;
}

@Component({
  selector: 'app-workspace-header',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './workspace-header.component.html',
  styleUrl: './workspace-header.component.css'
})
export class WorkspaceHeaderComponent {
  @Input() fullScreen = false;
  @Input() selectedDeviceType = '<i class="fa-solid fa-display"></i>';
  @Input() showPreviewControls = false;
  @Output() fullScreenToggle = new EventEmitter<void>();
  @Output() deviceTypeChange = new EventEmitter<'desktop' | 'tablet' | 'mobile'>();
  allProjectsList: UserProjectTab[] = [];
  selectedProjectId = '';
  profileImage = '';
  userEmail = 'creativethought.ai@gmail.com';
  userName = 'Creative';
  companyName = "Creative's Project";
  isProfileMenuOpen = false;
  @ViewChild('profileMenu') profileMenu?: ElementRef<HTMLDivElement>;
  subsCriptionData: any;
  constructor(
    private apiService: ApiService,
    private router: Router,
    private subscriptionModalService: SubscriptionModalService,
    private subscriptionService: SubcriptionService,
    private route: ActivatedRoute
  ) { }
  ngOnInit(): void {
    this.subscriptionService.subscription$.subscribe((subscription) => {
      this.subsCriptionData = subscription;
    });
    this.loadUserSummary();
    this.getUserProfile();
    this.getProjects();
  }

  get profileImageUrl(): string {
    return this.profileImage ? `${this.apiService.imageUrl}${this.profileImage}` : '';
  }

  get avatarInitial(): string {
    return (this.userName?.trim()?.charAt(0) || 'C').toUpperCase();
  }

  getProjects(): void {
    this.apiService.getApi<any>('api/user/fetchClientAllProjects').subscribe(
      (res) => {
        if (res.success) {
          this.allProjectsList = (res.data || []) as UserProjectTab[];

          if (!this.selectedProjectId && this.allProjectsList.length > 0) {
            this.selectedProjectId = this.allProjectsList[0].inquiryId;
          }

          const inquiryId = this.route.snapshot.paramMap.get('id');
          if (inquiryId) {
            this.selectedProjectId = inquiryId;
          }
        }
      }
    );
  }

  private loadUserSummary(): void {
    const rawUser = localStorage.getItem('userDetailCTI');
    if (!rawUser || rawUser === 'undefined') {
      return;
    }

    try {
      this.applyUserSummary(JSON.parse(rawUser));
    } catch {
      // Keep defaults when stored user data cannot be parsed.
    }
  }

  private applyUserSummary(user?: UserProfileSummary): void {
    this.userEmail = user?.email || this.userEmail;
    this.userName = user?.name || this.userName;
    this.companyName = user?.companyName?.trim() || this.userName || this.companyName;
    this.profileImage = user?.profile_image || this.profileImage;
  }

  getUserProfile(): void {
    this.apiService.getApi<any>('api/user/getUserProfile').subscribe({
      next: (res) => {
        const user = res?.data?.[0] as UserProfileSummary | undefined;
        if (!res?.success || !user) {
          return;
        }

        this.applyUserSummary(user);
        localStorage.setItem('userDetailCTI', JSON.stringify(user));
      }
    });
  }
  selectProjectTab(project: UserProjectTab): void {
    this.selectedProjectId = project.inquiryId;
    sessionStorage.setItem('projectData', JSON.stringify({ projectName: project.projectName, clientEnquryId: project.inquiryId }));
    this.router.navigate(['/code-generator', project.inquiryId]);
  }
  LogOut() {
    localStorage.clear()
    this.router.navigate(['/'])
  }

  toggleProfileMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.isProfileMenuOpen = !this.isProfileMenuOpen;
  }

  closeProfileMenu(): void {
    this.isProfileMenuOpen = false;
  }

  openSubscriptionModal(): void {
    this.subscriptionModalService.open();
  }

  openBuyMoreCreditsModal(): void {
    this.subscriptionModalService.openBuyMoreCreditsModal();
  }

  openUserPlansModal(): void {
    this.closeProfileMenu();
    this.subscriptionModalService.openUserPlansModal();
  }

  handleFullScreenToggle(): void {
    this.fullScreenToggle.emit();
  }

  handleDeviceTypeChange(deviceType: 'desktop' | 'tablet' | 'mobile'): void {
    this.deviceTypeChange.emit(deviceType);
  }

  removeProjectFromTab(projectId: string): void {
    this.allProjectsList = this.allProjectsList.filter((project) => project.inquiryId !== projectId);
  }

  @HostListener('document:click', ['$event'])
  handleDocumentClick(event: MouseEvent): void {
    const target = event.target as Node | null;
    if (!this.isProfileMenuOpen || !target) {
      return;
    }

    if (this.profileMenu?.nativeElement.contains(target)) {
      return;
    }
    this.closeProfileMenu();
  }
}

import { Component, ElementRef, EventEmitter, HostListener, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { ApiService } from '../../../services/api.service';
import { ActivatedRoute, NavigationEnd, Router, RouterLink } from '@angular/router';
import { SubscriptionModalService } from '../../../services/subscription-modal.service';
import { SubcriptionService } from '../../../services/subcription.service';
import { CommonModule } from '@angular/common';
import { Subscription, filter } from 'rxjs';

interface UserProjectTab {
  inquiryId: string;
  projectId: number;
  projectName: string;
  currentRoutes?: string | null;
  projectStatus?: number;
  project_deployed?: number;
  createdAt?: string;
  is_header_available?: number;
  isPending?: boolean;
}

interface UserProfileSummary {
  email?: string;
  name?: string;
  companyName?: string | null;
  profile_image?: string | null;
}

interface PendingWorkspaceProjectTab {
  inquiryId: string;
  projectId?: string;
  projectName: string;
}

@Component({
  selector: 'app-workspace-header',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './workspace-header.component.html',
  styleUrl: './workspace-header.component.css'
})
export class WorkspaceHeaderComponent implements OnInit, OnDestroy {
  private readonly pendingWorkspaceTabStorageKey = 'pendingWorkspaceProjectTab';
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
  private routeSubscription?: Subscription;
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
    this.syncSelectedProjectFromRoute();
    this.routeSubscription = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => {
        this.syncSelectedProjectFromRoute();
        this.syncPendingWorkspaceTab();
      });
  }

  ngOnDestroy(): void {
    this.routeSubscription?.unsubscribe();
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
          this.allProjectsList = (res.data || []).filter((project: UserProjectTab) => project.is_header_available === 1);
          this.syncPendingWorkspaceTab();
          this.syncSelectedProjectFromRoute();
        }
      }
    );
  }

  private syncSelectedProjectFromRoute(): void {
    const inquiryId =
      this.route.snapshot.paramMap.get('id') ||
      this.route.snapshot.queryParamMap.get('publicEnquiryId') || '';

    this.selectedProjectId = inquiryId;
  }

  private syncPendingWorkspaceTab(): void {
    const pendingTab = this.getPendingWorkspaceTab();
    if (!pendingTab?.inquiryId) {
      return;
    }

    const existingSavedProject = this.allProjectsList.find(
      (project) => project.inquiryId === pendingTab.inquiryId && !project.isPending
    );
    if (existingSavedProject) {
      this.clearPendingWorkspaceTab();
      return;
    }

    const existingPendingProject = this.allProjectsList.find(
      (project) => project.inquiryId === pendingTab.inquiryId && project.isPending
    );
    if (existingPendingProject) {
      return;
    }

    this.allProjectsList = [
      {
        inquiryId: pendingTab.inquiryId,
        projectId: Number(pendingTab.projectId || 0),
        projectName: pendingTab.projectName || 'New Project',
        is_header_available: 1,
        isPending: true
      },
      ...this.allProjectsList
    ];
  }

  private getPendingWorkspaceTab(): PendingWorkspaceProjectTab | null {
    const rawPendingTab = sessionStorage.getItem(this.pendingWorkspaceTabStorageKey);
    if (!rawPendingTab) {
      return null;
    }

    try {
      return JSON.parse(rawPendingTab) as PendingWorkspaceProjectTab;
    } catch {
      this.clearPendingWorkspaceTab();
      return null;
    }
  }

  private clearPendingWorkspaceTab(): void {
    sessionStorage.removeItem(this.pendingWorkspaceTabStorageKey);
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
    this.apiService.deleteConversationID();
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
    this.apiService.postAPI('api/user/projectRemovedHeader', { inquiryId: projectId }).subscribe((res: any) => {
      if (res.success) {
        const currentIndex = this.allProjectsList.findIndex((project) => project.inquiryId === projectId);
        if (currentIndex === -1) {
          return;
        }

        const isClosingActiveTab = this.selectedProjectId === projectId;
        const nextActiveProject =
          this.allProjectsList[currentIndex + 1] ||
          this.allProjectsList[currentIndex - 1] ||
          null;

        this.allProjectsList = this.allProjectsList.filter((project) => project.inquiryId !== projectId);

        if (this.getPendingWorkspaceTab()?.inquiryId === projectId) {
          this.clearPendingWorkspaceTab();
        }

        if (!isClosingActiveTab) {
          return;
        }

        if (nextActiveProject?.inquiryId) {
          this.selectedProjectId = nextActiveProject.inquiryId;
          this.router.navigate(['/code-generator', nextActiveProject.inquiryId]);
          return;
        }

        this.selectedProjectId = '';
        this.router.navigate(['/main']);
      }
    });
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

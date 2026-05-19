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
  @Input() showPrimaryHeaderAction = false;
  @Input() primaryHeaderActionLabel = 'Deploy to Production';
  @Input() primaryHeaderActionIconClass = 'fa-solid fa-rocket';
  @Input() showSecondaryHeaderAction = false;
  @Input() secondaryHeaderActionLabel = 'Download Code';
  @Input() secondaryHeaderActionIconClass = 'fa-solid fa-download';
  @Output() fullScreenToggle = new EventEmitter<void>();
  @Output() deviceTypeChange = new EventEmitter<'desktop' | 'tablet' | 'mobile'>();
  @Output() primaryHeaderActionClick = new EventEmitter<void>();
  @Output() secondaryHeaderActionClick = new EventEmitter<void>();
  allProjectsList: UserProjectTab[] = [];
  selectedProjectId = '';
  profileImage = '';
  userEmail = 'creativethought.ai@gmail.com';
  userName = 'Creative';
  companyName = "Creative's Project";
  isProfileMenuOpen = false;
  private routeSubscription?: Subscription;
  @ViewChild('profileMenu') profileMenu?: ElementRef<HTMLDivElement>;
  @ViewChild('tabsScroller') tabsScroller?: ElementRef<HTMLDivElement>;
  subsCriptionData: any;
  canScrollTabsLeft = false;
  canScrollTabsRight = false;
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
        this.queueTabOverflowCheck();
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
          this.queueTabOverflowCheck();
          this.queueActiveTabIntoView();
        }
      }
    );
  }

  private syncSelectedProjectFromRoute(): void {
    const inquiryId =
      this.route.snapshot.paramMap.get('id') ||
      this.route.snapshot.queryParamMap.get('publicEnquiryId') || '';

    this.selectedProjectId = inquiryId;
    this.queueActiveTabIntoView();
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
    this.queueTabOverflowCheck();
    this.queueActiveTabIntoView();
  }
  LogOut() {
    localStorage.clear()
    sessionStorage.clear()
    this.router.navigate(['/'])
  }

  openNewTab(): void {
    this.apiService.resetWorkspaceChatState();
    this.selectedProjectId = '';
    this.router.navigate(['/main']);
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

  handlePrimaryHeaderActionClick(): void {
    this.primaryHeaderActionClick.emit();
  }

  handleSecondaryHeaderActionClick(): void {
    this.secondaryHeaderActionClick.emit();
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
          this.queueActiveTabIntoView();
          return;
        }

        this.selectedProjectId = '';
        this.router.navigate(['/main']);
        this.queueTabOverflowCheck();
      }
    });
  }

  scrollTabs(direction: 'left' | 'right'): void {
    const scroller = this.tabsScroller?.nativeElement;
    if (!scroller) {
      return;
    }

    const scrollAmount = Math.max(240, Math.floor(scroller.clientWidth * 0.6));
    scroller.scrollBy({
      left: direction === 'right' ? scrollAmount : -scrollAmount,
      behavior: 'smooth'
    });
  }

  updateTabOverflowState(): void {
    const scroller = this.tabsScroller?.nativeElement;
    if (!scroller) {
      this.canScrollTabsLeft = false;
      this.canScrollTabsRight = false;
      return;
    }

    const maxScrollLeft = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
    this.canScrollTabsLeft = scroller.scrollLeft > 2;
    this.canScrollTabsRight = scroller.scrollLeft < maxScrollLeft - 2;
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

  @HostListener('window:resize')
  handleWindowResize(): void {
    this.queueTabOverflowCheck();
  }

  private queueTabOverflowCheck(): void {
    setTimeout(() => this.updateTabOverflowState(), 0);
  }

  private queueActiveTabIntoView(): void {
    setTimeout(() => this.scrollActiveTabIntoView(), 0);
  }

  private scrollActiveTabIntoView(): void {
    const scroller = this.tabsScroller?.nativeElement;
    if (!scroller || !this.selectedProjectId) {
      return;
    }

    const activeTab = scroller.querySelector('.main-ai-topbar__tab--active') as HTMLElement | null;
    if (!activeTab) {
      return;
    }

    const tabLeft = activeTab.offsetLeft;
    const tabRight = tabLeft + activeTab.offsetWidth;
    const visibleLeft = scroller.scrollLeft;
    const visibleRight = visibleLeft + scroller.clientWidth;

    if (tabLeft >= visibleLeft && tabRight <= visibleRight) {
      return;
    }

    const targetLeft = tabLeft - Math.max(24, (scroller.clientWidth - activeTab.offsetWidth) / 2);
    scroller.scrollTo({
      left: Math.max(0, targetLeft),
      behavior: 'smooth'
    });
    this.queueTabOverflowCheck();
  }
}

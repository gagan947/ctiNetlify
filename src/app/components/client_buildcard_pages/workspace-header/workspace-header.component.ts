import { Component, ElementRef, EventEmitter, HostListener, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { ApiService } from '../../../services/api.service';
import { ActivatedRoute, NavigationEnd, Router, RouterLink } from '@angular/router';
import { ProjectGenerationTabStateService } from '../../../services/project-generation-tab-state.service';
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
  isGenerating?: boolean;
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
export class WorkspaceHeaderComponent implements OnInit, OnDestroy {
  @Input() fullScreen = false;
  @Input() selectedDeviceType = '<i class="fa-solid fa-display"></i>';
  @Input() showPreviewControls = false;
  @Input() showPrimaryHeaderAction = false;
  @Input() primaryHeaderActionLabel = 'Deploy';
  @Input() primaryHeaderActionIconClass = 'fa-solid fa-rocket';
  @Input() showSecondaryHeaderAction = false;
  @Input() secondaryHeaderActionLabel = 'Code';
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
  private generationTabsSubscription?: Subscription;
  private backendProjectsList: UserProjectTab[] = [];
  @ViewChild('profileMenu') profileMenu?: ElementRef<HTMLDivElement>;
  @ViewChild('tabsScroller') tabsScroller?: ElementRef<HTMLDivElement>;
  subsCriptionData: any;
  canScrollTabsLeft = false;
  canScrollTabsRight = false;
  constructor(
    private apiService: ApiService,
    private projectGenerationTabState: ProjectGenerationTabStateService,
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
    this.generationTabsSubscription = this.projectGenerationTabState.state$.subscribe(() => {
      this.rebuildProjectsList();
      this.queueTabOverflowCheck();
      this.queueActiveTabIntoView();
    });
    this.routeSubscription = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => {
        this.syncSelectedProjectFromRoute();
        this.queueTabOverflowCheck();
      });
  }

  ngOnDestroy(): void {
    this.routeSubscription?.unsubscribe();
    this.generationTabsSubscription?.unsubscribe();
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
          this.backendProjectsList = (res.data || []).filter((project: UserProjectTab) => project.is_header_available === 1);
          this.rebuildProjectsList();
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
    this.projectGenerationTabState.setActiveInquiryId(inquiryId || null);
    this.queueActiveTabIntoView();
  }

  private rebuildProjectsList(): void {
    const backendInquiryIds = new Set(this.backendProjectsList.map((project) => project.inquiryId));
    const generatedProjects = this.projectGenerationTabState
      .getAllTabs()
      .filter((tab) => !backendInquiryIds.has(tab.inquiryId))
      .map((tab) => ({
        inquiryId: tab.inquiryId,
        projectId: Number(tab.projectId || 0),
        projectName: tab.projectName || 'New Project',
        is_header_available: 1,
        isGenerating: true
      }));

    this.allProjectsList = [...generatedProjects, ...this.backendProjectsList];
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
    this.projectGenerationTabState.setActiveInquiryId(project.inquiryId);
    const generatedProjectState = this.projectGenerationTabState.getTabState(project.inquiryId);
    const projectData = generatedProjectState?.projectData || {
      projectName: project.projectName,
      projectId: project.projectId,
      clientEnquryId: project.inquiryId
    };
    sessionStorage.setItem('projectData', JSON.stringify(projectData));
    this.apiService.deleteConversationID();
    this.router.navigate(['/code-generator', project.inquiryId]);
    this.queueTabOverflowCheck();
    this.queueActiveTabIntoView();
  }
  LogOut() {
    this.projectGenerationTabState.clearAll();
    localStorage.clear()
    sessionStorage.clear()
    this.router.navigate(['/'])
  }

  openNewTab(): void {
    this.apiService.resetWorkspaceChatState();
    this.projectGenerationTabState.setActiveInquiryId(null);
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
    const isGeneratedOnlyTab = !this.backendProjectsList.some((project) => project.inquiryId === projectId);
    if (isGeneratedOnlyTab) {
      this.handleRemovedLocalOnlyTab(projectId);
      return;
    }

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

        this.backendProjectsList = this.backendProjectsList.filter((project) => project.inquiryId !== projectId);
        this.allProjectsList = this.allProjectsList.filter((project) => project.inquiryId !== projectId);
        this.projectGenerationTabState.clearTab(projectId);

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

  private handleRemovedLocalOnlyTab(projectId: string): void {
    const currentIndex = this.allProjectsList.findIndex((project) => project.inquiryId === projectId);
    if (currentIndex === -1) {
      return;
    }

    const isClosingActiveTab = this.selectedProjectId === projectId;
    const nextActiveProject =
      this.allProjectsList[currentIndex + 1] ||
      this.allProjectsList[currentIndex - 1] ||
      null;

    this.projectGenerationTabState.clearTab(projectId);

    if (!isClosingActiveTab) {
      return;
    }

    if (nextActiveProject?.inquiryId) {
      this.selectedProjectId = nextActiveProject.inquiryId;
      this.projectGenerationTabState.setActiveInquiryId(nextActiveProject.inquiryId);
      this.router.navigate(['/code-generator', nextActiveProject.inquiryId]);
      this.queueActiveTabIntoView();
      return;
    }

    this.selectedProjectId = '';
    this.projectGenerationTabState.setActiveInquiryId(null);
    this.router.navigate(['/main']);
    this.queueTabOverflowCheck();
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

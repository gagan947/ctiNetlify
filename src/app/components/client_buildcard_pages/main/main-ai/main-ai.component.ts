import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MainAiChatbotComponent } from '../main-ai-chatbot/main-ai-chatbot.component';
import { ApiService } from '../../../../services/api.service';
import { SubcriptionPageComponent } from "../../subcription-page/subcription-page.component";

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
  selector: 'app-main-ai',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MainAiChatbotComponent, SubcriptionPageComponent],
  templateUrl: './main-ai.component.html',
  styleUrl: './main-ai.component.css'
})
export class MainAiComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('promptInput') promptInput?: ElementRef<HTMLTextAreaElement>;
  @ViewChild('profileMenu') profileMenu?: ElementRef<HTMLDivElement>;

  promptIdeas = [
    'What can I ask you to do?',
    'Which one of my projects is performing the best?',
    'What projects should I be concerned about right now?'
  ];

  placeholderSuggestions = [
    'Build a SaaS admin dashboard with analytics',
    'Create a clean food delivery app flow',
    'Generate an e-commerce website for a fashion brand',
    'Build a portfolio website for a photographer',
    'Design a dashboard for a project management tool'
  ];

  activePlaceholder = '';
  promptText = '';
  isChatMode = false;
  submittedPrompt = '';
  isProfileMenuOpen = false;
  allProjectsList: UserProjectTab[] = [];
  selectedProjectId = '';
  userEmail = 'creativethought.ai@gmail.com';
  userName = 'Creative';
  companyName = "Creative's Project";
  profileImage = '';
  private placeholderTimer: ReturnType<typeof setTimeout> | null = null;
  private activePlaceholderIndex = 0;
  showModal: boolean = false;
  constructor(private apiService: ApiService, private router: Router) { }

  ngOnInit(): void {
    this.loadUserSummary();
    this.getUserProfile();
    this.getProjects();
    this.playPlaceholderTypewriter();
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.promptInput?.nativeElement.focus(), 0);
  }

  ngOnDestroy(): void {
    if (this.placeholderTimer) {
      clearTimeout(this.placeholderTimer);
      this.placeholderTimer = null;
    }
  }

  handlePromptKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.submitPrompt();
    }
  }

  submitPrompt(): void {
    const prompt = this.promptText.trim().replace(/\s+/g, ' ');
    if (!prompt) {
      return;
    }

    this.isChatMode = true;
    this.submittedPrompt = prompt;
    this.promptText = '';
  }

  usePromptIdea(idea: string): void {
    this.promptText = idea;
    setTimeout(() => this.promptInput?.nativeElement.focus(), 0);
  }

  toggleProfileMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.isProfileMenuOpen = !this.isProfileMenuOpen;
  }

  closeProfileMenu(): void {
    this.isProfileMenuOpen = false;
  }

  selectProjectTab(project: UserProjectTab): void {
    this.selectedProjectId = project.inquiryId;
  }

  get avatarInitial(): string {
    return (this.userName?.trim()?.charAt(0) || 'C').toUpperCase();
  }

  get profileImageUrl(): string {
    return this.profileImage ? `${this.apiService.imageUrl}${this.profileImage}` : '';
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

  private playPlaceholderTypewriter(): void {
    const nextSuggestion = this.placeholderSuggestions[this.activePlaceholderIndex];
    let characterIndex = 0;
    this.activePlaceholder = '';

    const typeNextCharacter = () => {
      if (characterIndex < nextSuggestion.length) {
        this.activePlaceholder += nextSuggestion[characterIndex];
        characterIndex += 1;
        this.placeholderTimer = setTimeout(typeNextCharacter, 45);
        return;
      }

      this.placeholderTimer = setTimeout(() => {
        this.activePlaceholderIndex =
          (this.activePlaceholderIndex + 1) % this.placeholderSuggestions.length;
        this.playPlaceholderTypewriter();
      }, 1500);
    };

    typeNextCharacter();
  }



  getProjects(): void {
    this.apiService.getApi<any>('api/user/fetchClientAllProjects').subscribe(
      (res) => {
        if (res.success) {
          this.allProjectsList = (res.data || []) as UserProjectTab[];

          if (!this.selectedProjectId && this.allProjectsList.length > 0) {
            this.selectedProjectId = this.allProjectsList[0].inquiryId;
          }
        }
      }
    );
  }

  closeModal() {
    this.showModal = false;
  }

  LogOut() {
    localStorage.clear()
    this.router.navigate(['/'])
  }
}

import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../../../services/api.service';
import { SidebarComponent } from "../../sidebar/sidebar.component";

interface ProjectSuggestionResponse {
  success: boolean;
  projectId?: number | string;
  message?: string;
}

@Component({
  selector: 'app-main-ai',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent],
  templateUrl: './main-ai.component.html',
  styleUrl: './main-ai.component.css'
})
export class MainAiComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('promptInput') promptInput?: ElementRef<HTMLTextAreaElement>;

  promptIdeas = [
    'Internal tools',
    'Admin panel',
    'Mobile app',
    'SaaS dashboard'
  ];

  placeholderSuggestions = [
    'Build a SaaS admin dashboard with analytics',
    'Create a clean food delivery app flow',
    'Design a premium landing page for a startup',
    'Generate an internal CRM with role-based access'
  ];

  activePlaceholder = '';
  promptText = '';
  isOverlayOpen = false;
  overlayState: 'loading' | 'success' | 'error' = 'loading';
  submittedPrompt = '';
  aiResponseMessage = '';
  currentLoaderText = '';
  isSubmitting = false;
  private placeholderTimer: ReturnType<typeof setTimeout> | null = null;
  private activePlaceholderIndex = 0;
  private loaderTimer: ReturnType<typeof setTimeout> | null = null;
  private redirectTimer: ReturnType<typeof setTimeout> | null = null;
  private loaderIndex = 0;
  private readonly loaderSteps = [
    'Thinking',
    'Understanding user intent',
    'Gathering context',
    'Preparing AI response'
  ];

  constructor(
    private apiService: ApiService,
    private router: Router
  ) {}

  ngOnInit(): void {
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

    this.clearOverlayTimers();
  }

  handlePromptKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.submitPrompt();
    }
  }

  submitPrompt(): void {
    const description = this.promptText.trim().replace(/\s+/g, ' ');
    if (!description || this.isSubmitting) {
      return;
    }

    this.isOverlayOpen = true;
    this.isSubmitting = true;
    this.overlayState = 'loading';
    this.submittedPrompt = description;
    this.aiResponseMessage = '';
    this.startLoaderSequence();
    
    this.apiService.postAPI<ProjectSuggestionResponse, { prompt: string }>('api/user/gatherUserInput', {
      prompt: description
    }).subscribe({
      next: (response) => {
        this.isSubmitting = false;

        if (response?.success && response.projectId) {
          this.clearOverlayTimers();
          this.overlayState = 'success';
          this.aiResponseMessage = 'Project created. Taking you to the project workspace.';

          this.redirectTimer = setTimeout(() => {
            this.router.navigate(['/make-it-mine', response.projectId]);
          }, 600);
          return;
        }

        this.clearOverlayTimers();
        this.overlayState = 'error';
        this.aiResponseMessage = response?.message?.trim() || 'AI could not validate this idea. Please refine the prompt and try again.';
      },
      error: () => {
        this.isSubmitting = false;
        this.clearOverlayTimers();
        this.overlayState = 'error';
        this.aiResponseMessage = 'Something went wrong while contacting the server. Please try again.';
      }
    });
  }

  closeOverlay(): void {
    if (this.overlayState === 'loading') {
      return;
    }

    this.isOverlayOpen = false;
  }

  focusPrompt(): void {
    this.isOverlayOpen = false;
    setTimeout(() => this.promptInput?.nativeElement.focus(), 0);
  }

  private startLoaderSequence(): void {
    this.clearOverlayTimers();
    this.loaderIndex = 0;
    this.currentLoaderText = this.loaderSteps[0];

    const rotateLoader = () => {
      this.loaderIndex = (this.loaderIndex + 1) % this.loaderSteps.length;
      this.currentLoaderText = this.loaderSteps[this.loaderIndex];
      this.loaderTimer = setTimeout(rotateLoader, 1100);
    };

    this.loaderTimer = setTimeout(rotateLoader, 1100);
  }

  private clearOverlayTimers(): void {
    if (this.loaderTimer) {
      clearTimeout(this.loaderTimer);
      this.loaderTimer = null;
    }

    if (this.redirectTimer) {
      clearTimeout(this.redirectTimer);
      this.redirectTimer = null;
    }
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
}

import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MainAiChatbotComponent } from '../main-ai-chatbot/main-ai-chatbot.component';
import { SidebarComponent } from "../../sidebar/sidebar.component";

@Component({
  selector: 'app-main-ai',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, MainAiChatbotComponent],
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
    'Generate an e-commerce website for a fashion brand',
    'Build a portfolio website for a photographer',
    'Design a dashboard for a project management tool'
  ];

  activePlaceholder = '';
  promptText = '';
  isChatMode = false;
  submittedPrompt = '';
  private placeholderTimer: ReturnType<typeof setTimeout> | null = null;
  private activePlaceholderIndex = 0;

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

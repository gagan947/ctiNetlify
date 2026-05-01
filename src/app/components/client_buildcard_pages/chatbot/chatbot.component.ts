import { Component, ElementRef, EventEmitter, NgZone, Output, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../../services/api.service';
import { CommonModule } from '@angular/common';
import { chatbotFlow } from '../../../helper/chatbot';
import { AutosizeModule } from 'ngx-autosize';
import { io } from 'socket.io-client';
import { take } from 'rxjs/operators';
@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule, AutosizeModule],
  templateUrl: './chatbot.component.html',
  styleUrl: './chatbot.component.css'
})
export class ChatbotComponent {
  private readonly conversationStorageKey = 'conversationId';
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;
  autoScrollEnabled = true;
  loadingText: string = 'Thinking...';
  flow = chatbotFlow;
  currentStep = 'welcome';
  socket: any;
  userMessage = '';
  messages: any[] = [];
  relevantFeatures: any[] = [];
  isLoading: boolean = false;
  isRestoringConversation: boolean = true;
  userData: any = {};
  userInput: string = '';
  standardChatbot: boolean = true;
  userName: string = 'there';
  profileImage: string = 'assets/img/np_pro.png';
  @Output() dataEmitter = new EventEmitter<string>();
  basicOptions: any[] = []
  constructor(private apiservice: ApiService, private router: Router, private ngZone: NgZone) {
    const data: any = localStorage.getItem('userDetailCTI')
    if (data !== 'undefined') {
      const user = JSON.parse(data);
      this.userName = user.name || 'there';
      this.profileImage = user.profile_image ? (this.apiservice.imageUrl + user.profile_image) : 'assets/img/np_pro.png';
    }
    // this.addBotMessage(this.flow[this.currentStep].message);
  }



  ngOnInit() {
    this.basicOptions = this.flow['welcome'].options;
    this.socket = io(this.apiservice.apiUrl, {
      auth: {
        conversationId: this.getStoredConversationId()
      }
    });
    this.socket.on('conversationResumed', (payload: any) => {
      this.ngZone.run(() => {
        this.handleConversationResumed(payload);
      });
    });

    // listen for streaming tokens
    this.socket.on('botReply', (msg: string) => {
      this.isRestoringConversation = false;

      if (msg === "[END]") {
        console.log("✅ Stream finished");
        return;
      }
      // Append stream to last bot message
      if (
        this.messages.length > 0 &&
        this.messages[this.messages.length - 1].sender === "Bot"
      ) {
        this.messages[this.messages.length - 1].text += msg;
      } else {
        this.messages.push({ sender: "Bot", text: msg });
        this.ngZone.onStable.pipe(take(1)).subscribe(() => {
          this.scrollToBottom();
        });
      }
      this.isLoading = false; // hide spinner after response
    });
    this.socket.on('navigateToBuilder', (msg: any) => {

      // If server sends a JSON string, parse it
      const data = typeof msg === 'string' ? JSON.parse(msg) : msg;

      if (data?.projectId) {
        this.router.navigate(['/bd_loader'], {
          queryParams: { id: data.projectId },
          skipLocationChange: true  // URL won't change, user stays on original route
        });
      } else {
        console.error('Project ID not found in server response:', data);
      }

      this.isLoading = false;
    });

    this.socket.on('loader_message', (msg: any) => {
      this.loadingText = msg;
    });

    this.socket.on('suggestedProjects', (projects: any) => {
      console.log('Suggested projects:', projects);
      this.dataEmitter.emit(projects);
    });

    // when streaming ends
    this.socket.on('botDone', () => {
      console.log("✅ Bot finished response");
    });
  }


  scrollToBottom() {
    try {
      const container = this.scrollContainer.nativeElement;
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth'
      });
    } catch (err) {
      console.error('Scroll failed:', err);
    }
  }

  addBotMessage(text: string) {
    if (text.includes('{name}') && this.userData.name) {
      text = text.replace('{name}', this.userData.name);
    }
    this.messages.push({ sender: 'bot', text, step: this.currentStep, features: this.relevantFeatures, time: new Date() });
    this.ngZone.onStable.pipe(take(1)).subscribe(() => {
      this.scrollToBottom();
    });
  }

  // sendMessage() {
  //   this.userInput = this.userInput.trim();
  //   // this.relevantFeatures = [];
  //   if (this.standardChatbot) {
  //     if (this.userInput.trim()) {
  //       const isValid = this.flow[this.currentStep].input;
  //       if (!isValid) {
  //         this.addUserMessage(this.userInput);
  //         this.askAIQuestion();
  //         this.userInput = '';
  //         return;
  //       }

  //       this.isLoading = true;
  //       this.addUserMessage(this.userInput);

  //       if (!this.userData.projectName && (this.currentStep === 'projectNameApp' || this.currentStep === 'projectNameWebsite')) {
  //         this.userData.projectName = this.userInput.trim();
  //       }
  //       if (this.currentStep === 'details') {

  //         this.userData.details = this.userInput.trim();
  //         this.getProjectSuggestions(this.userData.details);
  //       }
  //       if (this.currentStep === 'features') {
  //         this.userData.features = this.userInput.trim();
  //       }

  //       const nextStep = this.flow[this.currentStep].next;
  //       this.userInput = '';

  //       setTimeout(() => {
  //         if (this.currentStep === 'details') {

  //         } else {
  //           this.isLoading = false;
  //         }
  //         this.currentStep = nextStep;
  //         if (this.currentStep === 'stop') {

  //         } else {
  //           const botMsg = this.replacePlaceholders(this.flow[this.currentStep].message);
  //           this.addBotMessage(botMsg);
  //           this.userInput = '';
  //         }

  //       }, 2000)

  //     }
  //   } else if (this.userInput.trim()) {
  //     this.addUserMessage(this.userInput);
  //     this.askAIQuestion();
  //   }
  // }
  sendMessage() {
    if (!this.userMessage.trim() || this.isRestoringConversation) return;

    this.messages.push({ sender: 'You', text: this.userMessage });
    this.ngZone.onStable.pipe(take(1)).subscribe(() => {
      this.scrollToBottom();
    });
    this.socket.emit('chatMessage', this.userMessage);
    this.isLoading = true;
    this.userMessage = '';
  }
  replacePlaceholders(message: string): string {
    const replaced = message.replace(/{projectName}/g, this.userData.projectName || '');
    return replaced;
  }


  getOptions() {
    return !this.isLoading && this.currentStep !== 'welcome'
      ? this.flow[this.currentStep]?.options ?? []
      : [];
  }

  selectOption(option: any) {
    if (this.isLoading) return;

    this.addUserMessage(option.label);
    this.currentStep = option.next;
    if (this.currentStep === 'projectNameApp' || this.currentStep === 'projectNameWebsite') {
      this.socket.emit('chatMessage', option.label);
      this.isLoading = true;
      this.userMessage = '';
      return
    }
    this.isLoading = true;
    if (this.currentStep !== 'chatbot') {
      this.standardChatbot = true;
      setTimeout(() => {
        this.isLoading = false;
        if (this.flow[this.currentStep]) {
          const botMsg = this.replacePlaceholders(this.flow[this.currentStep].message);
          this.addBotMessage(botMsg);
        }
      }, 2500)
    } else {
      this.isLoading = false;
      this.standardChatbot = false;
      this.addBotMessage("Great! 🎉 I can answer some common questions to help you get started ");
    }
  }

  addUserMessage(text: string) {
    this.messages.push({ sender: 'You', text, step: this.currentStep, time: new Date() });
    this.ngZone.onStable.pipe(take(1)).subscribe(() => {
      this.scrollToBottom();
    });
  }

  askAIQuestion() {
    this.isLoading = true;
    this.apiservice.postAPI<any, any>('api/admin/chatQA', { question: this.userInput }).subscribe((response) => {
      this.userInput = '';
      setTimeout(() => {
        this.isLoading = false;
        this.addBotMessage(response.answer);
        if (response.flow == 1) {
          this.currentStep = 'welcome'
          this.standardChatbot = true
        }
      }, 500)
    })
  }
  getProjectSuggestions(description: string) {
    this.isLoading = true;
    this.apiservice.postAPI<any, any>('api/user/projectSuggestions', { description: description }).subscribe((response) => {
      console.log(response);
      this.userInput = '';
      setTimeout(() => {
        if (response.suggestions.length > 0) {
          this.dataEmitter.emit(response.suggestions);
          this.relevantFeatures = response.relevantFeatures
          this.isLoading = false
        } else {
          this.isLoading = false
        }
        if (response.flow == 1) {
          this.currentStep = 'details'
        } else {
          this.currentStep = 'chatbot'
          this.standardChatbot = false;
        }
        this.addBotMessage(response.answer);
      }, 500)
    })
  }

  private handleConversationResumed(payload: any): void {
    this.isRestoringConversation = false;
    this.isLoading = false;

    const conversationId = typeof payload?.conversationId === 'string' ? payload.conversationId.trim() : '';
    if (conversationId && typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(this.conversationStorageKey, conversationId);
    }

    if (Array.isArray(payload?.messages)) {
      this.messages = payload.messages
        .map((message: any, index: number) => {
          const text = this.extractMessageText(message);
          if (!text) {
            return null;
          }

          const sender = this.normalizeMessageSender(message?.sender ?? message?.role);
          return {
            sender,
            text,
            time: this.normalizeMessageTime(message?.createdAt ?? message?.timestamp ?? message?.time, index)
          };
        })
        .filter((message: any) => !!message);
    }

    if (payload?.state && typeof payload.state === 'object' && typeof payload.state.loadingText === 'string') {
      this.loadingText = payload.state.loadingText;
    }

    this.ngZone.onStable.pipe(take(1)).subscribe(() => {
      this.scrollToBottom();
    });
  }

  private getStoredConversationId(): string | null {
    if (typeof sessionStorage === 'undefined') {
      return null;
    }

    return sessionStorage.getItem(this.conversationStorageKey);
  }

  private extractMessageText(message: any): string {
    const textCandidate =
      typeof message === 'string'
        ? message
        : message?.text ?? message?.content ?? message?.message ?? '';

    return typeof textCandidate === 'string' ? textCandidate.trim() : '';
  }

  private normalizeMessageSender(sender: string): 'You' | 'Bot' {
    const normalizedSender = (sender || '').toLowerCase();
    return ['user', 'you', 'human'].includes(normalizedSender) ? 'You' : 'Bot';
  }

  private normalizeMessageTime(value: unknown, fallbackIndex: number): Date {
    if (value instanceof Date) {
      return value;
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      return new Date(value);
    }

    if (typeof value === 'string') {
      const parsed = Date.parse(value);
      if (!Number.isNaN(parsed)) {
        return new Date(parsed);
      }
    }

    return new Date(Date.now() + fallbackIndex);
  }

  ngOnDestroy(): void {
    this.socket.disconnect();
  }
}

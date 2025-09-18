import { Component, ElementRef, EventEmitter, Output, ViewChild } from '@angular/core';
import { FormBuilder, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../../services/api.service';
import { CommonModule } from '@angular/common';
import { chatbotFlow } from '../../../helper/chatbot';
import { AutosizeModule } from 'ngx-autosize';

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule, AutosizeModule],
  templateUrl: './chatbot.component.html',
  styleUrl: './chatbot.component.css'
})
export class ChatbotComponent {
  flow = chatbotFlow;
  currentStep = 'welcome';
  socket: any;
  userMessage = '';
  messages: any[] = [];
  relevantFeatures: any[] = [];
  isLoading: boolean = false;
  userData: any = {};
  userInput: string = '';
  standardChatbot: boolean = true;
  userName: string = 'there';
  profileImage: string = 'assets/img/np_pro.png';
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;
  @Output() dataEmitter = new EventEmitter<string>();
  basicOptions : any[]= []
  constructor(private fb: FormBuilder, private apiservice: ApiService, private router: Router) {
    const data: any = localStorage.getItem('userDetailCTI')
    if (data !== 'undefined') {
      const user = JSON.parse(data);
      this.userName = user.name || 'there';
      this.profileImage = this.apiservice.imageUrl + user.profile_image || 'assets/img/np_pro.png';
    
    }
    // this.addBotMessage(this.flow[this.currentStep].message);
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  ngOnInit() {
    this.basicOptions = this.flow['welcome'].options;
   
   }

  scrollToBottom(): void {
    try {
      this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
    } catch (err) { }
  }

  addBotMessage(text: string) {
    if (text.includes('{name}') && this.userData.name) {
      text = text.replace('{name}', this.userData.name);
    }
    this.messages.push({ sender: 'bot', text, step: this.currentStep, features: this.relevantFeatures,time: new Date() });
  }

  sendMessage() {
    this.userInput = this.userInput.trim();
    // this.relevantFeatures = [];
    if (this.standardChatbot) {
      if (this.userInput.trim()) {
        const isValid = this.flow[this.currentStep].input;
        if (!isValid) {
          this.addUserMessage(this.userInput);
          this.askAIQuestion();
          this.userInput = '';
          return;
        }


        this.isLoading = true;
        this.addUserMessage(this.userInput);


        if (!this.userData.projectName && (this.currentStep === 'projectNameApp' || this.currentStep === 'projectNameWebsite')) {
          this.userData.projectName = this.userInput.trim();
        }
        if (this.currentStep === 'details') {

          this.userData.details = this.userInput.trim();
          this.getProjectSuggestions(this.userData.details);
        }
        if (this.currentStep === 'features') {
          this.userData.features = this.userInput.trim();
        }

        const nextStep = this.flow[this.currentStep].next;
        this.userInput = '';

        setTimeout(() => {
          if (this.currentStep === 'details') {

          } else {
            this.isLoading = false;
          }
          this.currentStep = nextStep;
          if (this.currentStep === 'stop') {

          } else {
            const botMsg = this.replacePlaceholders(this.flow[this.currentStep].message);
            this.addBotMessage(botMsg);
            this.userInput = '';

          }

        }, 2000)

      }
    } else if (this.userInput.trim()) {
      this.addUserMessage(this.userInput);
      this.askAIQuestion();
    }
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

    this.addUserMessage(option.label);
    this.currentStep = option.next;
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
    this.messages.push({ sender: 'You', text, step: this.currentStep,time: new Date() });
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
        } else {

        }
      }, 500)
    })
  }
  getProjectSuggestions(description: string) {
    this.isLoading = true;
    this.apiservice.postAPI<any, any>('api/user/projectSuggestions', { description: description }).subscribe((response) => {
      this.userInput = '';
      setTimeout(() => {

        if (response.suggestions.length > 0) {
          this.dataEmitter.emit(response.suggestions);
          this.relevantFeatures = response.relevantFeatures
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
}

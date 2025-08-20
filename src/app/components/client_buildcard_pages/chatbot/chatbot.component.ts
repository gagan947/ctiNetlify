import { Component } from '@angular/core';
import { FormBuilder, FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Project } from '../../../models/projects';
import { ApiService } from '../../../services/api.service';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { chatbotFlow } from '../../../helper/chatbot';

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [RouterLink, CommonModule, SidebarComponent, FormsModule],
  templateUrl: './chatbot.component.html',
  styleUrl: './chatbot.component.css'
})
export class ChatbotComponent {
  flow = chatbotFlow;
  currentStep = 'welcome';
  socket: any;
  userMessage = '';
  messages: any[] = [];
  isLoading: boolean = false;
  userData: any = {};
  userInput: string = '';
  constructor(private fb: FormBuilder, private apiservice: ApiService, private router: Router) {
    this.addBotMessage(this.flow[this.currentStep].message);
    console.log(this.messages);
  }

  addBotMessage(text: string) {
    if (text.includes('{name}') && this.userData.name) {
      text = text.replace('{name}', this.userData.name);
    }
    this.messages.push({ sender: 'bot', text, step: this.currentStep });
  }

  sendMessage() {
   
    // this.socket.emit('chatMessage', this.userMessage);
  
   console.log(this.flow[this.currentStep]);

    this.userMessage = '';

    if (this.userInput.trim()) {
      const isValid = this.flow[this.currentStep].input;
      if (!isValid) {
        this.addUserMessage(this.userInput);
        this.addBotMessage(
          "😊 Please select one of the options above, or choose **Ask a question** if you’d like me to assist you directly."
        );
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
      }
      if (this.currentStep === 'features') {
        this.userData.features = this.userInput.trim();
      }

      const nextStep = this.flow[this.currentStep].next;


      setTimeout(() => {
        this.isLoading = false;
        this.currentStep = nextStep;
        const botMsg = this.replacePlaceholders(this.flow[this.currentStep].message);
   
        this.addBotMessage(botMsg);
        this.userInput = '';
        
      },300)
   console.log(this.messages);
    }

  
  }
  replacePlaceholders(message: string): string {
    console.log("here", message, this.userData);
    const replaced = message.replace(/{projectName}/g, this.userData.projectName || '');
    console.log("after replace:", replaced);
    return replaced;
  }
  

  getOptions() {
    if(!this.isLoading){
      return this.flow[this.currentStep]?.options || [];

    }
      return [];
    
  }

  selectOption(option: any) {
    this.addUserMessage(option.label);
    this.currentStep = option.next;
    this.isLoading = true;
    setTimeout(() => {
      this.isLoading = false;
      if (this.flow[this.currentStep]) {
        const botMsg = this.replacePlaceholders(this.flow[this.currentStep].message);
   
        this.addBotMessage(botMsg);
      }
    },2500)
  }

  addUserMessage(text: string) {
    this.messages.push({ sender: 'You', text, step: this.currentStep });
  }
}

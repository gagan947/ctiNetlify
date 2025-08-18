import { Component } from '@angular/core';
import { FormBuilder, FormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../../services/api.service';
import { CommonModule } from '@angular/common';
import { Project, ProjectResponse } from '../../../models/projects';
import { SidebarComponent } from "../sidebar/sidebar.component";
import { io } from 'socket.io-client';
declare var Calendly: any;
@Component({
  selector: 'app-main',
  standalone: true,
  imports: [RouterLink, CommonModule, SidebarComponent, FormsModule],
  templateUrl: './main.component.html',
  styleUrl: './main.component.css'
})
export class MainComponent {
  projectsData: Project[] = []
  projectId: any;
  featureCount: any;
  socket: any;
  userMessage = '';
  messages: any[] = [];
  isLoading: boolean = false;

  constructor(private fb: FormBuilder, private apiservice: ApiService, private router: Router) {

  };



ngOnInit(): void {
  sessionStorage.removeItem('projectData');
  this.socket = io(this.apiservice.apiUrl);

  let currentBotMsg = "";

  // listen for streaming tokens
this.socket.on('botReply', (msg: string) => {

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
  }
  this.isLoading = false; // hide spinner after response
});

  // when streaming ends
  this.socket.on('botDone', () => {
    console.log("✅ Bot finished response");
    currentBotMsg = "";
  });
}



 

 


  getProjects() {

    this.apiservice.getApi<ProjectResponse>(`api/user/fetchAllProjects`)
      .subscribe({
        next: (res) => {
          if (res.success == true) {
            this.projectsData = res.data;
          } else {
            // this.loading = false
          }
        },
        error: err => {
          // this.loading = false
        }
      });
  };


  openCalendly() {
    Calendly.initPopupWidget({ url: 'https://calendly.com/mohdfaraz-ctinfotech/30min' });
  };

  ngAfterViewInit() {
    const calendlyContainer = document.getElementById('calendly-inline-widget');
    if (calendlyContainer) {
      Calendly.initInlineWidget({
        url: 'https://calendly.com/mohdfaraz-ctinfotech/30min',
        parentElement: calendlyContainer
      });
    }
  };

  updateProjectId(id: any, featureCount: number) {
    console.log(id);
    this.projectId = id;
    this.featureCount = featureCount

  }

  LogOut() {
    localStorage.clear()
    this.router.navigate(['/'])
  }

  sendMessage() {
    if (!this.userMessage.trim()) return;

    this.messages.push({ sender: 'You', text: this.userMessage });
    this.socket.emit('chatMessage', this.userMessage);
    this.isLoading = true;
    this.userMessage = '';
  }
}

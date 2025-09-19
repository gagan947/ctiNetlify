import { Component, ElementRef, ViewChild } from '@angular/core';
import { FormBuilder, FormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../../services/api.service';
import { CommonModule } from '@angular/common';
import { Project, ProjectResponse } from '../../../models/projects';
import { SidebarComponent } from "../sidebar/sidebar.component";
import { ChatbotComponent } from "../chatbot/chatbot.component";
import { BdLoaderComponent } from "../../shared/bd-loader/bd-loader.component";
import { CalendlyDirective } from '../../../helper/directives/calendly.directive';
declare var Calendly: any;
@Component({
  selector: 'app-main',
  standalone: true,
  imports: [RouterLink, CommonModule, SidebarComponent, FormsModule, ChatbotComponent, BdLoaderComponent, CalendlyDirective],
  templateUrl: './main.component.html',
  styleUrl: './main.component.css'
})
export class MainComponent {

  @ViewChild('anchor', { static: false }) anchor!: ElementRef;

  private observer!: IntersectionObserver;
  projectsData: Project[] = []
  projectId: any;
  featureCount: any;
  socket: any;
  userMessage = '';
  messages: any[] = [];
  isLoading: boolean = false;
  page = 1;
  imageURL: any
  isSuggested: boolean = false;
  loading: boolean = false;
  searchTerm: string = '';
  constructor(private fb: FormBuilder, private apiservice: ApiService, private router: Router) {
    this.imageURL = this.apiservice.imageUrl;
  }

  ngOnInit(): void {
    const data: any = localStorage.getItem('userDetailCTI')
    if (data !== 'undefined') {
      const user = JSON.parse(data);
      this.apiservice.getRates(user?.currency);
    }
    this.getProjects();
    sessionStorage.clear();
    // this.socket = io(this.apiservice.apiUrl);
    let currentBotMsg = "";
    // listen for streaming tokens
    // this.socket.on('botReply', (msg: string) => {

    //   if (msg === "[END]") {
    //     console.log("✅ Stream finished");
    //     return;
    //   }
    //   // Append stream to last bot message
    //   if (
    //     this.messages.length > 0 &&
    //     this.messages[this.messages.length - 1].sender === "Bot"
    //   ) {
    //     this.messages[this.messages.length - 1].text += msg;
    //   } else {
    //     this.messages.push({ sender: "Bot", text: msg });
    //   }
    //   this.isLoading = false; // hide spinner after response
    // });

    // // when streaming ends
    // this.socket.on('botDone', () => {
    //   console.log("✅ Bot finished response");
    //   currentBotMsg = "";
    // });
  }

  receiveData(data: any) {
    if (data.length > 0) {
      this.isSuggested = true
    }
    const mappedData = data.map((item: any) => ({
      ...item,
      contain: item.contain ? item.contain.split(',') : []
    }));
    this.projectsData = [...mappedData];
    console.log('Got from child:', this.projectsData);
  }

  ngAfterViewInit() {
    this.observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !this.isSuggested && !this.searchTerm) {
        this.page += 1;
        this.getProjects();
      }
    });
    this.observer.observe(this.anchor.nativeElement);

    // const calendlyContainer = document.getElementById('calendly-inline-widget');
    // if (calendlyContainer) {
    //   Calendly.initInlineWidget({
    //     url: 'https://calendly.com/creativethoughts/30min',
    //     parentElement: calendlyContainer,
    //   });
    // }
  }

  searchDebounceTimeout: any;
  search(event: any) {
    clearTimeout(this.searchDebounceTimeout);
    this.searchDebounceTimeout = setTimeout(() => {
      this.searchTerm = event.target.value.trim().toLowerCase();
      if (this.searchTerm) {
        this.page = 1;
        this.apiservice.getApi<ProjectResponse>(`api/user/fetchAllProjects?page=${this.page}&search=${this.searchTerm}`)
          .subscribe({
            next: (res) => {
              if (res.success == true) {
                const mappedData = res.data.map((item: any) => ({
                  ...item,
                  contain: item.contain ? item.contain.split(',') : []
                }));
                this.projectsData = [...mappedData];
              } else {
              }
            },
            error: err => {
              this.projectsData = [];
            }
          });
      } else {
        this.projectsData = [];
        this.getProjects();
      }
    }, 500);
  }

  getProjects() {
    this.apiservice.getApi<ProjectResponse>(`api/user/fetchAllProjects?page=${this.page}&search=${this.searchTerm}`)
      .subscribe({
        next: (res) => {
          if (res.success == true) {
            const mappedData = res.data.map((item: any) => ({
              ...item,
              contain: item.contain ? item.contain.split(',') : []
            }));
            this.projectsData = [...this.projectsData, ...mappedData];
          } else {
            // this.loading = false
          }
        },
        error: err => {
          // this.loading = false
        }
      });
  }


  openCalendly() {
    Calendly.initPopupWidget({ url: 'https://calendly.com/mohdfaraz-ctinfotech/30min' });
  };

  updateProjectId(id: any, featureCount: number) {

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

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
import { NzMessageService } from 'ng-zorro-antd/message';
import { SubcriptionPageComponent } from '../subcription-page/subcription-page.component';
declare var Calendly: any;
@Component({
  selector: 'app-main',
  standalone: true,
  imports: [RouterLink, CommonModule, SidebarComponent, FormsModule, ChatbotComponent, BdLoaderComponent, CalendlyDirective, SubcriptionPageComponent],
  templateUrl: './main.component.html',
  styleUrl: './main.component.css'
})
export class MainComponent {
  showModal = false;
  @ViewChild('anchor', { static: false }) anchor!: ElementRef;
@ViewChild('SearchInput', { static: false }) SearchInput!: ElementRef;
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
  orgProjectsData: Project[] = [];
  allowProjectCreate = false;
  navigateMessage = ''
  constructor(private fb: FormBuilder, private apiservice: ApiService, private router: Router,private message: NzMessageService,) {
    this.imageURL = this.apiservice.imageUrl;
  }

  ngOnInit(): void {
    this.getUserSubscriptionPlan();
    const data: any = localStorage.getItem('userDetailCTI')
    if (data !== 'undefined') {
      const user = JSON.parse(data);
      this.apiservice.getRates(user?.currency);
    }
    this.getProjects();
    sessionStorage.clear();
    this.apiservice._htmlCode.set(null);

    // this.socket = io(this.apiservice.apiUrl);
    let currentBotMsg = "";
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
            this.orgProjectsData = [...this.projectsData];
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

  navigateTool(id: any) {
   if(this.allowProjectCreate){
     this.router.navigate(['/bd_loader'], {
       queryParams: { id },
       skipLocationChange: true  
     });
   }else{
     this.showModal = true;
     setTimeout(() => {
      this.message.warning(this.navigateMessage);
    }, 2000);
    
   }

  }

  clearSearch() {
    this.isSuggested = false
    this.searchTerm = '';
    this.page = this.page;
    this.SearchInput.nativeElement.value = '';
    this.projectsData = [...this.orgProjectsData];
  }

  getUserSubscriptionPlan() {
    this.apiservice.getApi<any>(`api/user/getMySubscription`)
      .subscribe({
        next: (res) => {
          this.allowProjectCreate = res.allowProjectCreate;
          this.navigateMessage = res.message
        },
        error: err => {
          // this.loading = false
        }
      });
  }

  closeModal() {
    this.showModal = false;
  }

}

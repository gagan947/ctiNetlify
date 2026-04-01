import { Component, ElementRef, NgZone, Renderer2 } from '@angular/core';
import { SidebarComponent } from "../sidebar/sidebar.component";
import { SubscriptionResponse } from '../../../models/subcription';
import { FormBuilder } from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { NzMessageService } from 'ng-zorro-antd/message';
import { AiSocketService } from '../../../services/ai-socket.service';
import { ApiService } from '../../../services/api.service';
import { CommonModule } from '@angular/common';
import { SubcriptionPageComponent } from '../subcription-page/subcription-page.component';
import { WorkspaceHeaderComponent } from "../workspace-header/workspace-header.component";

@Component({
  selector: 'app-user-plans',
  standalone: true,
  imports: [SidebarComponent, CommonModule, SubcriptionPageComponent, WorkspaceHeaderComponent],
  templateUrl: './user-plans.component.html',
  styleUrl: './user-plans.component.css'
})
export class UserPlansComponent {
  planName = 'Free Plan';
  subscriptionPlan!: SubscriptionResponse;
  showModal = false;
  isCanceling = false
  // Redirect page for login action
  constructor(
    private apiService: ApiService,
    private el: ElementRef,
    private renderer: Renderer2,
    private sanitizer: DomSanitizer,
    private aiService: AiSocketService,
    private router: Router, private ngZone: NgZone, private fb: FormBuilder,
    private toster: NzMessageService
  ) {

  }

  async ngOnInit() {
    this.getUserSubscriptionPlan();

  }

  getUserSubscriptionPlan() {
    this.apiService.getApi<SubscriptionResponse>(`api/user/getMySubscription`)
      .subscribe({
        next: (res) => {

          this.subscriptionPlan = res;
          this.planName = res.planName
        },
        error: err => {
          // this.loading = false
        }
      });
  };

  cancelSubcription() {
    this.isCanceling = true
    this.apiService.getApi(`api/user/cancelSubscription`)
      .subscribe({
        next: (res: any) => {

          setTimeout(() => {
            this.isCanceling = false;
            this.getUserSubscriptionPlan();
          }, 5000);

          this.toster.success(res.message); // instant


        },
        error: err => {

          setTimeout(() => {
            this.isCanceling = false;

          }, 2000);
          // this.loading = false
        }
      });
  }


  closeModal() {
    this.showModal = false;
  }
}

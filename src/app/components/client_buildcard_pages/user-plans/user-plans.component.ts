import { Component, ElementRef, NgZone, Renderer2 } from '@angular/core';
import { SidebarComponent } from "../sidebar/sidebar.component";
import { SubscriptionResponse } from '../../../models/subcription';
import { FormBuilder } from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { NzMessageService } from 'ng-zorro-antd/message';
import { AiSocketService } from '../../../services/ai-socket.service';
import { ApiService } from '../../../services/api.service';

@Component({
  selector: 'app-user-plans',
  standalone: true,
  imports: [SidebarComponent],
  templateUrl: './user-plans.component.html',
  styleUrl: './user-plans.component.css'
})
export class UserPlansComponent {
  planName = 'Free Plan';
  subscriptionPlan! :SubscriptionResponse
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

  cancelSubcription(){
    this.apiService.getApi(`api/user/cancelSubscription`)
    .subscribe({
      next: (res:any) => {
        console.log(res);
        this.toster.success(res.message); // instant

      
      },
      error: err => {
        // this.loading = false
      }
    });
  }
}

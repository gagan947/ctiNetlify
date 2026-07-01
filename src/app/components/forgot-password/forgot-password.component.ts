import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ReactiveFormsModule, FormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NzMessageService } from 'ng-zorro-antd/message';
import { ApiService } from '../../services/api.service';
import { SubmitButtonComponent } from '../shared/submit-button/submit-button.component';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [
    RouterLink,
    ReactiveFormsModule,
    FormsModule,
    CommonModule,
    SubmitButtonComponent
  ],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.css'
})
export class ForgotPasswordComponent {
  forgotForm: FormGroup;
  linkSent: boolean = false;
  emailValue: string = '';
  isLoading: boolean = false;

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private message: NzMessageService
  ) {
    this.forgotForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  onSendOtp() {
    if (this.forgotForm.valid) {
      this.isLoading = true;
      this.emailValue = this.forgotForm.value.email;
      
      const payload = {
        email: this.emailValue
      };

      this.apiService.postAPI(`api/user/forgotPassword`, payload)
        .subscribe({
          next: (res: any) => {
            this.isLoading = false;
            if (res.success === true) {
              this.message.success(res.message || 'Password reset link sent successfully.');
              this.linkSent = true;
            } else {
              this.message.error(res.message || 'Failed to send password reset link.');
            }
          },
          error: (err) => {
            this.isLoading = false;
            const errMsg = err.error?.message || 'Error occurred while sending password reset link.';
            this.message.error(errMsg);
          }
        });
    } else {
      this.forgotForm.markAllAsTouched();
    }
  }
}

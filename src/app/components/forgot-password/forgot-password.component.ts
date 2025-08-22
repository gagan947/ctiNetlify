import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ReactiveFormsModule, FormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { NzMessageService } from 'ng-zorro-antd/message';
import { ApiService } from '../../services/api.service';
import { SubmitButtonComponent } from '../shared/submit-button/submit-button.component';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
    imports: [RouterLink, ReactiveFormsModule, FormsModule, CommonModule, SubmitButtonComponent],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.css'
})
export class ForgotPasswordComponent {
  loginForm: FormGroup;
  showPassword: boolean = false; // Controls password visibility
  isLoading = false
  constructor(private fb: FormBuilder, private apiService: ApiService, private router: Router, private message: NzMessageService,) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: [
        '',
        [
          Validators.required
        ]
      ]
    });
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  onSubmit() {
    if (this.loginForm.valid) {
      this.isLoading = true;
      const payload = {
        email: this.loginForm.value.email,
        password: this.loginForm.value.password
      };

      this.apiService.postAPI(`api/user/signIn`, payload)
        .subscribe({
          next: (res: any) => {
            if (res.success == true) {
              this.apiService.setToken(res.data.token);
              localStorage.setItem('userDetailCTI', JSON.stringify(res.data.users));
              this.message.success(res.message)
              this.router.navigate(['/main'])
              // this.projectInfo = res.projectInfo
              // this, this.getProjectMedia()
              this.isLoading = false
            } else {
              this.isLoading = false
              // this.loading = false
              this.message.error(res.message)
            }
          },
          error: err => {
            if (err.status === 0) {
              this.message.error('Network error, please check your connection.');
            } else if (err.error?.message) {
              this.message.error(err.error.message);
            } else {
              this.message.error('Unexpected error occurred.');
            }
            this.isLoading = false
          }
        });
    } else {
      this.loginForm.markAllAsTouched()
    }
  }

  get formControls() {
    return this.loginForm.controls;
  }
}

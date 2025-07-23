import { Component } from '@angular/core';
import { FormGroup, FormBuilder, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { CommonModule } from '@angular/common';
import { NzMessageService } from 'ng-zorro-antd/message';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, FormsModule, CommonModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  loginForm: FormGroup;
  showPassword: boolean = false; // Controls password visibility

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
              // this.loading = false
            } else {
              // this.loading = false
              this.message.error(res.message)
            }
          },
          error: err => {
            // this.loading = false
            this.message.error('Something went wrong')
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

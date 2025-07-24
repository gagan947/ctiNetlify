import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { integerValidator, NoWhitespaceDirective, passwordMatchValidator, passwordMismatchValidator, strongPasswordValidator } from '../../helper/validators';
import { ValidationErrorService } from '../../services/validation-error.service';
import { CommonModule } from '@angular/common';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzMessageService } from 'ng-zorro-antd/message';
@Component({
  selector: 'app-log-in',
  imports: [ReactiveFormsModule, CommonModule, NzSelectModule],
  templateUrl: './log-in.component.html',
  styleUrl: './log-in.component.css'
})
export class LogInComponent {
  Form: FormGroup;

  constructor(private fb: FormBuilder, public validationErrorService: ValidationErrorService, private toastr: NzMessageService) {
    this.Form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(20), NoWhitespaceDirective.validate]],
      age: ['', [Validators.required, integerValidator, Validators.min(1), Validators.max(100)]],
      gender: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]],
      newPassword: ['', [Validators.required, strongPasswordValidator]],
      confirmPassword: ['', [Validators.required]],
    }, {
      validators: [
        passwordMatchValidator(),
        passwordMismatchValidator()
      ]
    });
  }

  ngOnInit(): void {
    this.toastr.success('Welcome to ZYNQ');
  }
}

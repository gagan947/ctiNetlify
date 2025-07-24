import { Component, HostListener, ViewChild, viewChild } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NzMessageService } from 'ng-zorro-antd/message';
import { ValidationErrorService } from '../../services/validation-error.service';
import { CommonModule } from '@angular/common';
import { CommonService } from '../../services/common.service';
import { FooterComponent } from '../footer/footer.component';
import { HeaderComponent } from '../header/header.component';
declare var bootstrap: any
@Component({
  selector: 'app-main',
  imports: [ReactiveFormsModule, CommonModule, HeaderComponent, FooterComponent],
  templateUrl: './main.component.html',
  styleUrl: './main.component.css'
})
export class MainComponent {
  Form!: FormGroup;
  loading: boolean = false;
  @ViewChild('closeBtn') closeBtn: any

  constructor(private fb: FormBuilder, public validationErrorService: ValidationErrorService, private toastr: NzMessageService, private service: CommonService) {
    this.Form = this.fb.group({
      full_name: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      mobile_number: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      application_type: ['android', [Validators.required]],
      udid: [null]
    });
  }

  ngOnInit(): void {
    this.Form.get('application_type')?.valueChanges.subscribe(value => {
      if (value !== 'android') {
        this.Form.get('udid')?.setValidators([Validators.required]);
        this.Form.get('udid')?.updateValueAndValidity();
      } else {
        this.Form.get('udid')?.clearValidators();
        this.Form.get('udid')?.updateValueAndValidity();
      }
    })
  }

  onSubmit() {
    if (this.Form.invalid) {
      this.Form.markAllAsTouched();
      return;
    }
    this.loading = true
    let formData = {
      ...this.Form.value,
      mobile_number: this.Form.value.mobile_number.toString()
    }

    this.service.post('enroll-user', formData).subscribe((res: any) => {
      if (res.success) {
        this.loading = false
        this.toastr.success(res.message);
        this.Form.reset();
        this.loading = false;
        this.closeBtn.nativeElement.click();
        const modal2 = new bootstrap.Modal(document.getElementById('ct_rating_confirm_modal'), {});
        modal2.show();

      } else {
        this.toastr.error(res.message);
        this.loading = false
      }
    }, (err: any) => {
      this.loading = false
      this.toastr.error(err);
    })
  }
}

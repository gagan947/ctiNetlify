import { Component, ElementRef, ViewChild } from '@angular/core';
import { HeaderComponent } from "../shared/header/header.component";
import { FooterComponent } from "../shared/footer/footer.component";
import { CountryISO, NgxIntlTelInputModule, SearchCountryField } from 'ngx-intl-tel-input-gg';
import { FormGroup, FormBuilder, Validators, ReactiveFormsModule, FormsModule, FormControl } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { NzMessageService } from 'ng-zorro-antd/message';
declare var bootstrap: any;
declare var Calendly: any;

import { AbstractControl, ValidationErrors } from '@angular/forms';

export function noWhitespaceValidator(control: FormControl) {
  const value = String(control.value || '');
  const isWhitespace = value.trim().length === 0;
  return isWhitespace ? { whitespace: true } : null;
}
@Component({
  selector: 'app-free-demo',
  standalone: true,
  imports: [HeaderComponent, FooterComponent, NgxIntlTelInputModule, ReactiveFormsModule, CommonModule, FormsModule],
  templateUrl: './free-demo.component.html',
  styleUrl: './free-demo.component.css'
})
export class FreeDemoComponent {
  @ViewChild('fileInput') fileInput!: ElementRef;
  SearchCountryField = SearchCountryField
  CountryISO = CountryISO
  countries: any;
  myForm!: FormGroup;
  demoId: any;
  constructor(private fb: FormBuilder, private apiService: ApiService, private router: Router, private message: NzMessageService) { }
  selectedFiles: File[] = [];
  isSubmitting: any = false;
  ngOnInit(): void {
    this.myForm = this.fb.group({
      fullName: ['', [Validators.required, Validators.minLength(3), noWhitespaceValidator]],
      phoneNumber: ['', [Validators.required, noWhitespaceValidator]],
      businessEmail: ['', [Validators.required, Validators.email, noWhitespaceValidator]],
      companyName: ['', [Validators.required, noWhitespaceValidator]],
      projectName: ['', [Validators.required, noWhitespaceValidator]],
      projectDescription: [''],  // optional field
      companySize: ['', [Validators.required, noWhitespaceValidator]],
      jobTitle: ['', [Validators.required, noWhitespaceValidator]]
    });
  }

  get f() {
    return this.myForm.controls;
  };


  onSubmit(): void {
    if (this.myForm.invalid) {
      this.myForm.markAllAsTouched(); // Show all errors
      return;
    }

    this.isSubmitting = true;


    const formData = { ...this.myForm.value };
    const updloadData = new FormData();
    if (this.selectedFiles.length > 0) {
      this.selectedFiles.forEach(file => {
        updloadData.append('multiple_files', file);
      });
    }

    updloadData.append('fullName', formData.fullName.trim());
    updloadData.append('businessEmail', formData.businessEmail.trim());
    updloadData.append('companyName', formData.companyName.trim());
    updloadData.append('project_name', formData.projectName.trim());
    updloadData.append('project_description', formData.projectDescription.trim());
    updloadData.append('companySize', formData.companySize.trim());
    updloadData.append('jobTitle', formData.jobTitle.trim());
    updloadData.append('phoneNumber', formData.phoneNumber.internationalNumber);

    this.apiService.postAPI('api/user/getFreeDemo', updloadData).subscribe({
      next: (response: any) => {
        if (response.success){
          this.message.success('Thank you for your submission! We will get in touch with you shortly.', {
            nzDuration: 8000 // 5 seconds
          });
          this.demoId = response.data.insertId
        this.myForm.reset();
        this.selectedFiles = [];
        this.fileInput.nativeElement.value = '';
     
        setTimeout(() => {
          this.isSubmitting = false; // Hide loader after 5 seconds

          // Show modal
          const modal = new bootstrap.Modal(document.getElementById('ct_schedule_call_modal') as HTMLElement);
          modal.show();
        }, 1000); // 5000ms = 5 seconds
        }


      },
      error: (error) => {
        this.isSubmitting = false;
        console.error('Error:', error);
        this.message.error('Something went wrong. Please try again.');
        // alert('Something went wrong. Please try again.');
      }
    });
  };

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
  
    if (input.files) {
      const files = Array.from(input.files);
  
      if (files.length > 5) {
       this.message.warning('You can upload a maximum of 5 files.');
        // Clear the file input to prevent keeping the selection
        input.value = '';
        this.selectedFiles = [];
        return;
      }
  
      this.selectedFiles = files;
      console.log('Selected files:', this.selectedFiles);
    }
  }

  onTellUsSubmit(form: any) {
    this.apiService.postAPI(`api/user/tellUsAbout?demoId=${this.demoId}`, form.value).subscribe({
      next: (response: any) => {
        if (response.success)
          form.reset(); // Reset form after submission
        const modal = new bootstrap.Modal(document.getElementById('tellUs') as HTMLElement);
        modal.close();
      },
      error: (error) => {
        console.error('Error:', error);
        // alert('Something went wrong. Please try again.');
        this.message.error('Something went wrong. Please try again.');
      }
    })
  };

  openCalendly() {
    Calendly.initPopupWidget({ url: 'https://calendly.com/amitholkar/30min' });
  };

  ngAfterViewInit() {
    const calendlyContainer = document.getElementById('calendly-inline-widget');
    if (calendlyContainer) {
      Calendly.initInlineWidget({
        url: 'https://calendly.com/amitholkar/30min',
        parentElement: calendlyContainer
      });
    }
  }
}

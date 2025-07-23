import { Component, ElementRef, Input, ViewChild } from '@angular/core';
import { FormBuilder, FormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../../../services/api.service';
import { CommonModule } from '@angular/common';
import { Location } from '@angular/common';

import { ColorPickerModule } from 'ngx-color-picker';
import { NzMessageService } from 'ng-zorro-antd/message';
import { SidebarComponent } from "../../sidebar/sidebar.component";
@Component({
  selector: 'app-make-it-mine',
  standalone: true,
  imports: [RouterLink, FormsModule, CommonModule, ColorPickerModule, SidebarComponent],
  templateUrl: './make-it-mine.component.html',
  styleUrl: './make-it-mine.component.css'
})
export class MakeItMineComponent {
  @Input() id!: string;
  projectsData: any;
  projectName: string = 'My Creative Project';
  imagePreview: string | ArrayBuffer | null = null;
  public color: string = '#2889e9';
  selectedColor: any
  logoImg: File | undefined
  @ViewChild('logoBox') logoBox!: ElementRef;
  nameInvalid = false
  mobile_base = true;
  estimatedWeeks: number | null | undefined
  submitted: boolean = false
  constructor(private fb: FormBuilder, private apiService: ApiService, private router: Router, public location: Location, private message: NzMessageService,) {
    let projectData = sessionStorage.getItem('projectData');
    this.projectsData = JSON.parse(projectData!);
    if (this.projectsData) {
      this.imagePreview = this.projectsData.projectLogo
      this.projectName = this.projectsData.projectName
      this.estimatedWeeks = this.projectsData.estimated_time
    }
  }

  updateName(name: any) {
    this.projectName = name.trim();
    if(!this.projectName){
     this.nameInvalid = true
    }else{
      this.nameInvalid = false
    }
  };

  onFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    this.logoImg = file;
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreview = reader.result;
      };
      reader.readAsDataURL(file);
    }
  }

  onColorChange(color: string) {
    this.selectedColor = color;
  }


  Navigate(id: any) {

    if (this.projectName == '' || !this.estimatedWeeks) {
      this.submitted = true
      return
    }

    let formData = new FormData();
    formData.append('logoImg', this.logoImg ? this.logoImg : '');
    formData.append('projectName', this.projectName);
    formData.append('projectId', this.id);
    formData.append('logoSize', this.logoBox.nativeElement.getAttribute('style'));

    this.apiService.postAPI('api/user/addProjectNameAndLogo', formData).subscribe({
      next: (res: any) => {
        if (res.success == true) {
          let projectData = {
            ...this.projectsData,
            clientEnquryId: res.data,
            selectedColor: this.selectedColor,
            projectName: this.projectName,
            projectLogo: this.imagePreview,
            logoStyle: this.logoBox.nativeElement.getAttribute('style'),
            estimated_time: this.estimatedWeeks
          }

          sessionStorage.setItem('projectData', JSON.stringify(projectData))
          this.router.navigate([`/refine-idea/${id}`])
        }
      },
      error: err => {
        this.message.error(err.error.message);
      }
    })
  }
}

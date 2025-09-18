import { Component, effect, inject } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../../services/api.service';
import { Feature } from '../../../models/projects';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from "../sidebar/sidebar.component";
import { ExchangeRatePipe } from "../../../helper/exchange-rate.pipe";
import { MobileViewComponent } from '../main/mobile-view/mobile-view.component';
import { ModalService } from '../../../services/modal.service';

@Component({
  selector: 'app-review-buildcard',
  standalone: true,
  imports: [RouterLink, CommonModule, SidebarComponent, ExchangeRatePipe, MobileViewComponent],
  templateUrl: './review-buildcard.component.html',
  styleUrl: './review-buildcard.component.css'
})
export class ReviewBuildcardComponent {
  projectsFeatures: Feature[] = [];
  projectsData: any;
  totalSubFeatures: any;
  rate: any
  private modal = inject(ModalService);
  constructor(private fb: FormBuilder, private apiService: ApiService, private router: Router) {
    effect(() => {
      this.rate = this.apiService._rate()
    })
    let projectData = sessionStorage.getItem('projectData');
    this.projectsData = JSON.parse(projectData!);
    this.projectsFeatures = this.projectsData.selectdFeature;
    this.totalSubFeatures = this.projectsData.no_of_features;
    this.apiService._htmlCode.set(sessionStorage.getItem('htmlCode'));
    this.apiService._imagePreview.set(this.projectsData.projectLogo);
    this.projectsFeatures.map((feature: any) => {
      feature.featureTime = feature.subFeatures.reduce(
        (pre: number, next: { estimated_time: number }) => pre + Number(next.estimated_time),
        0
      );
    });
  };

  canDeactivate(): Promise<boolean> | boolean {
    this.modal.inquiryProjectID.set(this.projectsData.clientEnquryId);
    return this.modal.open('Do you want to save this step as draft before leaving?');
  }
}

import { Component, Input } from '@angular/core';
import { FormBuilder, FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Feature } from '../../../models/projects';
import { ApiService } from '../../../services/api.service';
import { CommonModule } from '@angular/common';
import { ProjectData } from '../../../models/sessionData';
import { NzMessageService } from 'ng-zorro-antd/message';
import { SidebarComponent } from "../sidebar/sidebar.component";

@Component({
  selector: 'app-plan-delivery',
  standalone: true,
  imports: [RouterLink, CommonModule, FormsModule, SidebarComponent],
  templateUrl: './plan-delivery.component.html',
  styleUrl: './plan-delivery.component.css'
})
export class PlanDeliveryComponent {
  @Input() id!: string;
  projectsData: ProjectData;
  projectsFeaturs: Feature[] = [];
  commongFeaturs: any[] = [];
  totalPrice: any;
  isActiveAND = true;
  isActiveIOS = false;
  isActiveWeb = false;
  isActiveMobileSite = false;
  thirtyPercent!: number;
  twelvePercent!: number;
  projectCost: any;
  rangeValue: string = '0';
  projectSecondCost!: number;
  projectThirdCost!: number;
  devices: any[] = ['Android', 'iOS', 'Web'];
  estimatedDate: Date | undefined;
  estimatedWeeks: any;
  customWeeks: any;
  totalSubFeatures: any;
  totalFeatureCost!: number;
  featureCost!: number;
  featureSecondCost!: number;
  featureThirdCost!: number;
  customizationCost!: number;
  customizationSecondCost!: number;
  customizationThirdCost!: number;
  totalCustomizeCost!: number;
  selectedDevices: string[] = ['Android'];
  PhasesDeliverables: any[] = [{ design: "We do your designs" }, "Product Roadmap", "Clickable prototype", "Basic build", "Full build"];
  originalProjectCost: any;
  originalFeatureCost: number;
  originalCustomizationCost: number;
  constructor(private fb: FormBuilder, private apiService: ApiService, private router: Router, private message: NzMessageService) {
    let projectData = sessionStorage.getItem('projectData');
    this.projectsData = JSON.parse(projectData!);
    console.log(this.projectsData);
    const projectsFeatures: any[] = this.projectsData.selectdFeature;

    this.totalCost(projectsFeatures);
    this.featureCost = projectsFeatures.reduce((pre: any, next: { totalSubFeaturedPrice: any; }) => pre + next.totalSubFeaturedPrice, 0);
    this.customizationCost = projectsFeatures.reduce((pre: any, next: { totalCustomisationPrice: any; }) => pre + next.totalCustomisationPrice, 0) || 0;

    this.originalProjectCost = this.projectCost;
    this.originalFeatureCost = this.featureCost;
    this.originalCustomizationCost = this.customizationCost;

    this.updateCosts();

    this.projectsData?.platform?.forEach((device: string) => this.onDeviceSelect(device));
    let speed = this.projectsData?.speed === 'Fast' ? '2' : this.projectsData?.speed === 'Speedy' ? '4' : '0';
    this.onRangeChange({ target: { value: speed } });

    this.PhasesDeliverables = this.projectsData?.PhasesDeliverables || [
      { design: "We do your designs" }, "Product Roadmap", "Clickable prototype", "Basic build", "Full build"
    ];

    const today = new Date();
    this.customWeeks = this.estimatedWeeks = this.projectsData?.speed === 'Fast' ? this.projectsData?.estimated_time + 2 : this.projectsData?.speed === 'Speedy' ? this.projectsData?.estimated_time + 4 : this.projectsData?.estimated_time;
    ;
    this.estimatedDate = new Date(today);
    this.estimatedDate.setDate(today.getDate() + this.estimatedWeeks * 7);
  }

  private updateCosts(): void {
    this.projectSecondCost = this.projectCost + (this.projectCost * 12) / 100;
    this.projectThirdCost = this.projectCost + (this.projectCost * 24) / 100;

    this.featureSecondCost = this.featureCost + (this.featureCost * 12) / 100;
    this.featureThirdCost = this.featureCost + (this.featureCost * 24) / 100;

    this.customizationSecondCost = this.customizationCost + (this.customizationCost * 12) / 100;
    this.customizationThirdCost = this.customizationCost + (this.customizationCost * 24) / 100;

    this.totalPrice = this.projectCost;
    this.totalFeatureCost = this.featureCost;
    this.totalCustomizeCost = this.customizationCost;
  }

  onDeviceSelect(device: string): void {
    const index = this.selectedDevices.indexOf(device);
    const incrementValue = 0.3;

    if (index === -1) {
      this.selectedDevices.push(device);
      switch (device) {
        case 'iOS':
          this.projectsData.estimated_time = +this.projectsData.estimated_time + 3;
          this.estimatedWeeks = +this.estimatedWeeks + 3;
          break;
        case 'Web':
          this.projectsData.estimated_time = +this.projectsData.estimated_time + 2;
          this.estimatedWeeks = +this.estimatedWeeks + 2;
          break;
      }
    } else {
      if (this.selectedDevices.length > 1) {
        this.selectedDevices.splice(index, 1);
        switch (device) {
          case 'iOS':
            this.projectsData.estimated_time = +this.projectsData.estimated_time - 3;
            this.estimatedWeeks = +this.estimatedWeeks - 3;
            break;
          case 'Web':
            this.projectsData.estimated_time = +this.projectsData.estimated_time - 2;
            this.estimatedWeeks = +this.estimatedWeeks - 2;
            break;
        }
      }
    }

    this.projectCost = this.originalProjectCost * (1 + incrementValue * (this.selectedDevices.length - 1));
    this.featureCost = this.originalFeatureCost * (1 + incrementValue * (this.selectedDevices.length - 1));
    this.customizationCost = this.originalCustomizationCost * (1 + incrementValue * (this.selectedDevices.length - 1));

    this.updateCosts();
    this.applyRangeValue();
  }

  onRangeChange(event: any) {
    const today = new Date();
    this.rangeValue = event.target.value;

    if (this.rangeValue === '2') {
      this.estimatedWeeks = this.customWeeks - 2;
    } else if (this.rangeValue === '4') {
      this.estimatedWeeks = this.customWeeks - 4;
    } else {
      this.estimatedWeeks = this.customWeeks;
    }

    this.estimatedDate = new Date(today);
    this.estimatedDate.setDate(today.getDate() + this.estimatedWeeks * 7);

    this.applyRangeValue();
  }

  private applyRangeValue(): void {
    if (this.rangeValue === '2') {
      this.totalPrice = this.projectSecondCost;
      this.totalFeatureCost = this.featureSecondCost;
      this.totalCustomizeCost = this.customizationSecondCost;
    } else if (this.rangeValue === '4') {
      this.totalPrice = this.projectThirdCost;
      this.totalFeatureCost = this.featureThirdCost;
      this.totalCustomizeCost = this.customizationThirdCost;
    } else {
      this.totalPrice = this.projectCost;
      this.totalFeatureCost = this.featureCost;
      this.totalCustomizeCost = this.customizationCost;
    }
  }

  Navigate() {


    let formData = {
      formNumber: 3,
      platforms: this.selectedDevices,
      developmentSpeed: this.rangeValue == '0' ? 'Standard' : this.rangeValue == '2' ? 'Fast' : 'Speedy',
      PhasesAndDeliverables: this.PhasesDeliverables,
      featuresPrice: this.totalFeatureCost,
      customisationPrice: this.totalCustomizeCost,
      durations: this.estimatedWeeks,
      totalCost: this.totalPrice,
      currentRoutes: this.router.url,
      estimated_time: this.estimatedWeeks
    }

    this.apiService.postAPI(`api/user/addClientInquries?inquiryId=${this.projectsData.clientEnquryId}`, formData)
      .subscribe({
        next: (res: any) => {
          if (res.success) {
            this.projectsData.estimated_time = this.estimatedWeeks;

            sessionStorage.setItem('projectData', JSON.stringify({ ...this.projectsData, ...{ finalCost: this.totalPrice }, ...{ projectId: this.id }, ...{ 'featuresCost': this.totalFeatureCost }, ...{ 'customisationCost': this.totalCustomizeCost }, ...{ platform: this.selectedDevices }, ...{ speed: this.rangeValue == '0' ? 'Standard' : this.rangeValue == '2' ? 'Fast' : 'Speedy' }, ...{ estimatedDate: this.estimatedDate }, ...{ 'PhasesDeliverables': this.PhasesDeliverables } }))
            this.router.navigate([`/review-buildcard`])
          } else {
            this.message.error(res.message);
          }
        }, error: err => { this.message.error(err.error.message); }
      });
  }

  selectDeliveryPhase(event: any, item: any) {
    if (event.target.checked) {
      this.PhasesDeliverables.push(item)
    } else {
      const index = this.PhasesDeliverables.indexOf(item);
      this.PhasesDeliverables.splice(index, 1);
    }
  }

  selectDesignPhase(event: any, item: string) {
    if (event.target.checked) {
      const existingDesign = this.PhasesDeliverables.find((phase) => phase.design);
      if (existingDesign) {
        existingDesign.design = item
      } else {
        const design = {
          design: item
        }
        this.PhasesDeliverables.push(design)
      }
    }
  }

  totalCost(featureData: any) {
    this.projectCost = featureData.reduce((pre: any, next: { totalSubFeaturedPrice: any; totalCustomisationPrice: any; }) => pre + next.totalSubFeaturedPrice + next.totalCustomisationPrice, 0);
  }
}

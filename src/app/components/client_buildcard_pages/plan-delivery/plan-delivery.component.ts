import { Component, effect, inject, Input } from '@angular/core';
import { FormBuilder, FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Feature } from '../../../models/projects';
import { ApiService } from '../../../services/api.service';
import { CommonModule } from '@angular/common';
import { ProjectData } from '../../../models/sessionData';
import { NzMessageService } from 'ng-zorro-antd/message';
import { SidebarComponent } from "../sidebar/sidebar.component";
import { ExchangeRatePipe } from "../../../helper/exchange-rate.pipe";
import { MobileViewComponent } from '../main/mobile-view/mobile-view.component';
import { ModalService } from '../../../services/modal.service';

@Component({
  selector: 'app-plan-delivery',
  standalone: true,
  imports: [RouterLink, CommonModule, FormsModule, SidebarComponent, ExchangeRatePipe, MobileViewComponent],
  templateUrl: './plan-delivery.component.html',
  styleUrl: './plan-delivery.component.css'
})
export class PlanDeliveryComponent {
  @Input() id!: string;
  rate: any;
  projectsData: ProjectData;
  projectsFeaturs: Feature[] = [];
  commongFeaturs: any[] = [];
  features_cost: any;
  isActiveAND = true;
  isActiveIOS = false;
  isActiveWeb = false;
  isActiveMobileSite = false;
  thirtyPercent!: number;
  twelvePercent!: number;
  total_cost_delivery: any;
  rangeValue: string = '0';
  projectSecondCost!: number;
  projectThirdCost!: number;
  devices: any[] = ['Android', 'iOS', 'Web', 'AI Integration'];
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
  phases_deliverables: any[] = [{ design: "We do your designs" }, "Product Roadmap", "Clickable prototype", "Basic build", "Full build"];
  originalProjectCost: any;
  private modal = inject(ModalService);
  designLinkBox = false;
  designLink = '';
  originalEstimatedTime: number = 0;
  constructor(private fb: FormBuilder, private apiService: ApiService, private router: Router, private message: NzMessageService) {
    effect(() => {
      this.rate = this.apiService._rate()
    })
    let projectData = sessionStorage.getItem('projectData');
    this.projectsData = JSON.parse(projectData!);
    this.features_cost = this.projectsData.features_cost;
    this.total_cost_delivery = this.features_cost;
    this.apiService._htmlCode.set(sessionStorage.getItem('htmlCode'));
    this.apiService._imagePreview.set(this.projectsData.projectLogo);
    this.originalProjectCost = this.total_cost_delivery;

    this.updateCosts();
    this.customWeeks = this.estimatedWeeks = this.projectsData?.speed === 'Fast' ? this.projectsData?.estimated_time + 2 : this.projectsData?.speed === 'Speedy' ? this.projectsData?.estimated_time + 4 : this.projectsData?.estimated_time;

    this.projectsData?.platform?.forEach((device: string) => this.onDeviceSelect(device));
    let speed = this.projectsData?.speed === 'Fast' ? '2' : this.projectsData?.speed === 'Speedy' ? '4' : '0';
    this.onRangeChange({ target: { value: speed } });

    this.phases_deliverables = this.projectsData?.phases_deliverables || [
      { design: "We do your designs" }, "Product Roadmap", "Clickable prototype", "Basic build", "Full build"
    ];

    const today = new Date();

    this.estimatedDate = new Date(today);
    this.estimatedDate.setDate(today.getDate() + this.estimatedWeeks * 7);
  }

  private updateCosts(): void {
    this.projectSecondCost = this.total_cost_delivery + (this.total_cost_delivery * 12) / 100;
    this.projectThirdCost = this.total_cost_delivery + (this.total_cost_delivery * 24) / 100;
  }

  onDeviceSelect(device: string): void {
    const index = this.selectedDevices.indexOf(device);
    const incrementValue = 0.3;
    const today = new Date();

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

    this.total_cost_delivery = this.originalProjectCost * (1 + incrementValue * (this.selectedDevices.length - 1));
    this.estimatedDate = new Date(today);
    this.estimatedDate.setDate(today.getDate() + this.estimatedWeeks * 7);
    this.updateCosts();
    this.applyRangeValue();
  }

  onRangeChange(event: any) {
    const today = new Date();
    this.rangeValue = event.target.value;
    if (this.rangeValue === '2') {
      this.estimatedWeeks = this.projectsData.estimated_time - 2;
    } else if (this.rangeValue === '4') {
      this.estimatedWeeks = this.projectsData.estimated_time - 4;
    } else {
      this.estimatedWeeks = this.projectsData.estimated_time;
    }

    this.estimatedDate = new Date(today);
    this.estimatedDate.setDate(today.getDate() + this.estimatedWeeks * 7);

    this.applyRangeValue();
  }

  private applyRangeValue(): void {
    if (this.rangeValue === '2') {
      this.features_cost = this.projectSecondCost;
      this.totalFeatureCost = this.featureSecondCost;
      this.totalCustomizeCost = this.customizationSecondCost;
    } else if (this.rangeValue === '4') {
      this.features_cost = this.projectThirdCost;
      this.totalFeatureCost = this.featureThirdCost;
      this.totalCustomizeCost = this.customizationThirdCost;
    } else {
      this.features_cost = this.total_cost_delivery;
      this.totalFeatureCost = this.featureCost;
      this.totalCustomizeCost = this.customizationCost;
    }
  }

  Navigate() {
    let formData = {
      formNumber: 3,
      platforms: this.selectedDevices,
      development_speed: this.rangeValue == '0' ? 'Standard' : this.rangeValue == '2' ? 'Fast' : 'Speedy',
      phases_deliverables: this.phases_deliverables,
      expected_duration: this.estimatedWeeks,
      total_cost_delivery: this.features_cost,
      currentRoutes: this.router.url,
      design_url: this.designLink
    }

    this.apiService.postAPI(`api/user/addClientInquries?inquiryId=${this.projectsData.clientEnquryId}`, formData)
      .subscribe({
        next: (res: any) => {
          if (res.success) {
            this.projectsData.estimated_time = this.estimatedWeeks;

            sessionStorage.setItem('projectData', JSON.stringify({ ...this.projectsData, ...{ total_cost_delivery: this.features_cost }, ...{ projectId: this.id }, ...{ 'featuresCost': this.totalFeatureCost }, ...{ 'customisationCost': this.totalCustomizeCost }, ...{ platform: this.selectedDevices }, ...{ speed: this.rangeValue == '0' ? 'Standard' : this.rangeValue == '2' ? 'Fast' : 'Speedy' }, ...{ estimatedDate: this.estimatedDate }, ...{ 'phases_deliverables': this.phases_deliverables } }))
            this.router.navigate([`/review-buildcard`])
          } else {
            this.message.error(res.message);
          }
        }, error: err => { this.message.error(err.error.message); }
      });
  }

  selectDeliveryPhase(event: any, item: any) {
    if (event.target.checked) {
      this.phases_deliverables.push(item)
    } else {
      const index = this.phases_deliverables.indexOf(item);
      this.phases_deliverables.splice(index, 1);
    }
  }

  selectDesignPhase(event: any, item: string) {
    if (event.target.checked) {
      this.designLinkBox = false
      const existingDesign = this.phases_deliverables.find((phase) => phase.design);
      if (existingDesign) {
        existingDesign.design = item
      } else {
        const design = {
          design: item
        }
        this.phases_deliverables.push(design)
      }
      if (item == 'You have designs') {
        this.designLinkBox = true
      }
    }
  }

  totalCost(featureData: any) {
    // this.total_cost_delivery = featureData.reduce((pre: any, next: { totalSubFeaturedPrice: any; totalCustomisationPrice: any; }) => pre + next.totalSubFeaturedPrice + next.totalCustomisationPrice, 0);
  }

  canDeactivate(): Promise<boolean> | boolean {
    this.modal.inquiryProjectID.set(this.projectsData.clientEnquryId);
    return this.modal.open('Do you want to save this step as draft before leaving?');
  }
}

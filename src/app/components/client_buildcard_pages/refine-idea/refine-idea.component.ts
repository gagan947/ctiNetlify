import { Component, Input, ViewChild } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../../services/api.service';
import { Feature, FeatureResponse } from '../../../models/projects';
import { CommonModule } from '@angular/common';
import { Location } from '@angular/common';
import { NzMessageService } from 'ng-zorro-antd/message';
import { SidebarComponent } from "../sidebar/sidebar.component";

@Component({
  selector: 'app-refine-idea',
  standalone: true,
  imports: [RouterLink, CommonModule, SidebarComponent],
  templateUrl: './refine-idea.component.html',
  styleUrl: './refine-idea.component.css'
})
export class RefineIdeaComponent {
  @Input() id!: string;
  projectsData: any
  projectsFeaturs: Feature[] = [];
  allFeatures: Feature[] = [];
  commongFeaturs: any[] = [];
  totalPrice: any;
  estimatedWeeks: number | undefined;
  constructor(private fb: FormBuilder, private apiService: ApiService, private router: Router, public location: Location, private message: NzMessageService) {
    let projectData = sessionStorage.getItem('projectData');
    this.projectsData = JSON.parse(projectData!);
    this.projectsFeaturs = this.projectsData.selectdFeature
    this.estimatedWeeks = this.projectsData.estimated_time
    if (this.projectsFeaturs && this.projectsFeaturs.length > 0) {
      // this.estimatedWeeks = this.projectsFeaturs[0].estimated_time ? this.projectsFeaturs[0].estimated_time : this.projectsFeaturs[1].estimated_time ? this.projectsFeaturs[1].estimated_time : this.projectsFeaturs[2].estimated_time
      this.totalCost(this.projectsFeaturs)
    }
  }

  ngOnInit(): void {
    if (!this.projectsData.selectdFeature) {
      this.getProjects();
    }
    this.getFeatures()
  };

  getProjects() {
    this.apiService.getApi<FeatureResponse>(`api/user/fetchProjectDetailedById?projectId=${this.id}`)
      .subscribe({
        next: (res) => {
          if (res.success == true) {
            this.allFeatures = this.projectsFeaturs = res.data;
            // this.estimatedWeeks = res.data[0].estimated_time
            this.totalCost(this.projectsFeaturs)
          } else {
            // this.loading = false
          }
        },
        error: err => {
          // this.loading = false
        }
      });
  };
  getFeatures() {
    this.apiService.getApi<any>(`api/user/fetchFeaturesAndThereSubFeatures`)
      .subscribe({
        next: (res) => {
          if (res.success == true) {
            this.findDifferences(res.data, this.projectsFeaturs)
          } else {
            // this.loading = false
          }
        },
        error: err => {
          // this.loading = false
        }
      });
  };

  get connectedDropLists(): string[] {
    return this.commongFeaturs.map((_, index) => `list-${index}`);
  }


  removeFeture(feature: any) {
    this.totalPrice = this.totalPrice - feature.totalSubFeaturedPrice - feature.totalCustomisationPrice
    const commonFeatureIndex = this.commongFeaturs.findIndex(f => f.featuresName === feature.featuresName);
    if (commonFeatureIndex > -1) {
      this.commongFeaturs[commonFeatureIndex].subFeaturesList.map((item: any) => {
        item.selected = false
      })

      this.commongFeaturs[commonFeatureIndex].selected = false
      const featureIndex = this.projectsFeaturs.findIndex(f => f.featuresName === feature.featuresName);
      this.projectsFeaturs.splice(featureIndex, 1)
    }
    // this.totalPrice = this.totalPrice + feature.subFeaturesList.reduce((pre: any, next: { subFeaturedPrice: any; customisationPrice: any; }) => pre + next.subFeaturedPrice + next.customisationPrice, 0)
    // this.allFeatures = this.projectsFeaturs
  }

  removeSubFeture(features: any, item2: any) {
    this.totalPrice = this.totalPrice - item2.subFeaturedPrice - item2.customisationPrice
    const featureIndex = this.projectsFeaturs.findIndex(f => f.featuresName === features.featuresName);
    if (featureIndex > -1) {
      this.projectsFeaturs[featureIndex].totalSubFeaturedPrice = this.projectsFeaturs[featureIndex].totalSubFeaturedPrice - item2.subFeaturedPrice
      this.projectsFeaturs[featureIndex].totalCustomisationPrice = this.projectsFeaturs[featureIndex].totalCustomisationPrice - item2.customisationPrice
      this.projectsFeaturs[featureIndex].subFeaturesListWithPrice = this.projectsFeaturs[featureIndex].subFeaturesListWithPrice.filter(el => el !== item2);
      if (this.projectsFeaturs[featureIndex].subFeaturesListWithPrice.length === 0) {
        this.projectsFeaturs.splice(featureIndex, 1);
        const commonFeatureIndex = this.commongFeaturs.findIndex(f => f.featuresName === features.featuresName);
        if (commonFeatureIndex > -1) {
          this.commongFeaturs[commonFeatureIndex].selected = false
        }
      }
      this.projectsFeaturs = [...this.projectsFeaturs];

      const commonFeatureIndex = this.commongFeaturs.findIndex(f => f.featuresName === features.featuresName);
      if (commonFeatureIndex > -1) {
        this.commongFeaturs[commonFeatureIndex].subFeaturesList.map((item: any) => {
          item.subFeaturesName == item2.subFeaturesName ? item.selected = false : ''
        })
      }
    }
    this.allFeatures = this.projectsFeaturs
  }

  totalCost(featureData: any) {
    this.totalPrice = featureData.reduce((pre: any, next: { totalSubFeaturedPrice: any; totalCustomisationPrice: any; }) => pre + next.totalSubFeaturedPrice + next.totalCustomisationPrice, 0);
  }

  Navigate() {
    let no_of_features = 0;
    this.projectsFeaturs.forEach((element: any) => {
      no_of_features = no_of_features + element.countSubFeaturesName
    })

    let formData = {
      formNumber: 2,
      projectFeatures: this.projectsFeaturs,
      durations: this.estimatedWeeks,
      totalCost: this.totalPrice,
      currentRoutes: this.router.url,
      no_of_features: no_of_features
    }

    this.apiService.postAPI(`api/user/addClientInquries?inquiryId=${this.projectsData.clientEnquryId}`, formData)
      .subscribe({
        next: (res: any) => {
          if (res.success) {
            let totalCost = {
              totalCost: this.totalPrice
            }

            let selectdFeature = {
              selectdFeature: this.projectsFeaturs
            }

            let featuresCost = this.projectsFeaturs.reduce((pre: any, next: { totalSubFeaturedPrice: any; }) => pre + next.totalSubFeaturedPrice, 0)

            let customisationCost = this.projectsFeaturs.reduce((pre: any, next: { totalCustomisationPrice: any; }) => pre + next.totalCustomisationPrice, 0)

            sessionStorage.setItem('projectData', JSON.stringify({ ...this.projectsData, ...totalCost, ...selectdFeature, ...{ 'featuresCost': featuresCost }, ...{ 'no_of_features': no_of_features }, ...{ 'customisationCost': customisationCost }, ...{ 'estimated_time': this.estimatedWeeks } }))
            this.router.navigate([`/plan-delivery/${this.id}`])
          } else {
            this.message.error(res.message);
          }
        }, error: err => { this.message.error(err.error.message); }
      });
  }

  findDifferences(originalArray: any[], newArray: any[]) {
    const newFeaturesSet = new Set(newArray?.map(feature => feature.featuresName));
    const newSubFeaturesSet = new Set(newArray?.flatMap(feature => feature.subFeaturesListWithPrice.map((subFeature: any) => subFeature.subFeaturesName)));

    this.commongFeaturs = originalArray.map(f => ({
      ...f,
      selected: newFeaturesSet.has(f.featuresName),
      subFeaturesList: f.subFeaturesList.map((sf: any) => ({
        ...sf,
        selected: newSubFeaturesSet.has(sf.subFeaturesName)
      }))
    }));
  }

  selectSubFeature(features: any, items: any) {
    const featureIndex = this.projectsFeaturs.findIndex(f => f.featuresName === features.featuresName);
    if (featureIndex > -1) {
      this.projectsFeaturs[featureIndex].subFeaturesListWithPrice.push(items);
      this.projectsFeaturs[featureIndex].totalSubFeaturedPrice = this.projectsFeaturs[featureIndex].totalSubFeaturedPrice + items.subFeaturedPrice
      this.projectsFeaturs[featureIndex].totalCustomisationPrice = this.projectsFeaturs[featureIndex].totalCustomisationPrice + items.customisationPrice
      this.projectsFeaturs = [...this.projectsFeaturs];

    } else {
      this.projectsFeaturs.unshift({
        featuresName: features.featuresName,
        estimated_time: features.estimated_time,
        totalCustomisationPrice: items.customisationPrice,
        totalSubFeaturedPrice: items.subFeaturedPrice,
        subFeaturesListWithPrice: [items],
        countSubFeaturesName: items.length
      })
    }
    const commonFeatureIndex = this.commongFeaturs.findIndex(f => f.featuresName === features.featuresName);
    if (commonFeatureIndex > -1) {
      this.commongFeaturs[commonFeatureIndex].subFeaturesList.map((item: any) => {
        item == items ? item.selected = true : ''
      })
      this.commongFeaturs[commonFeatureIndex].selected = true
    }
    this.totalPrice = this.totalPrice + items.subFeaturedPrice + items.customisationPrice
    this.allFeatures = this.projectsFeaturs
  }

  selectFeature(feature: any) {
    const commonFeatureIndex = this.commongFeaturs.findIndex(f => f.featuresName === feature.featuresName);
    if (commonFeatureIndex > -1) {
      this.commongFeaturs[commonFeatureIndex].subFeaturesList.map((item: any) => {
        item.selected = true
      })

      this.commongFeaturs[commonFeatureIndex].selected = true
      this.projectsFeaturs.unshift({
        featuresName: feature.featuresName,
        estimated_time: feature.estimated_time,
        totalCustomisationPrice: feature.subFeaturesList.reduce((pre: any, next: { customisationPrice: any; }) => pre + next.customisationPrice, 0),
        totalSubFeaturedPrice: feature.subFeaturesList.reduce((pre: any, next: { subFeaturedPrice: any; }) => pre + next.subFeaturedPrice, 0),
        subFeaturesListWithPrice: feature.subFeaturesList,
        countSubFeaturesName: feature.subFeaturesList.lenght
      })
    }
    this.totalPrice = this.totalPrice + feature.subFeaturesList.reduce((pre: any, next: { subFeaturedPrice: any; customisationPrice: any; }) => pre + next.subFeaturedPrice + next.customisationPrice, 0)
    this.allFeatures = this.projectsFeaturs
  }

  search(event: any) {
    const searchTerm = event.target.value.toLowerCase();
    if (searchTerm) {
      const filteredData = this.allFeatures.filter((item: any) => item.featuresName.toLowerCase().includes(searchTerm) ||
        item.subFeaturesListWithPrice.some((subFeature: any) => subFeature.subFeaturesName.toLowerCase().includes(searchTerm)));
      this.projectsFeaturs = filteredData.length ? filteredData : [];
    } else {
      this.projectsFeaturs = [...this.allFeatures];
    }
  }

  getEstimatedTime(item: any): number {
    const subFeatured = Number(item.totalSubFeaturedPrice) || 0;
    const customisation = Number(item.totalCustomisationPrice) || 0;
    const cost = Number(this.totalPrice) || 1;
    const weeks = Number(this.estimatedWeeks) || 0;

    return Math.ceil(((subFeatured + customisation) / cost) * (weeks * 5 * 8));
  }

  getSubEstimatedTime(item: any): number {
    const subFeatured = Number(item.subFeaturedPrice) || 0;
    const customisation = Number(item.customisationPrice) || 0;
    const cost = Number(this.totalPrice) || 1;
    const weeks = Number(this.estimatedWeeks) || 0;

    return Math.ceil(((subFeatured + customisation) / cost) * (weeks * 5 * 8));
  }
}

import { Component, effect, Input, ViewChild } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../../services/api.service';
import { Feature, FeatureResponse, SubFeature } from '../../../models/projects';
import { CommonModule } from '@angular/common';
import { Location } from '@angular/common';
import { NzMessageService } from 'ng-zorro-antd/message';
import { SidebarComponent } from "../sidebar/sidebar.component";
import { ALLFeatures } from '../../../models/allfeatures';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { ExchangeRatePipe } from '../../../helper/exchange-rate.pipe';

@Component({
  selector: 'app-refine-idea',
  standalone: true,
  imports: [RouterLink, CommonModule, SidebarComponent, ExchangeRatePipe],
  templateUrl: './refine-idea.component.html',
  styleUrl: './refine-idea.component.css',

})
export class RefineIdeaComponent {
  @Input() id!: string;
  projectsData: any
  projectsFeaturs: Feature[] = [];
  allFeatures: Feature[] = [];
  commongFeaturs: any[] = [];
  totalPrice: any;
  estimatedWeeks: number | undefined;
  noOfFeaturs: number = 0
  rate: any;

  constructor(private fb: FormBuilder, private apiService: ApiService, private router: Router, public location: Location, private message: NzMessageService, private http: HttpClient) {
    let projectData = sessionStorage.getItem('projectData');
    this.projectsData = JSON.parse(projectData!);
    this.projectsFeaturs = this.projectsData.selectdFeature
    this.estimatedWeeks = this.projectsData.estimated_time
    this.totalPrice = this.projectsData.totalCost
    this.noOfFeaturs = this.projectsData.no_of_features
    effect(() => {
      this.rate = this.apiService._rate()
    })
  }

  ngOnInit(): void {
    if (!this.projectsData.selectdFeature) {
      this.getProjects();
    }
    this.getFeatures()
  }

  getProjects() {
    this.apiService.getApi<FeatureResponse>(`api/user/fetchProjectDetailedById?projectId=${this.id}`)
      .subscribe({
        next: (res) => {
          if (res.success == true) {
            this.allFeatures = this.projectsFeaturs = res.data.length > 0 ? res.data : [];
            this.projectsFeaturs.map((feature: any) => {
              feature.featureTime = feature.subFeatures.reduce(
                (pre: number, next: { estimated_time: number }) => pre + Number(next.estimated_time),
                0
              );
            });
            

            let totalTime = this.projectsFeaturs.map(feature => feature.subFeatures.reduce((pre: any, next: { estimated_time: any }) => pre + Number(next.estimated_time), 0)).reduce((pre: any, next: any) => pre + next, 0)
            this.totalPrice = (totalTime * 1750)
            this.estimatedWeeks = Math.ceil((totalTime / 8) / 5);
            this.noOfFeaturs = this.projectsFeaturs.reduce((pre: any, next: any) => pre + next.subFeatures.length, 0);

            // this.estimatedWeeks = res.data[0].estimated_time
            // this.totalCost(this.projectsFeaturs)
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
    const commonFeatureIndex = this.commongFeaturs.findIndex(f => f.featureName === feature.featureName);
    if (commonFeatureIndex > -1) {
      this.commongFeaturs[commonFeatureIndex].subFeaturesList.map((item: any) => {
        item.selected = false
      })

      this.commongFeaturs[commonFeatureIndex].selected = false
      const featureIndex = this.projectsFeaturs.findIndex(f => f.featureName === feature.featureName);
      this.projectsFeaturs.splice(featureIndex, 1)
    }
    let totalTime = this.projectsFeaturs.map(feature => feature.subFeatures.reduce((pre: any, next: { estimated_time: any }) => pre + Number(next.estimated_time), 0)).reduce((pre: any, next: any) => pre + next, 0)
    this.totalPrice = (totalTime * 1750)
    this.estimatedWeeks = Math.ceil((totalTime / 8) / 5);
    this.noOfFeaturs = this.projectsFeaturs.reduce((pre: any, next: any) => pre + next.subFeatures.length, 0);
    // this.allFeatures = this.projectsFeaturs
  }

  removeSubFeture(features: any, item2: any) {
    const featureIndex = this.projectsFeaturs.findIndex(f => f.featureName === features.featureName);
    if (featureIndex > -1) {
      this.projectsFeaturs[featureIndex].subFeatures = this.projectsFeaturs[featureIndex].subFeatures.filter(el => el !== item2);
      if (this.projectsFeaturs[featureIndex].subFeatures.length === 0) {
        this.projectsFeaturs.splice(featureIndex, 1);
        const commonFeatureIndex = this.commongFeaturs.findIndex(f => f.featuresName === features.featuresName);
        if (commonFeatureIndex > -1) {
          this.commongFeaturs[commonFeatureIndex].selected = false
        }
      }
      this.projectsFeaturs = [...this.projectsFeaturs];

      const commonFeatureIndex = this.commongFeaturs.findIndex(f => f.featureName === features.featureName);
      if (commonFeatureIndex > -1) {
        this.commongFeaturs[commonFeatureIndex].subFeaturesList.map((item: any) => {
          item.subFeatureName == item2.subFeatureName ? item.selected = false : ''
        })
      }
    }
    let totalTime = this.projectsFeaturs.map(feature => feature.subFeatures.reduce((pre: any, next: { estimated_time: any }) => pre + Number(next.estimated_time), 0)).reduce((pre: any, next: any) => pre + next, 0)
    this.totalPrice = (totalTime * 1750)
    this.estimatedWeeks = Math.ceil((totalTime / 8) / 5);
    this.noOfFeaturs = this.projectsFeaturs.reduce((pre: any, next: any) => pre + next.subFeatures.length, 0);
    this.allFeatures = this.projectsFeaturs
  }

  Navigate() {

    let formData = {
      formNumber: 2,
      projectFeatures: this.projectsFeaturs,
      durations: this.estimatedWeeks,
      totalCost: this.totalPrice,
      currentRoutes: this.router.url,
      no_of_features: this.noOfFeaturs
    }

    this.apiService.postAPI(`api/user/addClientInquries?inquiryId=${this.projectsData.clientEnquryId}`, formData)
      .subscribe({
        next: (res: any) => {
          if (res.success) {
            let totalProjectCost = {
              totalCost: this.totalPrice
            }

            let selectdFeature = {
              selectdFeature: this.projectsFeaturs
            }

            sessionStorage.setItem('projectData', JSON.stringify({ ...this.projectsData, ...totalProjectCost, ...selectdFeature, ...{ 'no_of_features': this.noOfFeaturs }, ...{ 'estimated_time': this.estimatedWeeks } }))
            this.router.navigate([`/plan-delivery/${this.id}`])
          } else {
            this.message.error(res.message);
          }
        }, error: err => { this.message.error(err.error.message); }
      });
  }

  findDifferences(originalArray: ALLFeatures[], newArray: Feature[]) {
    const newFeaturesSet = new Set(newArray?.map(feature => feature.featureName));

    const newSubFeaturesSet = new Set(newArray?.flatMap(feature => feature.subFeatures.map((subFeature) =>
      subFeature.subFeatureName)));

    this.commongFeaturs = originalArray.map(f => ({
      ...f,
      selected: newFeaturesSet.has(f.featureName),
      subFeaturesList: f.subFeatures.map((sf) => ({
        ...sf,
        selected: newSubFeaturesSet.has(sf.subFeatureName)
      }))
    }));

  }

  selectSubFeature(features: ALLFeatures, items: SubFeature) {
    const featureIndex = this.projectsFeaturs.findIndex(f => f.featureName === features.featureName);
    if (featureIndex > -1) {
      this.projectsFeaturs[featureIndex].subFeatures.push(items);

      this.projectsFeaturs = [...this.projectsFeaturs];
    } else {
      this.projectsFeaturs.unshift({
        id: features.id,
        featureName: features.featureName,
        subFeatures: [items],
        featureTime: features.subFeatures.reduce(
          (pre: number, next: { estimated_time: number }) => pre + Number(next.estimated_time),
          0
        )
      })
    }
    const commonFeatureIndex = this.commongFeaturs.findIndex(f => f.featureName === features.featureName);
    if (commonFeatureIndex > -1) {
      this.commongFeaturs[commonFeatureIndex].subFeaturesList.map((item: any) => {
        item == items ? item.selected = true : ''
      })
      this.commongFeaturs[commonFeatureIndex].selected = true
    }
    let totalTime = this.projectsFeaturs.map(feature => feature.subFeatures.reduce((pre: any, next: { estimated_time: any }) => pre + Number(next.estimated_time), 0)).reduce((pre: any, next: any) => pre + next, 0)
    this.totalPrice = (totalTime * 1750)
    this.estimatedWeeks = Math.ceil((totalTime / 8) / 5);
    this.noOfFeaturs = this.projectsFeaturs.reduce((pre: any, next: any) => pre + next.subFeatures.length, 0);
    this.allFeatures = this.projectsFeaturs
  }

  selectFeature(feature: ALLFeatures) {
    const commonFeatureIndex = this.commongFeaturs.findIndex(f => f.featureName === feature.featureName);
    if (commonFeatureIndex > -1) {
      this.commongFeaturs[commonFeatureIndex].subFeaturesList.map((item: any) => {
        item.selected = true
      })
      this.commongFeaturs[commonFeatureIndex].selected = true
      this.projectsFeaturs.unshift({
        id: feature.id,
        featureName: feature.featureName,
        subFeatures: feature.subFeatures,
        featureTime: feature.subFeatures.reduce(
          (pre: number, next: { estimated_time: number }) => pre + Number(next.estimated_time),
          0
        )
      })
    }
    let totalTime = this.projectsFeaturs.map(feature => feature.subFeatures.reduce((pre: any, next: { estimated_time: any }) => pre + Number(next.estimated_time), 0)).reduce((pre: any, next: any) => pre + next, 0)
    this.totalPrice = (totalTime * 1750)
    this.estimatedWeeks = Math.ceil((totalTime / 8) / 5);
    this.noOfFeaturs = this.projectsFeaturs.reduce((pre: any, next: any) => pre + next.subFeatures.length, 0);
    this.allFeatures = this.projectsFeaturs
  }

  search(event: any) {
    const searchTerm = event.target.value.toLowerCase();
    if (searchTerm) {
      const filteredData = this.allFeatures.filter((item: any) => item.featureName.toLowerCase().includes(searchTerm) ||
        item.subFeatures.some((subFeature: any) => subFeature.subFeatureName.toLowerCase().includes(searchTerm)));
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

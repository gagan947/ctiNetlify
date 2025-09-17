import { Component, effect, inject, Input } from '@angular/core';
import { FormBuilder } from '@angular/forms'
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../../services/api.service';
import { Feature, FeatureResponse, SubFeature } from '../../../models/projects';
import { CommonModule } from '@angular/common';
import { Location } from '@angular/common';
import { NzMessageService } from 'ng-zorro-antd/message';
import { SidebarComponent } from "../sidebar/sidebar.component";
import { ALLFeatures } from '../../../models/allfeatures';
import { HttpClient } from '@angular/common/http';
import { ExchangeRatePipe } from '../../../helper/exchange-rate.pipe';
import { DiscountModalComponent } from './discount-modal/discount-modal.component';
import { BdLoaderComponent } from '../../shared/bd-loader/bd-loader.component';
import { ModalService } from '../../../services/modal.service';

@Component({
  selector: 'app-refine-idea',
  standalone: true,
  imports: [RouterLink, CommonModule, SidebarComponent, ExchangeRatePipe, DiscountModalComponent, BdLoaderComponent],
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
  isLoading: boolean = false
  orgCommonFeatures: any[] = [];
  private modal = inject(ModalService);
  showSidebar: boolean = false
  constructor(private fb: FormBuilder, private apiService: ApiService, private router: Router, public location: Location, private message: NzMessageService, private http: HttpClient) {
    let projectData = sessionStorage.getItem('projectData');
    this.projectsData = JSON.parse(projectData!);
    this.projectsFeaturs = this.projectsData.selectdFeature
    this.estimatedWeeks = this.projectsData.estimated_time
    this.totalPrice = this.projectsData.mainCost
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
    this.isLoading = true
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
          } else {
          }
        },
        error: err => {
        }
      });
  };
  getFeatures() {
    this.isLoading = true
    this.apiService.getApi<any>(`api/user/fetchFeaturesAndThereSubFeatures`)
      .subscribe({
        next: (res) => {
          if (res.success == true) {
            this.findDifferences(res.data, this.projectsFeaturs)
            setTimeout(() => {
              this.isLoading = false
            }, 2000)
          } else {
            this.isLoading = false
          }
        },
        error: err => {
          this.isLoading = false
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
      this.projectsFeaturs[featureIndex].featureTime = this.projectsFeaturs[featureIndex].subFeatures.reduce((pre: any, next: { estimated_time: any }) => pre + Number(next.estimated_time), 0);
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
      totalCost: this.totalPrice - ((this.totalPrice * 40) / 100),
      currentRoutes: this.router.url,
      no_of_features: this.noOfFeaturs
    }

    this.apiService.postAPI(`api/user/addClientInquries?inquiryId=${this.projectsData.clientEnquryId}`, formData)
      .subscribe({
        next: (res: any) => {
          if (res.success) {
            let totalProjectCost = {
              totalCost: this.totalPrice - ((this.totalPrice * 40) / 100),
              mainCost: this.totalPrice
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

    this.commongFeaturs = this.orgCommonFeatures = originalArray.map(f => ({
      ...f,
      selected: newFeaturesSet.has(f.featureName),
      subFeaturesList: f.subFeatures.map((sf) => ({
        ...sf,
        selected: newSubFeaturesSet.has(sf.subFeatureName)
      }))
    }));

  }

  selectSubFeature(features: ALLFeatures, item: SubFeature) {
    const featureIndex = this.projectsFeaturs.findIndex(
      f => f.featureName === features.featureName
    );
    if (featureIndex > -1) {
      const subFeatureIndex = this.projectsFeaturs[featureIndex].subFeatures.findIndex(
        sf => sf.id === item.id
      );

      if (subFeatureIndex > -1) {
        this.projectsFeaturs[featureIndex].subFeatures.splice(subFeatureIndex, 1);
      } else {
        const newSub = { ...item, flashClass: 'flash-added' };
        this.projectsFeaturs[featureIndex].subFeatures.push(newSub);
        this.projectsFeaturs[featureIndex].featureTime = this.projectsFeaturs[featureIndex].subFeatures.reduce((pre: any, next: { estimated_time: any }) => pre + Number(next.estimated_time), 0);
        setTimeout(() => {
          const el = document.querySelector(
            `[data-subfeature-id="${newSub.id}"]`
          );
          if (el) {
            el.scrollIntoView({ behavior: 'instant', block: 'center' });
          }
        }, 50);

        setTimeout(() => {
          newSub.flashClass = '';
        }, 2000);
      }

      if (this.projectsFeaturs[featureIndex].subFeatures.length === 0) {
        this.projectsFeaturs.splice(featureIndex, 1);
      }
    } else {
      const newSub = { ...item, flashClass: 'flash-added' };
      const newFeature = {
        flashClass: 'flash-added',
        id: features.id,
        featureName: features.featureName,
        subFeatures: [newSub],
        featureTime: item.estimated_time
      };

      this.projectsFeaturs.unshift(newFeature);

      setTimeout(() => {
        const el = document.querySelector(
          `[data-subfeature-id="${newSub.id}"]`
        );
        if (el) {
          el.scrollIntoView({ behavior: 'instant', block: 'center' });
        }
      }, 50);

      setTimeout(() => {
        newSub.flashClass = '';
      }, 2000);
    }

    const commonFeatureIndex = this.commongFeaturs.findIndex(
      f => f.featureName === features.featureName
    );
    if (commonFeatureIndex > -1) {
      this.commongFeaturs[commonFeatureIndex].subFeaturesList.forEach(
        (sf: any) => {
          if (sf.id === item.id) {
            sf.selected = !sf.selected;
          }
        }
      );

      this.commongFeaturs[commonFeatureIndex].selected =
        this.commongFeaturs[commonFeatureIndex].subFeaturesList.some(
          (sf: any) => sf.selected
        );
    }

    const totalTime = this.projectsFeaturs
      .map(feature =>
        feature.subFeatures.reduce(
          (pre: any, next: { estimated_time: any }) =>
            pre + Number(next.estimated_time),
          0
        )
      )
      .reduce((pre: any, next: any) => pre + next, 0);

    this.totalPrice = totalTime * 1750;
    this.estimatedWeeks = Math.ceil(totalTime / 40);
    this.noOfFeaturs = this.projectsFeaturs.reduce(
      (pre: any, next: any) => pre + next.subFeatures.length,
      0
    );

    this.allFeatures = [...this.projectsFeaturs];
  }

  selectFeature(feature: ALLFeatures) {
    const commonFeatureIndex = this.commongFeaturs.findIndex(
      f => f.featureName === feature.featureName
    );

    if (commonFeatureIndex > -1) {
      this.commongFeaturs[commonFeatureIndex].subFeaturesList.forEach((item: any) => {
        item.selected = true;
      });
      this.commongFeaturs[commonFeatureIndex].selected = true;

      const newFeature = {
        id: feature.id,
        featureName: feature.featureName,
        subFeatures: feature.subFeatures,
        featureTime: feature.subFeatures.reduce(
          (pre: number, next: { estimated_time: number }) =>
            pre + Number(next.estimated_time),
          0
        ),
        flashClass: 'flash-added'
      };

      this.projectsFeaturs.unshift(newFeature);

      setTimeout(() => {
        const el = document.querySelector(
          `[data-feature-id="${newFeature.id}"]`
        );
        if (el) {
          el.scrollIntoView({ behavior: 'instant', block: 'center' });
        }
      }, 50);

      setTimeout(() => {
        newFeature.flashClass = '';
      }, 2000);
    }

    let totalTime = this.projectsFeaturs
      .map(feature =>
        feature.subFeatures.reduce(
          (pre: any, next: { estimated_time: any }) =>
            pre + Number(next.estimated_time),
          0
        )
      )
      .reduce((pre: any, next: any) => pre + next, 0);

    this.totalPrice = totalTime * 1750;
    this.estimatedWeeks = Math.ceil(totalTime / 40);
    this.noOfFeaturs = this.projectsFeaturs.reduce(
      (pre: any, next: any) => pre + next.subFeatures.length,
      0
    );
    this.allFeatures = this.projectsFeaturs;
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

  searchCoreFeatures(event: any) {
    const searchTerm = (event.target.value).toLowerCase();
    if (searchTerm) {
      const filteredData = this.orgCommonFeatures.filter((item: any) => {
        const featureMatch = item.featureName?.toLowerCase().includes(searchTerm);
        const subFeatureMatch = item.subFeaturesList?.some(
          (subFeature: any) =>
            subFeature?.subFeatureName?.toLowerCase().includes(searchTerm)
        );
        return featureMatch || subFeatureMatch;
      });

      this.commongFeaturs = filteredData.length ? filteredData : [];
    } else {
      // Reset to original data if search is empty
      this.commongFeaturs = [...this.orgCommonFeatures];
    }
  }

  canDeactivate(): Promise<boolean> | boolean {
    this.modal.inquiryProjectID.set(this.projectsData.clientEnquryId);
    return this.modal.open('Do you want to save this step as draft before leaving?');
  }
}

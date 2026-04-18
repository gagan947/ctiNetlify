import { Component, effect, inject, Input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../../services/api.service';
import { Feature, FeatureResponse, SubFeature } from '../../../models/projects';
import { CommonModule } from '@angular/common';
import { Location } from '@angular/common';
import { NzMessageService } from 'ng-zorro-antd/message';
import { SidebarComponent } from "../sidebar/sidebar.component";
import { ALLFeatures } from '../../../models/allfeatures';
import { ExchangeRatePipe } from '../../../helper/exchange-rate.pipe';
import { BdLoaderComponent } from '../../shared/bd-loader/bd-loader.component';
import { ModalService } from '../../../services/modal.service';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { SubmitButtonComponent } from '../../shared/submit-button/submit-button.component';
import { WorkspaceHeaderComponent } from "../workspace-header/workspace-header.component";

@Component({
  selector: 'app-refine-idea',
  standalone: true,
  imports: [RouterLink, CommonModule, SidebarComponent, ExchangeRatePipe, BdLoaderComponent, ScrollingModule, SubmitButtonComponent, WorkspaceHeaderComponent],
  templateUrl: './refine-idea.component.html',
  styleUrl: './refine-idea.component.css',
})
export class RefineIdeaComponent {
  @Input() id!: string;
  projectsData: any
  projectsFeaturs: Feature[] = [];
  addtionalFeatures: any[] = [];
  allFeatures: Feature[] = [];
  commongFeaturs: any[] = [];
  totalFeatureCost: number = 0;
  durations: number | undefined;
  noOfFeaturs: number = 0
  rate: any;
  isLoading: boolean = false
  orgCommonFeatures: any[] = [];
  private modal = inject(ModalService);
  showSidebar: boolean = false
  currencyCode: string = 'INR'
  userData: any
  isLoading2: boolean = false
  constructor(private apiService: ApiService, private router: Router, public location: Location, private message: NzMessageService) {
    let projectData = sessionStorage.getItem('projectData');
    this.userData = JSON.parse(localStorage.getItem('userDetailCTI') || '{}');
    this.currencyCode = this.userData.currency;
    this.projectsData = JSON.parse(projectData!);
    this.projectsFeaturs = this.projectsData.selectdFeature
    this.durations = this.projectsData.estimated_time
    this.totalFeatureCost = this.projectsData.features_cost
    this.noOfFeaturs = this.projectsData.no_of_features
    effect(() => {
      this.rate = this.apiService._rate()
    })
  }

  ngOnInit(): void {
    if (!this.projectsData.selectdFeature) {
      this.getProjects();
    }
    setTimeout(() => {
      this.getFeatures()
    }, 200);
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

            let totalTime = this.projectsFeaturs.map(feature => feature.subFeatures.reduce((pre: any, next: { estimated_time: any }) => pre + Number(next.estimated_time), 0)).reduce((pre: any, next: any) => pre + next, 0);
            this.totalFeatureCost = (totalTime * 1750);
            this.durations = Math.ceil((totalTime / 8) / 5);
            this.noOfFeaturs = this.projectsFeaturs.reduce((pre: any, next: any) => pre + next.subFeatures.length, 0);
          } else {
          }
        },
        error: () => {
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
        error: () => {
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
    this.totalFeatureCost = (totalTime * 1750)
    this.durations = Math.ceil((totalTime / 8) / 5);
    this.noOfFeaturs = this.projectsFeaturs.reduce((pre: any, next: any) => pre + next.subFeatures.length, 0);
    // this.allFeatures = this.projectsFeaturs
  }

  removeSubFeture(features: any, item2: any) {
    const featureIndex = this.addtionalFeatures.findIndex(f => f.featureName === features.featureName);
    if (featureIndex > -1) {
      this.addtionalFeatures[featureIndex].subFeatures = this.addtionalFeatures[featureIndex].subFeatures.filter((el: any) => el !== item2);
      this.addtionalFeatures[featureIndex].featureTime = this.addtionalFeatures[featureIndex].subFeatures.reduce((pre: any, next: { estimated_time: any }) => pre + Number(next.estimated_time), 0);
      if (this.addtionalFeatures[featureIndex].subFeatures.length === 0) {
        this.addtionalFeatures.splice(featureIndex, 1);
        const commonFeatureIndex = this.commongFeaturs.findIndex(f => f.featuresName === features.featuresName);
        if (commonFeatureIndex > -1) {
          this.commongFeaturs[commonFeatureIndex].selected = false
        }
      }
      this.addtionalFeatures = [...this.addtionalFeatures];
      const commonFeatureIndex = this.commongFeaturs.findIndex(f => f.featureName === features.featureName);
      if (commonFeatureIndex > -1) {
        this.commongFeaturs[commonFeatureIndex].subFeaturesList.map((item: any) => {
          item.subFeatureName == item2.subFeatureName ? item.selected = false : ''
        })
      }
    }
  }

  Navigate() {


    this.isLoading2 = true

    let formData = {
      formNumber: 2,
      projectFeatures: this.projectsFeaturs,
      durations: this.durations,
      features_cost: this.totalFeatureCost,
      currentRoutes: this.router.url,
      no_of_features: this.noOfFeaturs,
      client_currency_code: this.currencyCode,
      currency_rate: this.rate,
      additionalFeatures: this.addtionalFeatures.length > 0 ? JSON.stringify(this.addtionalFeatures) : ''
    }

    this.apiService.postAPI(`api/user/addClientInquries?inquiryId=${this.projectsData.clientEnquryId}`, formData)
      .subscribe({
        next: (res: any) => {
          if (res.success) {
            let totalFeatureCost = {
              features_cost: this.totalFeatureCost,
            }

            let selectdFeature = {
              selectdFeature: this.projectsFeaturs
            }

            sessionStorage.setItem('projectData', JSON.stringify({ ...this.projectsData, ...totalFeatureCost, ...selectdFeature, ...{ 'no_of_features': this.noOfFeaturs }, ...{ 'estimated_time': this.durations }, ...{ additionalFeatures: this.addtionalFeatures } }))
            this.router.navigate([`/code-generator/${this.projectsData.clientEnquryId}`])
            this.isLoading2 = false
          } else {
            this.message.error(res.message);
            this.isLoading2 = false
          }
        }, error: err => {
          this.message.error(err.error.message);
          this.isLoading2 = false
        }
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

    // console.log("features", features, item);
    const featureIndex = this.addtionalFeatures.findIndex(
      f => f.featureName === features.featureName
    );
    console.log("featue index", featureIndex);
    if (featureIndex > -1) {
      const subFeatureIndex = this.addtionalFeatures[featureIndex].subFeatures.findIndex((sf: any) => sf.id === item.id);
      console.log("subFeatureIndex ", subFeatureIndex);
      if (subFeatureIndex > -1) {
        this.addtionalFeatures[featureIndex].subFeatures.splice(subFeatureIndex, 1);
      } else {
        const newSub = { ...item, flashClass: 'flash-added' };
        this.addtionalFeatures[featureIndex].subFeatures.push(newSub);

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


      this.addtionalFeatures.unshift(newFeature)
      // this.projectsFeaturs.unshift(newFeature);

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

    this.totalFeatureCost = totalTime * 1750;
    this.durations = Math.ceil(totalTime / 40);
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

      this.addtionalFeatures.unshift(newFeature);
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

    this.totalFeatureCost = totalTime * 1750;
    this.durations = Math.ceil(totalTime / 40);
    this.noOfFeaturs = this.projectsFeaturs.reduce(
      (pre: any, next: any) => pre + next.subFeatures.length,
      0
    );
    this.allFeatures = this.projectsFeaturs;
  }




  getEstimatedTime(item: any): number {
    const subFeatured = Number(item.totalSubFeaturedPrice) || 0;
    const customisation = Number(item.totalCustomisationPrice) || 0;
    const cost = Number(this.totalFeatureCost) || 1;
    const weeks = Number(this.durations) || 0;

    return Math.ceil(((subFeatured + customisation) / cost) * (weeks * 5 * 8));
  }

  getSubEstimatedTime(item: any): number {
    const subFeatured = Number(item.subFeaturedPrice) || 0;
    const customisation = Number(item.customisationPrice) || 0;
    const cost = Number(this.totalFeatureCost) || 1;
    const weeks = Number(this.durations) || 0;

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

  private searchTimeout: any;
  searchCoreFeatures(event: any) {
    clearTimeout(this.searchTimeout);
    const searchTerm = (event.target.value.trim()).toLowerCase();

    this.searchTimeout = setTimeout(() => {
      if (searchTerm) {
        this.commongFeaturs = this.orgCommonFeatures.filter((item: any) => {
          const featureMatch = item.featureName?.toLowerCase().includes(searchTerm);
          const subFeatureMatch = item.subFeaturesList?.some(
            (subFeature: any) =>
              subFeature?.subFeatureName?.toLowerCase().includes(searchTerm)
          );
          return featureMatch || subFeatureMatch;
        });
      } else {
        this.commongFeaturs = [...this.orgCommonFeatures];
      }
    }, 300);
  }

  trackByFeature(index: number, item: any) {
    return item.id || index;
  }

  trackBySubFeature(index: number, item: any) {
    return item.id || index;
  }

  canDeactivate(): Promise<boolean> | boolean {
    this.modal.inquiryProjectID.set(this.projectsData.clientEnquryId);
    return this.modal.open('Do you want to save this step as draft before leaving?');
  }
}

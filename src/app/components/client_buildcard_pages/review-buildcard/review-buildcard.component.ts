import { Component } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../../services/api.service';
import { Feature } from '../../../models/projects';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from "../sidebar/sidebar.component";

@Component({
  selector: 'app-review-buildcard',
  standalone: true,
  imports: [RouterLink, CommonModule, SidebarComponent],
  templateUrl: './review-buildcard.component.html',
  styleUrl: './review-buildcard.component.css'
})
export class ReviewBuildcardComponent {
  projectsFeatures: Feature[] = [];
  projectsData: any;
  totalSubFeatures: any;
  constructor(private fb: FormBuilder, private apiService: ApiService, private router: Router) {
    let projectData = sessionStorage.getItem('projectData');
    this.projectsData = JSON.parse(projectData!);
    this.projectsFeatures = this.projectsData.selectdFeature;
    this.totalSubFeatures = this.projectsData.no_of_features
    this.projectsFeatures.map((feature: any) => {
      feature.featureTime = feature.subFeatures.reduce(
        (pre: number, next: { estimated_time: number }) => pre + Number(next.estimated_time),
        0
      );
    });
  };

}

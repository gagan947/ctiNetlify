import { Component, OnInit, OnDestroy, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-ai-loader',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ai-loader.component.html',
  styleUrls: ['./ai-loader.component.css']
})
export class AiLoaderComponent implements OnInit, OnDestroy, OnChanges {
  @Input() targetProgress: number = 0;
  @Input() currentStatus: string = "Building...";
  @Input() currentStepIndex: number = 1;
  @Input() heading1: string = "AI is building";
  @Input() heading2: string = "your app";
  @Input() subheading: string = "Turning your idea into a working product";
  @Input() stepTitles: string[] = [
    "Understanding your idea",
    "Generating application structure",
    "Building your React application",
    "Preparing your preview"
  ];

  progress = 0;
  coreStatusOpacity = 1;

  private progressInterval: any;

  ngOnInit() {
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['targetProgress']) {
      this.animateProgressTo(this.targetProgress);
    }
  }

  animateProgressTo(target: number) {
    if (this.progressInterval) clearInterval(this.progressInterval);
    this.progressInterval = setInterval(() => {
      if (this.progress < target) {
        this.progress++;
      } else if (this.progress > target) {
        this.progress--;
      } else {
        clearInterval(this.progressInterval);
      }
    }, 50);
  }

  getStepClass(stepNumber: number) {
    if (this.currentStepIndex > stepNumber) return 'completed';
    if (this.currentStepIndex === stepNumber) return 'active';
    return 'pending';
  }

  getStepSubtitle(stepNumber: number) {
    if (this.currentStepIndex > stepNumber) return 'COMPLETED';
    if (this.currentStepIndex === stepNumber) return 'IN PROGRESS';
    return 'PENDING';
  }

  ngOnDestroy() {
    if (this.progressInterval) clearInterval(this.progressInterval);
  }
}

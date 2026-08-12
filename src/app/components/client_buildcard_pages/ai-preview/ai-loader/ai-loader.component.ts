import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-ai-loader',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ai-loader.component.html',
  styleUrls: ['./ai-loader.component.css']
})
export class AiLoaderComponent implements OnInit, OnDestroy {
  progress = 64;
  statuses = [
    "Building...",
    "Writing code...",
    "Connecting components...",
    "Generating UI...",
    "Optimizing...",
    "Testing..."
  ];
  currentStatus = this.statuses[0];
  statusIndex = 0;
  coreStatusOpacity = 1;
  
  private progressTimer: any;
  private statusTimer: any;
  private completionTimer: any;

  ngOnInit() {
    this.progressTimer = setInterval(() => {
      if (this.progress < 96) {
        this.progress += Math.floor(Math.random() * 2) + 1;
        if (this.progress > 96) {
          this.progress = 96;
        }
      }
    }, 1100);

    this.statusTimer = setInterval(() => {
      this.statusIndex = (this.statusIndex + 1) % this.statuses.length;
      this.coreStatusOpacity = 0;
      setTimeout(() => {
        this.currentStatus = this.statuses[this.statusIndex];
        this.coreStatusOpacity = 1;
      }, 200);
    }, 1800);

    this.completionTimer = setTimeout(() => {
      this.progress = 100;
      this.currentStatus = "Ready!";
    }, 18000);
  }

  ngOnDestroy() {
    if (this.progressTimer) clearInterval(this.progressTimer);
    if (this.statusTimer) clearInterval(this.statusTimer);
    if (this.completionTimer) clearTimeout(this.completionTimer);
  }
}

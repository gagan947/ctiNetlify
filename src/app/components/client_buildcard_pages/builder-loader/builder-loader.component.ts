import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../../services/api.service';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
}

@Component({
  selector: 'app-builder-loader',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './builder-loader.component.html',
  styleUrl: './builder-loader.component.css'
})
export class BuilderLoaderComponent implements OnDestroy {
  messages = [
    'Processing template features...',
    'Analyzing AI layout suggestions...',
    'Optimizing builder components...',
    'Finalizing your AI environment...'
  ];
  projectId!: string | number;
  publicEnquiryId!: string | number;
  private particles: Particle[] = [];
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private particleCount = 150;
  private width = window.innerWidth;
  private height = window.innerHeight;
  private messageInterval: ReturnType<typeof setInterval> | null = null;
  private redirectTimer: ReturnType<typeof setTimeout> | null = null;
  finalSummary?: string;
  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private apiService: ApiService
  ) { }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.projectId = params['id'];
      this.publicEnquiryId = params['publicEnquiryId'];
      this.finalSummary = params['finalSummary'];
      // if (!this.projectId) {
      //   return;
      // }
      if (this.finalSummary) {
        this.apiService._finalSummary.set(this.finalSummary);
      }
      this.startMessageRotation();
      if (this.publicEnquiryId) {
        sessionStorage.setItem('publicEnquiryId', String(this.publicEnquiryId));
      }
      this.scheduleRedirect();
    });
  }

  ngOnDestroy(): void {
    if (this.messageInterval) {
      clearInterval(this.messageInterval);
      this.messageInterval = null;
    }

    if (this.redirectTimer) {
      clearTimeout(this.redirectTimer);
      this.redirectTimer = null;
    }
  }

  ngAfterViewInit() {
    this.canvas = document.getElementById('particle-canvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.resizeCanvas();

    for (let i = 0; i < this.particleCount; i++) {
      this.particles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 2 + 1
      });
    }

    requestAnimationFrame(() => this.animate());
  }

  @HostListener('window:resize', ['$event'])
  onResize(_event?: Event) {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.resizeCanvas();
  }

  private startMessageRotation(): void {
    if (this.messageInterval) {
      clearInterval(this.messageInterval);
    }

    const messageEl = document.getElementById('loading-message');
    let index = 0;

    if (messageEl) {
      messageEl.textContent = this.messages[0];
    }

    this.messageInterval = setInterval(() => {
      if (!messageEl) {
        return;
      }

      messageEl.style.opacity = '0';
      setTimeout(() => {
        index = (index + 1) % this.messages.length;
        messageEl.textContent = this.messages[index];
        messageEl.style.opacity = '1';
      }, 300);
    }, 1800);
  }

  private scheduleRedirect(): void {
    const intervalTime = 1800;
    const totalMessages = this.messages.length;
    const redirectTime = totalMessages * intervalTime + 300;

    this.redirectTimer = setTimeout(() => {
      this.router.navigate(['/code-generator', this.publicEnquiryId]);
    }, redirectTime);
  }

  private resizeCanvas() {
    this.canvas.width = this.width;
    this.canvas.height = this.height;
  }

  private animate() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];

      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0) p.x = this.width;
      if (p.x > this.width) p.x = 0;
      if (p.y < 0) p.y = this.height;
      if (p.y > this.height) p.y = 0;

      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fillStyle = '#38bdf8';
      this.ctx.fill();

      for (let j = i + 1; j < this.particles.length; j++) {
        const p2 = this.particles[j];
        const dx = p.x - p2.x;
        const dy = p.y - p2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          this.ctx.beginPath();
          this.ctx.strokeStyle = `rgba(56, 223, 248, ${1 - dist / 120})`;
          this.ctx.lineWidth = 0.5;
          this.ctx.moveTo(p.x, p.y);
          this.ctx.lineTo(p2.x, p2.y);
          this.ctx.stroke();
        }
      }
    }

    requestAnimationFrame(() => this.animate());
  }
}

import { CommonModule } from '@angular/common';
import { Component, HostListener } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
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
export class BuilderLoaderComponent {
  messages = [
    'Processing template features...',
    'Analyzing AI layout suggestions...',
    'Optimizing builder components...',
    'Finalizing your AI environment...'
  ];
  projectId!: any;
  private particles: Particle[] = [];
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private particleCount = 150;
  private width = window.innerWidth;
  private height = window.innerHeight;

  constructor(private router: Router,private route: ActivatedRoute) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.projectId = params['id'];
    });
  
    const messageEl = document.getElementById('loading-message');
    let index = 0;
  
    const intervalTime = 2000; // 2 seconds per message
    const totalMessages = this.messages.length;
  
    // Rotate messages
    const interval = setInterval(() => {
      if (messageEl) {
        messageEl.style.opacity = '0';
        setTimeout(() => {
          messageEl.textContent = this.messages[index];
          messageEl.style.opacity = '1';
        }, 500);
      }
      index = (index + 1) % totalMessages;
    }, intervalTime);
  
    // Redirect AFTER all messages have been displayed at least once
    const redirectTime = totalMessages * intervalTime + 500; // extra 0.5s for fade-in
    setTimeout(() => {
      clearInterval(interval);
      this.router.navigate(['/make-it-mine', this.projectId]);
    }, redirectTime);
  }
  

  ngAfterViewInit() {
    this.canvas = document.getElementById('particle-canvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.resizeCanvas();

    // Initialize particles
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
  onResize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.resizeCanvas();
  }

  private resizeCanvas() {
    this.canvas.width = this.width;
    this.canvas.height = this.height;
  }

  private animate() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    // Draw particles and lines
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];

      // Move particle
      p.x += p.vx;
      p.y += p.vy;

      // Wrap around edges
      if (p.x < 0) p.x = this.width;
      if (p.x > this.width) p.x = 0;
      if (p.y < 0) p.y = this.height;
      if (p.y > this.height) p.y = 0;

      // Draw particle
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fillStyle = '#38bdf8';
      this.ctx.fill();

      // Connect nearby particles
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
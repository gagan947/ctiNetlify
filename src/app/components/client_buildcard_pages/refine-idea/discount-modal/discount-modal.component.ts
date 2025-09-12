import { Component, ElementRef, ViewChild } from '@angular/core';
declare var bootstrap: any;
@Component({
  selector: 'app-discount-modal',
  standalone: true,
  imports: [],
  templateUrl: './discount-modal.component.html',
  styleUrl: './discount-modal.component.css'
})
export class DiscountModalComponent {
  @ViewChild('discountModal') modalElement!: ElementRef;

  private modalInstance: any;

  ngAfterViewInit(): void {
    this.modalInstance = new bootstrap.Modal(this.modalElement.nativeElement, {
      backdrop: 'static',
      keyboard: true
    });
    setTimeout(() => {
      this.openModal();
    }, 100);
  }

  openModal(): void {
    this.modalInstance.show();
    this.spawnConfetti(100);
  }

  closeModal(): void {
    this.modalInstance.hide();
  }


  spawnConfetti(count: number): void {
    const wrap = this.modalElement.nativeElement.querySelector('#confettiWrap');
    wrap.innerHTML = '';

    const colors = ['#FF6B6B', '#FFD166', '#6BCB77', '#4D96FF', '#B388EB', '#FF8A65', '#FFD9E1'];

    for (let i = 0; i < count; i++) {
      const el = document.createElement('div');
      el.className = 'confetti';

      el.style.left = (40 + Math.random() * 20) + '%';
      el.style.top = (-5 - Math.random() * 15) + '%';

      el.style.background = colors[Math.floor(Math.random() * colors.length)];
      el.style.width = (8 + Math.random() * 12) + 'px';
      el.style.height = (10 + Math.random() * 12) + 'px';
      el.style.opacity = '0.9';

      el.style.animationDuration = (2 + Math.random() * 2) + 's';
      el.style.animationDelay = (Math.random() * 0.35) + 's';

      el.style.transform = `translateX(${(Math.random() - 0.5) * 200}px) rotate(${Math.random() * 360}deg)`;

      wrap.appendChild(el);
    }
  }

}

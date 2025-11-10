import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, Output, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-custom-color-picker',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './custom-color-picker.component.html',
  styleUrl: './custom-color-picker.component.css'
})
export class CustomColorPickerComponent {
  open = false;
  color = '#e02424';
  @Output() colorChange = new EventEmitter<string>();
  hue = 0;
  saturation = 100;
  brightness = 50;
  alpha = 100;

  hexValue = this.color;

  swatches = [
    '#e02424', '#3b82f6', '#10b981', '#f59e0b', '#000000', '#ffffff',
    '#6366f1', '#14b8a6', '#ef4444', '#8b5cf6', '#2889e9', '#f59e0b',
  ];

  @ViewChild('satBox') satBox!: ElementRef;

  togglePicker() {
    this.open = !this.open;
  }

  startSatDrag(event: MouseEvent) {
    const box = this.satBox.nativeElement.getBoundingClientRect();

    const move = (e: any) => {
      let x = e.clientX - box.left;
      let y = e.clientY - box.top;

      x = Math.max(0, Math.min(x, box.width));
      y = Math.max(0, Math.min(y, box.height));

      this.saturation = (x / box.width) * 100;
      this.brightness = 100 - (y / box.height) * 100;

      this.applyColor();
      this.colorChange.emit(this.color);
    };

    const stop = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', stop);
    };

    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', stop);

    move(event);
  }

  applyColor() {
    const a = this.alpha / 100;
    this.color = `hsla(${this.hue}, ${this.saturation}%, ${this.brightness}%, ${a})`;
    this.colorChange.emit(this.color);
  }

  setColor(hex: string) {
    this.color = hex;
    this.hexValue = hex;
    this.colorChange.emit(this.color);
  }

  onHexChange() {
    this.color = this.hexValue;
    this.colorChange.emit(this.color);
  }
}

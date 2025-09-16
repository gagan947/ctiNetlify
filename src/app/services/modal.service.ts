import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ModalService {
  private resolver!: (value: boolean) => void;

  message = '';
  visible = false;
  inquiryProjectID = signal<any>('');

  open(message: string): Promise<boolean> {
    this.message = message;
    this.visible = true;
    return new Promise<boolean>((resolve) => (this.resolver = resolve));
  }

  close(result: boolean) {
    this.visible = false;
    this.resolver(result);
  }
}

import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'convertCurrency',
  standalone: true,
})
export class ExchangeRatePipe implements PipeTransform {

  private currencyCode: string = 'INR';
  constructor() {
    const user = JSON.parse(localStorage.getItem('userDetailCTI') || '{}');
    this.currencyCode = user.currency
  }

  transform(value: number, rate: number): string {
    if (!value || !rate) return '';
    const converted = value * rate;

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: this.currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(converted);
  }

}

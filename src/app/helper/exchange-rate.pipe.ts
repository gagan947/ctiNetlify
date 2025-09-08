import { CurrencyPipe } from '@angular/common';
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'convertCurrency',
  standalone: true,
})
export class ExchangeRatePipe implements PipeTransform {
  transform(value: number, rate: number, currencyCode: string): string {
    if (!value || !rate) return '';
    const converted = value * rate;

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(converted);
  }

}

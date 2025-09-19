import { Directive, ElementRef, EventEmitter, Input, Output, Renderer2 } from '@angular/core';
declare var Calendly: any;
@Directive({
  selector: '[appCalendlyWidget]',
  standalone: true
})
export class CalendlyDirective {
  @Input() calendlyUrl!: string;
  @Output() eventScheduled = new EventEmitter<any>();
  private loader!: HTMLElement;


  private handleCalendlyEvent = this.onCalendlyEvent.bind(this);
  constructor(private el: ElementRef, private renderer: Renderer2) { }

  ngAfterViewInit(): void {
    this.showLoader();
    this.loadWidget();
  }

  private showLoader() {
    this.loader = this.renderer.createElement('div');
    this.loader.innerHTML = '⏳ Loading calendar...';
    this.renderer.setStyle(this.loader, 'text-align', 'center');
    this.renderer.setStyle(this.loader, 'padding', '20px');
    this.renderer.setStyle(this.loader, 'font-weight', 'bold');
    this.renderer.appendChild(this.el.nativeElement, this.loader);
  }

  private hideLoader() {
    if (this.loader && this.loader.parentNode) {
      this.renderer.removeChild(this.el.nativeElement, this.loader);
    }
  }

  private loadWidget() {
    const container: HTMLElement = this.el.nativeElement;
    container.innerHTML = ''; // clear old iframe + loader

    if (this.calendlyUrl) {
      Calendly.initInlineWidget({
        url: this.calendlyUrl,
        parentElement: container,
      });

      // wait for iframe to load
      const iframe = container.querySelector('iframe');
      if (iframe) {
        iframe.addEventListener('load', () => this.hideLoader());
      }
    }
  }

  private onCalendlyEvent(e: MessageEvent) {
    if (e.origin === 'https://calendly.com' && e.data.event === 'calendly.event_scheduled') {
      console.log('Calendly event scheduled', e.data);
      this.eventScheduled.emit(e.data);
    }
  }

  ngOnDestroy(): void {
    const container: HTMLElement = this.el.nativeElement;
    container.innerHTML = '';
  }

}

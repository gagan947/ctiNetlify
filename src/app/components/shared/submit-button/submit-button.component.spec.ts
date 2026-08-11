import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SubmitButtonComponent } from './submit-button.component';

describe('SubmitButtonComponent', () => {
  let component: SubmitButtonComponent;
  let fixture: ComponentFixture<SubmitButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SubmitButtonComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SubmitButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should apply custom class on the rendered button and keep CTA styling', () => {
    component.class = 'ct_login_btn';
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button');

    expect(button).toBeTruthy();
    expect(button.classList.contains('ct_login_btn')).toBeTrue();
    expect(getComputedStyle(button).width).toBe('100%');
    expect(getComputedStyle(button).borderRadius).toBe('12px');
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CancelRefundPolicyComponent } from './cancel-refund-policy.component';

describe('CancelRefundPolicyComponent', () => {
  let component: CancelRefundPolicyComponent;
  let fixture: ComponentFixture<CancelRefundPolicyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CancelRefundPolicyComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(CancelRefundPolicyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

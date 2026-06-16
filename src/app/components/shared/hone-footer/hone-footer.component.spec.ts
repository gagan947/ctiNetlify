import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HoneFooterComponent } from './hone-footer.component';

describe('HoneFooterComponent', () => {
  let component: HoneFooterComponent;
  let fixture: ComponentFixture<HoneFooterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HoneFooterComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(HoneFooterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

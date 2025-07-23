import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SmbsComponent } from './smbs.component';

describe('SmbsComponent', () => {
  let component: SmbsComponent;
  let fixture: ComponentFixture<SmbsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SmbsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SmbsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

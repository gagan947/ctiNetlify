import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MainAiComponent } from './main-ai.component';

describe('MainAiComponent', () => {
  let component: MainAiComponent;
  let fixture: ComponentFixture<MainAiComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MainAiComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(MainAiComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

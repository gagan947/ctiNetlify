import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AiPreviewComponent } from './ai-preview.component';

describe('AiPreviewComponent', () => {
  let component: AiPreviewComponent;
  let fixture: ComponentFixture<AiPreviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiPreviewComponent,]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AiPreviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

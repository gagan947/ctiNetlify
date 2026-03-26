import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AiDevRendererComponent } from './ai-dev-renderer.component';

describe('AiDevRendererComponent', () => {
  let component: AiDevRendererComponent;
  let fixture: ComponentFixture<AiDevRendererComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiDevRendererComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AiDevRendererComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

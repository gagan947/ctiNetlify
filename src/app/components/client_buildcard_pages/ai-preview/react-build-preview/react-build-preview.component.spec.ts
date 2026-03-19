import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReactBuildPreviewComponent } from './react-build-preview.component';

describe('ReactBuildPreviewComponent', () => {
  let component: ReactBuildPreviewComponent;
  let fixture: ComponentFixture<ReactBuildPreviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReactBuildPreviewComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ReactBuildPreviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

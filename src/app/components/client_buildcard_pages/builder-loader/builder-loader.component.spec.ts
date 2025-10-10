import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BuilderLoaderComponent } from './builder-loader.component';

describe('BuilderLoaderComponent', () => {
  let component: BuilderLoaderComponent;
  let fixture: ComponentFixture<BuilderLoaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BuilderLoaderComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(BuilderLoaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

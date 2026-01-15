import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReactCodeEditorComponent } from './react-code-editor.component';

describe('ReactCodeEditorComponent', () => {
  let component: ReactCodeEditorComponent;
  let fixture: ComponentFixture<ReactCodeEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReactCodeEditorComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ReactCodeEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

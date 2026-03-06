import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserLiveProjectsComponent } from './user-live-projects.component';

describe('UserLiveProjectsComponent', () => {
  let component: UserLiveProjectsComponent;
  let fixture: ComponentFixture<UserLiveProjectsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserLiveProjectsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(UserLiveProjectsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { Component } from '@angular/core';
import { UserHeaderComponent } from "../user-header/user-header.component";
import { UserSidebarComponent } from "../user-sidebar/user-sidebar.component";
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-user-home',
  standalone: true,
  imports: [UserHeaderComponent, UserSidebarComponent, RouterOutlet],
  templateUrl: './user-home.component.html',
  styleUrl: './user-home.component.css'
})
export class UserHomeComponent {

}

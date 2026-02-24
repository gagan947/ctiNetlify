import { Component } from '@angular/core';
import { SidebarComponent } from "../sidebar/sidebar.component";

@Component({
  selector: 'app-user-plans',
  standalone: true,
  imports: [SidebarComponent],
  templateUrl: './user-plans.component.html',
  styleUrl: './user-plans.component.css'
})
export class UserPlansComponent {

}

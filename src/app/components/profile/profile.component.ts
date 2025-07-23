import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SidebarComponent } from "../client_buildcard_pages/sidebar/sidebar.component";

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [RouterLink, SidebarComponent],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css'
})
export class ProfileComponent {

}

import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SidebarComponent } from "../client_buildcard_pages/sidebar/sidebar.component";

@Component({
  selector: 'app-schedule-a-call',
  standalone: true,
  imports: [RouterLink, SidebarComponent],
  templateUrl: './schedule-a-call.component.html',
  styleUrl: './schedule-a-call.component.css'
})
export class ScheduleACallComponent {

}

import { Component } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { CalendlyDirective } from '../../../helper/directives/calendly.directive';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, CalendlyDirective, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent {
  constructor(private router: Router) { }
  LogOut() {
    localStorage.clear()
    this.router.navigate(['/'])
  }
}

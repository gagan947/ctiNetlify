import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SidebarComponent } from "../client_buildcard_pages/sidebar/sidebar.component";

@Component({
  selector: 'app-payment-sucessfull',
  standalone: true,
  imports: [RouterLink, SidebarComponent],
  templateUrl: './payment-sucessfull.component.html',
  styleUrl: './payment-sucessfull.component.css'
})
export class PaymentSucessfullComponent {

}

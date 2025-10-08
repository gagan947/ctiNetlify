import { Component } from '@angular/core';
import { FooterComponent } from "../../shared/footer/footer.component";
import { HeaderComponent } from "../../shared/header/header.component";

@Component({
  selector: 'app-cancel-refund-policy',
  standalone: true,
  imports: [FooterComponent, HeaderComponent],
  templateUrl: './cancel-refund-policy.component.html',
  styleUrl: './cancel-refund-policy.component.css'
})
export class CancelRefundPolicyComponent {

}

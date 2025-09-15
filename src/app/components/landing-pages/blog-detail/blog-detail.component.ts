import { Component } from '@angular/core';
import { FooterComponent } from "../../shared/footer/footer.component";
import { HeaderComponent } from "../../shared/header/header.component";
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-blog-detail',
  standalone: true,
    imports: [FooterComponent, HeaderComponent,RouterLink],
  templateUrl: './blog-detail.component.html',
  styleUrl: './blog-detail.component.css'
})
export class BlogDetailComponent {

}

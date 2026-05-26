import { Component } from '@angular/core';
import { HeaderComponent } from '../../shared/header/header.component';
import { FooterComponent } from '../../shared/footer/footer.component';
import { BlogCardsComponent } from '../blog-cards/blog-cards.component';
import { Meta, Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-energy',
  standalone: true,
  imports: [HeaderComponent, FooterComponent, BlogCardsComponent ,RouterLink],
  templateUrl: './energy.component.html',
  styleUrl: './energy.component.css'
})
export class EnergyComponent {
  constructor(private meta: Meta, private title: Title) {
    this.title.setTitle('Smart AI Energy Solutions for Efficient Power Management');
    this.meta.updateTag({
      name: 'description', content: 'Smart AI energy apps monitor usage, reduce costs, cut bills, and boost efficiency—helping you run your business smarter, save money, and stay sustainable.'
    })
  }
}

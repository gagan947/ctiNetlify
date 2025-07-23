import { Component } from '@angular/core';
import { FooterComponent } from '../../shared/footer/footer.component';
import { HeaderComponent } from '../../shared/header/header.component';
import { RouterLink } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';


@Component({
  selector: 'app-enterprenuers',
  standalone: true,
  imports: [HeaderComponent, FooterComponent, RouterLink],
  templateUrl: './enterprenuers.component.html',
  styleUrl: './enterprenuers.component.css'
})
export class EnterprenuersComponent {
  constructor(private meta: Meta, private title: Title) {
    this.title.setTitle(' Website & AI app Builder for Entrepreneurs | Build Startup');
    this.meta.updateTag({ name: 'description', content: 'Build, launch, and grow your app or website faster using our AI-powered our AI app and website builder — smart, affordable tools made for for startups and entrepreneurs.' })
  }
}

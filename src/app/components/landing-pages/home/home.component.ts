import { Component } from '@angular/core';
import { Meta } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { FooterComponent } from '../../shared/footer/footer.component';
import { HeaderComponent } from '../../shared/header/header.component';
import { LocationService, UserLocation } from '../../../services/location.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [FooterComponent, HeaderComponent, RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {
  location: UserLocation | null = null;
  error: string | null = null;
  constructor(private meta: Meta, private locationService: LocationService) {
    // this.fetchLocation();
    this.meta.updateTag({ name: 'description', content: 'Build next-gen apps with Creative AI. Our AI app builder and AI app generator help you create intelligent, fast, and user-friendly digital experiences with ease.' });
  }

  async fetchLocation() {
    try {
      this.location = await this.locationService.getUserLocation();
   
      this.error = null;
    } catch (err: any) {
      this.error = err;
      this.location = null;
    }
  }
}

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
    this.fetchLocation();
    this.meta.updateTag({ name: 'description', content: ' Build mobile and web apps faster with CreativeThoughts AI app builder. Turn your ideas into real apps easily, without coding hassle — smart, fast, and scalable.' });
  }

  async fetchLocation() {
    try {
      this.location = await this.locationService.getUserLocation();
      console.log('this.location', this.location);
      this.error = null;
    } catch (err: any) {
      this.error = err;
      this.location = null;
    }
  }
}

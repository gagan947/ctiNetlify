import { Component } from '@angular/core';
import { FooterComponent } from '../../shared/footer/footer.component';
import { HeaderComponent } from '../../shared/header/header.component';
import { RouterLink } from '@angular/router';
import { NguTileComponent } from '@ngu/carousel';
import { NguCarousel } from '@ngu/carousel';
import { NguCarouselDefDirective, NguCarouselNextDirective, NguCarouselPrevDirective } from '@ngu/carousel';
import { NguItemComponent } from '@ngu/carousel';


@Component({
  selector: 'app-our-story',
  standalone: true,
  imports: [HeaderComponent, FooterComponent, RouterLink, NguCarousel,
    NguTileComponent,   
    NguCarousel,
    NguCarouselDefDirective,
    NguCarouselNextDirective,
    NguCarouselPrevDirective,
    NguItemComponent],
  templateUrl: './our-story.component.html',
  styleUrl: './our-story.component.css'
})
export class OurStoryComponent {

  
}

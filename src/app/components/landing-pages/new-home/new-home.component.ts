import { Component ,AfterViewInit, OnDestroy} from '@angular/core';
import { HeaderComponent } from '../../shared/header/header.component';
import { FooterComponent } from '../../shared/footer/footer.component';
import { HomeHeaderComponent } from '../../shared/home-header/home-header.component';
import { HoneFooterComponent } from '../../shared/hone-footer/hone-footer.component';


@Component({
  selector: 'app-new-home',
  standalone: true,
  imports: [HomeHeaderComponent, FooterComponent, HoneFooterComponent],
  templateUrl: './new-home.component.html',
  styleUrl: './new-home.component.css'
})
export class NewHomeComponent {
 ngAfterViewInit(): void {
    this.setStickyPositions();
  }
setStickyPositions(): void {
  document.querySelectorAll('.ct_sticky_scroll_main').forEach((section) => {
    const stickyBoxes = section.querySelectorAll('.cti_saas_card');
    const offset = 70;
    const firstCardSpace = 160; // First card ke liye extra space

    stickyBoxes.forEach((box: Element, index: number) => {
      const topValue = index === 0
        ? firstCardSpace
        : firstCardSpace + (offset * index);

      (box as HTMLElement).style.setProperty(
        '--stick-top',
        `${topValue}px`
      );
    });
  });
}
}

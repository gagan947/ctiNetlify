import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-bd-loader',
  standalone: true,
  imports: [],
  templateUrl: './bd-loader.component.html',
  styleUrl: './bd-loader.component.css'
})
export class BdLoaderComponent {
  @Input() loadingText = ''
}

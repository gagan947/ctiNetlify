import { Component, Input } from '@angular/core';
import { Block } from '../../../../models/blocks';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-ai-dev-renderer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ai-dev-renderer.component.html',
  styleUrl: './ai-dev-renderer.component.css'
})
export class AiDevRendererComponent {

@Input() blocks: any[] = [];

trackByIndex(index: number) {
  return index;
}

copyCode(content: any[]) {
  const text = content.map(c => c.text).join('\n');
  navigator.clipboard.writeText(text);
}


}

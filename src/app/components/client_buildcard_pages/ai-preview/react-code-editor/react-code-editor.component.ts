import { CommonModule } from '@angular/common';
import { Component, Input, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NuMonacoEditorComponent, NuMonacoEditorEvent, NuMonacoEditorModel } from '@ng-util/monaco-editor';
import { NzSelectModule } from 'ng-zorro-antd/select';

interface CodeFile {
  id: string;
  name: string;
  language: 'javascript' | 'css';
  content: string;
  typedContent: string;
  status: 'pending' | 'typing' | 'done';
}

interface ReactFile {
  id: string;
  name: string;        // ProductListing.jsx
  language: 'javascript' | 'css';
  fullCode: string;
  typedCode: string;
}

@Component({
  selector: 'app-react-code-editor',
  standalone: true,
  imports: [NuMonacoEditorComponent, FormsModule, CommonModule, NzSelectModule],
  templateUrl: './react-code-editor.component.html',
  styleUrl: './react-code-editor.component.css'
})
export class ReactCodeEditorComponent {
  @Input() reactFiles: ReactFile[] = [];
  @Input() startTyping = false;
  @Input() code = '';
  @Input() language: 'javascript' | 'css' = 'javascript';
  @Input() fileName = '';
  @Input() status: 'typing' | 'done' = 'typing';

  files: CodeFile[] = [];
  activeFile!: CodeFile;
  currentIndex = 0;
  model!: NuMonacoEditorModel;
  private editor: any;
  private lastRenderedCode = '';
  options = {
    theme: 'vs-dark',
    readOnly: true,
    automaticLayout: true,
    minimap: { enabled: false },
    fontSize: 13,
    cursorBlinking: 'blink' as const,
    scrollBeyondLastLine: false,
    wordWrap: 'on' as const,
    language: this.language
  };
  languages = [
    { value: 'javascript', label: 'JavaScript' },
    { value: 'css', label: 'CSS' },
  ];


  onEditorEvent(e: NuMonacoEditorEvent) {
    if (e.type === 'init') {
      this.editor = e.editor;
      this.editor.setValue(''); // start empty
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (!this.editor) return;

    if (changes['code'] && this.code !== this.lastRenderedCode) {
      this.lastRenderedCode = this.code;

      // 1️⃣ Update content
      this.editor.setValue(this.code);

      // 2️⃣ Auto-scroll to bottom
      const model = this.editor.getModel();
      if (model) {
        const lastLine = model.getLineCount();
        this.editor.revealLine(lastLine);
      }
    }
  }


  // (Future) click from sidebar
  selectFile(file: CodeFile) {
    this.activeFile = file;
  }
}
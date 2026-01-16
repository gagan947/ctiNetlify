import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, SimpleChanges } from '@angular/core';
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
  name: string;          // ProductListing.jsx
  language: 'javascript' | 'css';
  fullCode: string;
}

@Component({
  selector: 'app-react-code-editor',
  standalone: true,
  imports: [NuMonacoEditorComponent, FormsModule, CommonModule, NzSelectModule],
  templateUrl: './react-code-editor.component.html',
  styleUrl: './react-code-editor.component.css'
})

export class ReactCodeEditorComponent {

  @Input() files: ReactFile[] = [];
  editor: any;
  @Output() typingDone = new EventEmitter<void>();
  readonly model: NuMonacoEditorModel = {
    value: '',
    language: 'javascript'
  };
  currentFileIndex = 0;
  charIndex = 0;
  typingTimer: any;

  options = {
    theme: 'vs-dark',
    readOnly: true,
    automaticLayout: true,
    minimap: { enabled: false },
    fontSize: 13,
    cursorBlinking: 'blink' as const,
    wordWrap: 'on' as const,
    scrollBeyondLastLine: false
  };

  /* ---------- Monaco Init ---------- */
  onEditorEvent(e: NuMonacoEditorEvent) {
    // grab editor ONCE
    if (!this.editor && e.editor) {
      this.editor = e.editor;

      const model = this.editor.getModel();
      model?.setValue();
    }
  }

  /* ---------- PUBLIC API ---------- */
  /** Parent will call this explicitly */
  startTyping() {
    if (!this.editor || !this.files.length) return;

    this.currentFileIndex = 0;
    this.typeNextFile();
  }

  /* ---------- Typing Engine ---------- */

  private typeNextFile() {
    if (!this.editor) return;
  
    if (this.currentFileIndex >= this.files.length) {
      this.typingDone.emit();
      return;
    }
  
    const file = this.files[this.currentFileIndex];
    const model = this.editor.getModel();
    if (!model) return;
  
    // ✅ Clear once (safe)
    model.setValue('');
  
    // ✅ Set language properly
    const monaco = (window as any).monaco;
    if (monaco) {
      monaco.editor.setModelLanguage(model, file.language);
    }
  
    const code = file.fullCode;
    let i = 0;
  
    this.typingTimer = setInterval(() => {
      if (i >= code.length) {
        clearInterval(this.typingTimer);
        this.currentFileIndex++;
        setTimeout(() => this.typeNextFile(), 300);
        return;
      }
  
      // 🔥 INSERT AT END (NOT FULL REPLACE)
      const endPos = model.getPositionAt(model.getValueLength());
  
      model.applyEdits([
        {
          range: new monaco.Range(
            endPos.lineNumber,
            endPos.column,
            endPos.lineNumber,
            endPos.column
          ),
          text: code[i],
          forceMoveMarkers: true
        }
      ]);
  
      i++;
  
      // ✅ Scroll ONLY when needed
      if (i % 20 === 0) {
        this.editor.revealLine(model.getLineCount());
      }
  
    }, 12);
  }
  
  
  
}
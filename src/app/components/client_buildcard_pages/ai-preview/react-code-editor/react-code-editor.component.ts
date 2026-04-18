import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NuMonacoEditorComponent, NuMonacoEditorEvent, NuMonacoEditorModel } from '@ng-util/monaco-editor';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { AiSocketService } from '../../../../services/ai-socket.service';

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
  activeFile: any;
  @Input() files: ReactFile[] = [];
  @Input() templateExists: boolean = false;
  generatedFiles: any = []
  editor: any;
  @Output() typingDone = new EventEmitter<void>();
  readonly model: NuMonacoEditorModel = {
    value: '',
    language: 'javascript'
  };
  currentFileIndex = 0;
  charIndex = 0;
  typingTimer: any;
  filesReady = false;
  options = {
    theme: 'vs-dark',
    readOnly: true,
    automaticLayout: true,
    minimap: { enabled: false },
    fontSize: 13,
    wordWrap: 'on' as const,
    cursorBlinking: 'solid' as const,
    cursorSmoothCaretAnimation: 'off' as const,
    renderWhitespace: 'none' as const,
    smoothScrolling: true
  };

  constructor(private aiService: AiSocketService) {

  }

  /* ---------- Monaco Init ---------- */
  onEditorEvent(e: NuMonacoEditorEvent) {
    // grab editor ONCE
    if (!this.editor && e.editor) {
      this.editor = e.editor;
      if (this.templateExists) {
        if (!this.editor) return;
        this.activeFile = this.files[0].name

        const model = this.editor.getModel();
        if (!model) return;

        const monaco = (window as any).monaco;
        if (monaco) {
          monaco.editor.setModelLanguage(model, this.files[0].language);
        }

        model.setValue(this.files[0].fullCode);

        this.editor.revealLine(1);
        this.filesReady = true;
        this.generatedFiles = this.files;
      } else {
        this.startTyping()
      }
      // model?.setValue('');
    }
  }

  /* ---------- PUBLIC API ---------- */
  /** Parent will call this explicitly */
  startTyping() {

    if (!this.editor || !this.files.length) return;

    this.currentFileIndex = 0;
    this.activeFile = this.files[0].name;

    this.typeNextFile();
  }

  /* ---------- Typing Engine ---------- */

  private typeNextFile() {
    if (!this.editor) return;

    if (this.currentFileIndex >= this.files.length) {
      this.typingDone.emit();
      this.aiService.emitCodeDone()
      this.filesReady = true;
      return;
    }

    const file = this.files[this.currentFileIndex];
    this.activeFile = file.name;
    this.generatedFiles.push(file)

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
        setTimeout(() => this.typeNextFile(), 100);
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

      if (i % 20 === 0) {
        this.editor.revealLine(model.getLineCount());
      }

    }, 5);
  }

  fileChange(fileName: any) {

    if (!this.editor) return;
    this.activeFile = fileName.name

    const model = this.editor.getModel();
    if (!model) return;

    const monaco = (window as any).monaco;
    if (monaco) {
      monaco.editor.setModelLanguage(model, fileName.language);
    }

    model.setValue(fileName.fullCode);

    this.editor.revealLine(1);
  }

}

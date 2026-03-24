import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-ai-dev-renderer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ai-dev-renderer.component.html',
  styleUrl: './ai-dev-renderer.component.css'
})
export class AiDevRendererComponent {
private readonly codeKeywords = new Set([
  'import', 'from', 'export', 'default', 'function', 'return', 'const', 'let',
  'var', 'if', 'else', 'for', 'while', 'class', 'new', 'async', 'await',
  'try', 'catch', 'switch', 'case', 'break', 'continue'
]);

private readonly codeTokenRegex =
  /(\/\/.*$|\/\*[\s\S]*?\*\/|"(?:\\.|[^"])*"|'(?:\\.|[^'])*'|`(?:\\.|[^`])*`|<\/?|\/?>|[A-Za-z_][\w-]*(?==)|\b\d+(?:\.\d+)?\b|[A-Za-z_][\w$-]*|[{}()[\].,;:+\-*/=<>&!?])/gm;

@Input() blocks: any[] = [];
@Output() actionSelected = new EventEmitter<string>();
@Output() promptSubmitted = new EventEmitter<{ blockId: string; value: string }>();

trackByIndex(index: number) {
  return index;
}

isLegacyBlock(block: any): boolean {
  return !!block && typeof block === 'object' && 'id' in block && 'text' in block;
}

isArray(value: any): boolean {
  return Array.isArray(value);
}

isStatusBlock(block: any): boolean {
  return typeof block?.id === 'string' && block.id.startsWith('status');
}

isCredentialsBlock(block: any): boolean {
  return typeof block?.id === 'string' && block.id.startsWith('credentials');
}

isActionBlock(block: any): boolean {
  return typeof block?.id === 'string'
    && block.id.startsWith('action-prompt')
    && Array.isArray(block?.text?.options);
}

isInlineCtaBlock(block: any): boolean {
  return typeof block?.id === 'string'
    && block.id.startsWith('inline-cta')
    && typeof block?.text === 'object';
}

isUserMessageBlock(block: any): boolean {
  return typeof block?.id === 'string'
    && block.id.startsWith('user-message')
    && typeof block?.text === 'string';
}

isInputBlock(block: any): boolean {
  return typeof block?.id === 'string'
    && block.id.startsWith('input-prompt')
    && typeof block?.text === 'object';
}

submitPrompt(block: any, value: string) {
  const trimmedValue = value.trim();
  if (!trimmedValue) return;

  this.promptSubmitted.emit({
    blockId: block?.id ?? '',
    value: trimmedValue
  });
}

trackByLine(_: number, row: { line?: number }) {
  return row?.line ?? _;
}

getTerminalLines(block: any): string[] {
  return Array.isArray(block?.data?.lines) ? block.data.lines : [];
}

formatTerminalLine(text: string | undefined): string {
  if (!text) {
    return '';
  }

  const escaped = this.escapeHtml(text);
  const commandMatch = text.match(/^Ran (.+?)(?: for (\d+s))?$/);

  if (commandMatch) {
    const command = this.escapeHtml(commandMatch[1]);
    const duration = commandMatch[2]
      ? ` <span class="terminal-pill">for ${this.escapeHtml(commandMatch[2])}</span>`
      : '';

    return `Ran <span class="terminal-command">${command}</span>${duration}`;
  }

  const reconnectMatch = text.match(/^(Reconnecting\.\.\.) (\d+\/\d+)$/);
  if (reconnectMatch) {
    return `<span class="terminal-reconnect">${this.escapeHtml(reconnectMatch[1])}</span> <span class="terminal-count">${this.escapeHtml(reconnectMatch[2])}</span>`;
  }

  return escaped;
}

isHeading(text: string | undefined): boolean {
  return typeof text === 'string' && text.trim().startsWith('##');
}

formatCodeLine(text: string | undefined): string {
  if (!text) {
    return '';
  }

  if (this.isHeading(text)) {
    return this.escapeHtml(text);
  }

  let result = '';
  let lastIndex = 0;

  for (const match of text.matchAll(this.codeTokenRegex)) {
    const token = match[0];
    const index = match.index ?? 0;

    result += this.escapeHtml(text.slice(lastIndex, index));
    result += `<span class="${this.getTokenClass(token)}">${this.escapeHtml(token)}</span>`;
    lastIndex = index + token.length;
  }

  result += this.escapeHtml(text.slice(lastIndex));
  return result;
}

copyCode(content: Array<{ text?: string }>) {
  const text = content
    .map(row => row?.text ?? '')
    .join('\n');

  navigator.clipboard.writeText(text);
}

private getTokenClass(token: string): string {
  if (token.startsWith('//') || token.startsWith('/*')) {
    return 'token-comment';
  }

  if (/^["'`]/.test(token)) {
    return 'token-string';
  }

  if (token === '</' || token === '<' || token === '/>' || token === '>') {
    return 'token-tag';
  }

  if (/^\d/.test(token)) {
    return 'token-number';
  }

  if (this.codeKeywords.has(token)) {
    return 'token-keyword';
  }

  if (/^(path|element|placeholder|className|type|name|value|email|password|id|src|href)$/.test(token)) {
    return 'token-attr';
  }

  if (/^[A-Z][\w$-]*$/.test(token)) {
    return 'token-component';
  }

  if (/^[{}()[\].,;:+\-*/=<>&!?]$/.test(token)) {
    return 'token-operator';
  }

  return 'token-plain';
}

private escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}


}

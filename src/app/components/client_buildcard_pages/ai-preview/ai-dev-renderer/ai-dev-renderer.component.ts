import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-ai-dev-renderer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ai-dev-renderer.component.html',
  styleUrl: './ai-dev-renderer.component.css'
})
export class AiDevRendererComponent implements OnChanges {
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
  @Output() contentRendered = new EventEmitter<void>();
  @Input() isLoading = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['blocks']) {
      this.contentRendered.emit();
    }
  }

  expandedRows = new Set<string>();

  constructor() {
    console.log(this.isLoading);
  }

  trackByIndex(index: number) {
    return index;
  }

  toggleRow(key: string): void {
    if (this.expandedRows.has(key)) {
      this.expandedRows.delete(key);
    } else {
      this.expandedRows.add(key);
    }
  }

  isRowExpanded(key: string): boolean {
    return this.expandedRows.has(key);
  }

  hasNewerProgressBlock(currentIndex: number): boolean {
    if (!this.blocks) {
      return false;
    }
    for (let j = currentIndex + 1; j < this.blocks.length; j++) {
      const nextBlock = this.blocks[j];
      if (nextBlock && nextBlock.type === 'ai-progress') {
        return true;
      }
    }
    return false;
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

  isSuccessInlineCta(block: any): boolean {
    if (!this.isInlineCtaBlock(block)) return false;
    const id = String(block?.id || '');
    const variant = block?.text?.variant;
    const msg = String(block?.text?.message || '');
    return id.startsWith('inline-cta-success') || variant === 'success' || variant === 'project-ready' || msg.includes('ready!');
  }

  getCreditLimitTitle(block: any): string {
    if (block?.text?.title) {
      return block.text.title;
    }
    const msg = String(block?.text?.message || '');
    if (msg.includes('free credits')) {
      return 'You’ve used all your free credits for now.';
    }
    if (msg.includes('running low')) {
      return 'You’re running low on credits.';
    }
    return 'Credit Balance Update';
  }

  isUserMessageBlock(block: any): boolean {
    return typeof block?.id === 'string' && block.id.startsWith('user-message');
  }

  isImageAttachment(file: any): boolean {
    if (!file) return false;
    if (file.previewType === 'image' || file.type === 'image') return true;
    const url = String(file.previewUrl || file.url || file.fileName || file.originalName || '');
    return /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(url) || url.startsWith('data:image/');
  }

  isVideoAttachment(file: any): boolean {
    if (!file) return false;
    if (file.previewType === 'video' || file.type === 'video') return true;
    const url = String(file.previewUrl || file.url || file.fileName || file.originalName || '');
    return /\.(mp4|webm|ogg|mov)$/i.test(url) || url.startsWith('data:video/');
  }

  isPdfAttachment(file: any): boolean {
    if (!file) return false;
    if (file.previewType === 'pdf' || file.type === 'pdf' || file.mimeType === 'application/pdf') return true;
    const url = String(file.previewUrl || file.url || file.fileName || file.originalName || '');
    return /\.pdf$/i.test(url);
  }

  isInputBlock(block: any): boolean {
    return typeof block?.id === 'string'
      && block.id.startsWith('input-prompt')
      && typeof block?.text === 'object';
  }

  isPhaseHeadingBlock(block: any): boolean {
    return this.isLegacyBlock(block) && block?.variant === 'phase';
  }

  isSupportParagraphBlock(block: any): boolean {
    return this.isLegacyBlock(block) && block?.variant === 'support';
  }

  getSummaryEyebrow(block: any): string {
    if (typeof block?.data?.meta === 'string' && block.data.meta.trim()) {
      return block.data.meta;
    }

    if (typeof block?.data?.time === 'string' && block.data.time.trim()) {
      return `Worked for ${block.data.time}`;
    }

    return 'Update';
  }

  isBuildSectionBlock(block: any): boolean {
    return block?.type === 'build-section';
  }

  isAiProgressBlock(block: any): boolean {
    return block?.type === 'ai-progress';
  }

  getAiProgressLogs(block: any): string[] {
    return Array.isArray(block?.data?.logs) ? block.data.logs : [];
  }

  getAiProgressPercentage(block: any): number {
    const percentage = Number(block?.data?.percentage ?? 0);
    if (!Number.isFinite(percentage)) {
      return 0;
    }

    return Math.max(0, Math.min(100, Math.round(percentage)));
  }

  getAiProgressCommand(block: any): string {
    // const step = String(block?.data?.step || 'ai_processing').trim();
    const message = String(block?.data?.message || 'Working on requested changes').trim();
    return `${message}`;
  }

  getAiProgressMeta(block: any): string {
    const logsCount = this.getAiProgressLogs(block).length;
    if (!logsCount) {
      return 'Agent is preparing updates';
    }

    return `${logsCount} AI agent message${logsCount === 1 ? '' : 's'}`;
  }

  getAiProgressLogTitle(log: string): string {
    const text = String(log || '').trim();
    if (!text) {
      return 'Running task';
    }

    if (/rewriting|updating|applying|generated|created/i.test(text)) {
      return text.replace(/\.$/, '');
    }

    return text.replace(/\.$/, '');
  }

  isFileActivityBlock(block: any): boolean {
    return block?.type === 'file' || block?.type === 'code';
  }

  isFileActivityPending(block: any): boolean {
    return !!block?.data?.pending;
  }

  getFileActivityTitle(block: any): string {
    return block?.data?.title || 'updating file';
  }

  getFileActivitySummary(block: any): string {
    return block?.data?.summary || 'Prepared this file as part of the current build step.';
  }

  getBuildSectionItems(block: any): any[] {
    return Array.isArray(block?.data?.items) ? block.data.items : [];
  }

  handlePromptKeydown(event: KeyboardEvent, block: any, value: string): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.submitPrompt(block, value);
    }
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

  isTerminalRunningLine(block: any, lineIndex: number): boolean {
    const lines = this.getTerminalLines(block);
    return block?.type === 'terminal' && block?.data?.done === false && lineIndex === lines.length - 1;
  }

  getTerminalLineClass(text: string | undefined): string {
    if (!text) {
      return '';
    }

    if (/^structure\s+\|/i.test(text)) {
      return 'is-structure';
    }

    if (/^file_writer\s+\|/i.test(text)) {
      return 'is-file-writer';
    }

    if (/^httpx\s+\|/i.test(text)) {
      return 'is-httpx';
    }

    if (/^llm_client\s+\|/i.test(text)) {
      return 'is-llm';
    }

    if (/^builder\s+\|/i.test(text)) {
      return 'is-builder';
    }

    if (/^api\s+\|/i.test(text)) {
      return 'is-api';
    }

    return '';
  }

  formatTerminalLine(text: string | undefined): string {
    if (!text) {
      return '';
    }

    const escaped = this.escapeHtml(text);
    const simpleLogMatch = text.match(/^([\w.-]+)\s+\|\s+(.+)$/);

    if (simpleLogMatch) {
      return `<span class="simple-log-module">${this.escapeHtml(simpleLogMatch[1])}</span> <span class="pm2-sep">|</span> <span class="simple-log-message">${this.escapeHtml(simpleLogMatch[2])}</span>`;
    }

    const pm2LogMatch = text.match(/^(\d+\|[\w-]+)\s+\|\s+([\d-]+\s[\d:,]+)\s+\|\s+([A-Z]+)\s+\|\s+([\w.-]+)\s+\|\s+(.+)$/);

    if (pm2LogMatch) {
      return `<span class="pm2-prefix">${this.escapeHtml(pm2LogMatch[1])}</span> <span class="pm2-sep">|</span> <span class="pm2-time">${this.escapeHtml(pm2LogMatch[2])}</span> <span class="pm2-sep">|</span> <span class="pm2-level">${this.escapeHtml(pm2LogMatch[3])}</span> <span class="pm2-sep">|</span> <span class="pm2-module">${this.escapeHtml(pm2LogMatch[4])}</span> <span class="pm2-sep">|</span> <span class="pm2-message">${this.escapeHtml(pm2LogMatch[5])}</span>`;
    }

    const fileWriteMatch = text.match(/^\s*(?:->|✓)\s+(.+)$/);
    if (fileWriteMatch) {
      return `<span class="pm2-check">✓</span> <span class="pm2-file">${this.escapeHtml(fileWriteMatch[1])}</span>`;
    }

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

  isCustomizationCardBlock(block: any): boolean {
    return block?.type === 'customization-card';
  }

  isCustomizationCompletedBlock(block: any): boolean {
    return block?.type === 'customization-completed';
  }

  isLatestCustomizationCompletedBlock(block: any): boolean {
    if (!this.blocks || !this.blocks.length) return false;
    for (let i = this.blocks.length - 1; i >= 0; i--) {
      const b = this.blocks[i];
      if (this.isCustomizationCompletedBlock(b) || this.isInlineCtaBlock(b)) {
        return b === block;
      }
    }
    return false;
  }

  isCustomizationProgressBlock(block: any): boolean {
    return block?.type === 'customization-progress';
  }

  getCurrentQuestion(block: any): any {
    if (!block?.data?.questions || !block.data.questions.length) return null;
    const index = block.data.currentQuestionIndex || 0;
    return block.data.questions[index] || block.data.questions[0];
  }

  isCurrentMultiQuestionAnswered(block: any): boolean {
    const q = this.getCurrentQuestion(block);
    if (!q) return false;
    return !!(block?.data?.selectedMultiOptionsMap && block.data.selectedMultiOptionsMap[q.questionId]);
  }

  isMultiQuestionOptionChecked(block: any, questionId: string, optionId: string): boolean {
    return !!(block?.data?.selectedMultiOptionsMap && block.data.selectedMultiOptionsMap[questionId] === optionId);
  }

  selectMultiQuestionOption(block: any, questionId: string, optionId: string): void {
    if (block?.data?.answered) return;
    if (!block.data) block.data = {};
    if (!block.data.selectedMultiOptionsMap) block.data.selectedMultiOptionsMap = {};
    block.data.selectedMultiOptionsMap[questionId] = optionId;
  }

  prevMultiQuestion(block: any): void {
    if (block?.data?.currentQuestionIndex && block.data.currentQuestionIndex > 0) {
      block.data.currentQuestionIndex--;
    }
  }

  nextMultiQuestion(block: any): void {
    const questions = block?.data?.questions;
    const currentIndex = block?.data?.currentQuestionIndex || 0;
    if (Array.isArray(questions) && currentIndex < questions.length - 1) {
      block.data.currentQuestionIndex = currentIndex + 1;
    }
  }

  isLastMultiQuestion(block: any): boolean {
    const questions = block?.data?.questions;
    if (!Array.isArray(questions) || !questions.length) return true;
    const currentIndex = block?.data?.currentQuestionIndex || 0;
    return currentIndex >= questions.length - 1;
  }

  toggleCustomizationOption(block: any, optionId: string): void {
    if (block?.data?.answered) return;
    if (!block.data) block.data = {};
    const isAlreadyChecked = !!(block.data.selectedOptionsMap && block.data.selectedOptionsMap[optionId]);
    if (isAlreadyChecked) {
      block.data.selectedOptionsMap = {};
    } else {
      block.data.selectedOptionsMap = { [optionId]: true };
    }
  }

  isOptionChecked(block: any, optionId: string): boolean {
    return !!(block?.data?.selectedOptionsMap && block.data.selectedOptionsMap[optionId]);
  }

  hasSelectedOptions(block: any): boolean {
    if (!block?.data) return false;
    if (Array.isArray(block.data.questions) && block.data.questions.length > 0) {
      const selectedMap = block.data.selectedMultiOptionsMap || {};
      return block.data.questions.every((q: any) => !!selectedMap[q.questionId]);
    }
    return !!(block.data.selectedOptionsMap && Object.values(block.data.selectedOptionsMap).some(v => !!v));
  }

  submitCustomizationCard(block: any): void {
    if (block?.data?.answered) return;

    if (Array.isArray(block.data?.questions) && block.data.questions.length > 0) {
      const selectedMultiMap = block.data.selectedMultiOptionsMap || {};
      const selectedOptions: any[] = [];
      const answersList: string[] = [];

      for (const q of block.data.questions) {
        const selectedId = selectedMultiMap[q.questionId];
        if (selectedId) {
          const opt = q.options?.find((o: any) => o.id === selectedId);
          if (opt) {
            selectedOptions.push({
              questionId: q.questionId,
              id: opt.id,
              label: opt.label
            });
            answersList.push(opt.label);
          }
        }
      }

      if (!selectedOptions.length) return;

      block.data.answered = true;
      const selectedLabels = answersList.join(', ');
      block.data.userInputAnswer = selectedLabels;

      this.actionSelected.emit(`submit_customization_options:${JSON.stringify({
        blockId: block.id,
        selectedOptions,
        requestId: block.data?.requestId || null,
        questionId: block.data?.questionId || null
      })}`);
      return;
    }

    if (!block?.data?.options) return;
    const selectedOptions = block.data.options.filter((opt: any) => this.isOptionChecked(block, opt.id));
    if (!selectedOptions.length) return;

    block.data.answered = true;
    const selectedLabels = selectedOptions.map((opt: any) => opt.label).join(', ');
    block.data.userInputAnswer = selectedLabels;

    this.actionSelected.emit(`submit_customization_options:${JSON.stringify({
      blockId: block.id,
      selectedOptions,
      requestId: block.data?.requestId || null,
      questionId: block.data?.questionId || null
    })}`);
  }

  autoAnswerCustomizationCard(block: any): void {
    if (block?.data?.answered) return;
    if (Array.isArray(block.data?.questions) && block.data.questions.length > 0) {
      if (!block.data.selectedMultiOptionsMap) block.data.selectedMultiOptionsMap = {};
      for (const q of block.data.questions) {
        if (!block.data.selectedMultiOptionsMap[q.questionId] && q.options?.length) {
          block.data.selectedMultiOptionsMap[q.questionId] = q.options[0].id;
        }
      }
      block.data.currentQuestionIndex = block.data.questions.length - 1;
      this.submitCustomizationCard(block);
      return;
    }
    if (!block?.data?.options?.length) return;
    if (!this.hasSelectedOptions(block)) {
      if (!block.data.selectedOptionsMap) block.data.selectedOptionsMap = {};
      block.data.selectedOptionsMap[block.data.options[0].id] = true;
    }
    this.submitCustomizationCard(block);
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

import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'filePreview' })
export class FilePreviewPipe implements PipeTransform {
  transform(file: File): string {
    return URL.createObjectURL(file);
  }
}

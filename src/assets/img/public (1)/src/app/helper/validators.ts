import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms'

export function strongPasswordValidator(
      control: AbstractControl
): ValidationErrors | null {
      const value = control.value || ''

      const hasUpperCase = /[A-Z]/.test(value)
      const hasLowerCase = /[a-z]/.test(value)
      const hasNumeric = /[0-9]/.test(value)
      const hasSpecialCharacter = /[!@#$%^&*(),.?":{}|<>]/.test(value)
      const isValidLength = value.length >= 8

      const passwordValid =
            hasUpperCase &&
            hasLowerCase &&
            hasNumeric &&
            hasSpecialCharacter &&
            isValidLength

      // Return errors object or null
      if (!passwordValid) {
            return {
                  strongPassword: {
                        hasUpperCase: hasUpperCase,
                        hasLowerCase: hasLowerCase,
                        hasNumeric: hasNumeric,
                        hasSpecialCharacter: hasSpecialCharacter,
                        isValidLength: isValidLength
                  }
            }
      }
      return null
}

export function passwordMismatchValidator(): ValidatorFn {
      return (control: AbstractControl): { [key: string]: boolean } | null => {
            const password = control.get('newPassword');
            const confirmPassword = control.get('confirmPassword');

            if (!password || !confirmPassword) {
                  return null;
            }

            return password.value !== confirmPassword.value ? { passwordMismatch: true } : null;
      };
}

export function passwordMatchValidator(): ValidatorFn {
      return (control: AbstractControl): ValidationErrors | null => {
            const currentPassword = control.get('password')?.value;
            const newPassword = control.get('newPassword')?.value;
            if (!currentPassword || !newPassword) return null;

            return currentPassword === newPassword
                  ? { sameAsCurrent: true }
                  : null;
      };
}


export function dateRangeValidator(): ValidatorFn {
      return (control: AbstractControl): ValidationErrors | null => {
            const startDate = control.get('start_date')?.value;
            const endDate = control.get('end_date')?.value;

            if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
                  return { dateRangeInvalid: true };
            } else {
                  return { dateRangeInvalid: false };
            }
            return null;
      };
}

export class whiteSpaceValidator {
      static validate: any | string
      static cannotContainSpace(control: AbstractControl): ValidationErrors | null {
            if ((control.value as string).indexOf(' ') >= 0) {
                  return { cannotContainSpace: true }
            }
            return null;
      }
}

export class NoWhitespaceDirective {
      static validate(control: AbstractControl): ValidationErrors | null {
            if (!control.value || control.value.trim() == '') {
                  return { required: true };
            }
            return null;
      }
}


export function gstValidator(): ValidatorFn {
      return (control: AbstractControl): ValidationErrors | null => {
            const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$/;

            if (!control.value) return null; // If empty, validation passes

            return gstRegex.test(control.value) ? null : { invalidGST: true };
      };
}

export function timeRangeValidator(): ValidatorFn {
      return (group: AbstractControl): ValidationErrors | null => {
            const open = group.get('start_time')?.value;
            const close = group.get('end_time')?.value;

            if (!open || !close) return null;

            const openTime = parseTime(open);
            const closeTime = parseTime(close);

            if (!openTime || !closeTime) return null;
            return closeTime <= openTime ? { timeRangeInvalid: true } : null;
      };
}

function parseTime(time: string): number {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
}

export function integerValidator(control: AbstractControl) {
      const value = control.value;
      return Number.isInteger(Number(value)) ? null : { notInteger: true };
}
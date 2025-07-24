import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
      providedIn: 'root'
})
export class LoaderService {

      private _showLoader = new BehaviorSubject<boolean>(false);
      showLoader$ = this._showLoader.asObservable();

      show() {
            this._showLoader.next(true);
      }

      hide() {
            this._showLoader.next(false);
      }

      get isLoading(): boolean {
            return this._showLoader.getValue();
      }
}

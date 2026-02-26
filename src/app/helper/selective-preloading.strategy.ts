import { Injectable } from '@angular/core';
import { Route, PreloadingStrategy } from '@angular/router';
import { Observable, of } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SelectivePreloadingStrategy implements PreloadingStrategy {

  preload(route: Route, load: () => Observable<any>): Observable<any> {

    if (route.data && route.data['preload']) {
      // ✅ DEBUG LOG
      console.log('🔥 Preloading route:', route.path);

      return load();
    } else {
      // Optional debug (you can remove later)
      // console.log('⏭️ Skipping preload:', route.path);

      return of(null);
    }
  }

}
import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { InMemoryScrollingOptions, PreloadAllModules, provideRouter, withComponentInputBinding, withInMemoryScrolling, withPreloading } from '@angular/router';
import { routes } from './app.routes';
import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { AuthInterceptor } from './interceptor/auth.interceptor';
import { provideAnimations } from '@angular/platform-browser/animations';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
const scrollConfig: InMemoryScrollingOptions = {
  scrollPositionRestoration: 'top',
  anchorScrolling: 'enabled',
};

const firebaseConfig = {
  apiKey: "AIzaSyDAhaDNGbFyFAnDa-M5dt1iumtbl5NSu-U",
  authDomain: "creative-ai-a17ae.firebaseapp.com",
  projectId: "creative-ai-a17ae",
  storageBucket: "creative-ai-a17ae.firebasestorage.app",
  messagingSenderId: "316919446938",
  appId: "1:316919446938:web:9a74bd17bafe8c7b6f8e23",
  measurementId: "G-CZMF0RJ5K4"
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideFirebaseApp(() => initializeApp(firebaseConfig)),
    provideAuth(() => getAuth()),
    provideAnimations(),
    importProvidersFrom(DragDropModule),
    provideHttpClient(
      withInterceptorsFromDi()
    ),
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
    provideRouter(routes, withPreloading(PreloadAllModules), withComponentInputBinding(), withInMemoryScrolling(scrollConfig))]
};

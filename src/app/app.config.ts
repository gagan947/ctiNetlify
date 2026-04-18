import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { InMemoryScrollingOptions, provideRouter, withComponentInputBinding, withInMemoryScrolling, withPreloading } from '@angular/router';
import { routes } from './app.routes';
import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { AuthInterceptor } from './interceptor/auth.interceptor';
import { provideAnimations } from '@angular/platform-browser/animations';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { SelectivePreloadingStrategy } from './helper/selective-preloading.strategy';
import { MonacoEditorModule } from 'ngx-monaco-editor-v2';
import { NzModalModule } from 'ng-zorro-antd/modal';

const scrollConfig: InMemoryScrollingOptions = {
  scrollPositionRestoration: 'top',
  anchorScrolling: 'enabled',
};

export const appConfig: ApplicationConfig = {
  providers: [
    importProvidersFrom(MonacoEditorModule.forRoot()),
    importProvidersFrom(NzModalModule),

    provideAnimations(),
    importProvidersFrom(DragDropModule),
    provideHttpClient(
      withInterceptorsFromDi()
    ),

    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
    provideRouter(routes, withPreloading(SelectivePreloadingStrategy), withComponentInputBinding(), withInMemoryScrolling(scrollConfig))]
};

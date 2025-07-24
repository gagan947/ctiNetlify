import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
      {
            path: '',
            loadComponent: () => import('./components/main/main.component').then(m => m.MainComponent),
            pathMatch: 'full'
      },
      {
            path: 'privecy-policy',
            loadComponent: () => import('./components/privecy-policy/privecy-policy.component').then(m => m.PrivecyPolicyComponent)
      },
      {
            path: 'terms-of-use',
            loadComponent: () => import('./components/terms-of-use/terms-of-use.component').then(m => m.TermsOfUseComponent)
      },
      {
            path: 'contact-us',
            loadComponent: () => import('./components/contact-us/contact-us.component').then(m => m.ContactUsComponent)
      },
      {
            path: 'about-us',
            loadComponent: () => import('./components/about-us/about-us.component').then(m => m.AboutUsComponent)
      },
      {
            path: 'faq',
            loadComponent: () => import('./components/faq/faq.component').then(m => m.FAQComponent)
      },
      {
            path: '**',
            loadComponent: () => import('./components/page-not-found/page-not-found.component').then(m => m.PageNotFoundComponent),
      }
];

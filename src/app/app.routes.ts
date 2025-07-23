import { Routes } from '@angular/router';

export const routes: Routes = [
      {
            path: 'login', loadComponent: () => import('./components/login/login.component').then(c => c.LoginComponent)
      },
      {
            path: 'signup', loadComponent: () => import('./components/signup/signup.component').then(c => c.SignupComponent)
      },
      {
            path: 'dashboard', loadComponent: () => import('./components/dashboard/dashboard.component').then(c => c.DashboardComponent)
      },
      {
            path: 'free-demo', loadComponent: () => import('./components/free-demo/free-demo.component').then(c => c.FreeDemoComponent)
      },
      {
            path: 'main', loadComponent: () => import('./components/client_buildcard_pages/main/main.component').then(c => c.MainComponent)
      },
      {
            path: 'make-it-mine/:id', loadComponent: () => import('./components/client_buildcard_pages/main/make-it-mine/make-it-mine.component').then(c => c.MakeItMineComponent)
      },
      {
            path: 'schedule-a-call', loadComponent: () => import('./components/schedule-a-call/schedule-a-call.component').then(c => c.ScheduleACallComponent)
      },
      {
            path: 'refine-idea/:id', loadComponent: () => import('./components/client_buildcard_pages/refine-idea/refine-idea.component').then(c => c.RefineIdeaComponent)
      },
      {
            path: 'plan-delivery/:id', loadComponent: () => import('./components/client_buildcard_pages/plan-delivery/plan-delivery.component').then(c => c.PlanDeliveryComponent)
      },
      {
            path: 'review-buildcard', loadComponent: () => import('./components/client_buildcard_pages/review-buildcard/review-buildcard.component').then(c => c.ReviewBuildcardComponent)
      },
      {
            path: 'billing-details', loadComponent: () => import('./components/client_buildcard_pages/billing-details/billing-details.component').then(c => c.BillingDetailsComponent)
      },
      {
            path: 'payment-plan', loadComponent: () => import('./components/client_buildcard_pages/payment-plan/payment-plan.component').then(c => c.PaymentPlanComponent)
      },
      {
            path: 'payment-detail', loadComponent: () => import('./components/client_buildcard_pages/payment-detail/payment-detail.component').then(c => c.PaymentDetailComponent)
      },
      {
            path: 'payment-sucessfull', loadComponent: () => import('./components/payment-sucessfull/payment-sucessfull.component').then(c => c.PaymentSucessfullComponent)
      },
      {
            path: 'profile', loadComponent: () => import('./components/profile/profile.component').then(c => c.ProfileComponent)
      },
      {
            path: '', loadChildren: () => import('./components/landing-pages/landing.routes').then(r => r.LandingRoutes)
      },
      {
            path: 'user', loadChildren: () => import('./components/user-section/user.routes').then(r => r.UserRoutes)
      }
];

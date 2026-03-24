import { Routes } from '@angular/router';
import { canDeactivateGuard } from './helper/guards/can-deactivate.guard';
import { loginGuard } from './guard/login.guard';
import { authGuard } from './guard/auth.guard';

export const routes: Routes = [
      {
            path: 'login', loadComponent: () => import('./components/login/login.component').then(c => c.LoginComponent), canActivate: [loginGuard],
            data: { preload: true }
      },
      {
            path: 'signup', loadComponent: () => import('./components/signup/signup.component').then(c => c.SignupComponent), canActivate: [loginGuard], data: { preload: true }
      },
      {
            path: 'forgot-password', loadComponent: () => import('./components/forgot-password/forgot-password.component').then(c => c.ForgotPasswordComponent), canActivate: [loginGuard]
      },
      {
            path: 'dashboard', loadComponent: () => import('./components/dashboard/dashboard.component').then(c => c.DashboardComponent), canActivate: [authGuard]
      },
      {
            path: 'user-live-projects/:id', loadComponent: () => import('./components/dashboard/user-live-projects/user-live-projects.component').then(c => c.UserLiveProjectsComponent), canActivate: [authGuard]
      },
      {
            path: 'free-demo', loadComponent: () => import('./components/free-demo/free-demo.component').then(c => c.FreeDemoComponent), canActivate: [authGuard]
      },
      // {
      //       path: 'main', loadComponent: () => import('./components/client_buildcard_pages/main/main.component').then(c => c.MainComponent), canActivate: [authGuard]
      // },
      {
            path: 'main', loadComponent: () => import('./components/client_buildcard_pages/main/main-ai/main-ai.component').then(c => c.MainAiComponent), canActivate: [authGuard]
      },
      {
            path: 'make-it-mine', loadComponent: () => import('./components/client_buildcard_pages/main/make-it-mine/make-it-mine.component').then(c => c.MakeItMineComponent), canActivate: [authGuard]
      },
      {
            path: 'make-it-mine/:id', loadComponent: () => import('./components/client_buildcard_pages/main/make-it-mine/make-it-mine.component').then(c => c.MakeItMineComponent), canActivate: [authGuard]
      },
      {
            path: 'chatbot', loadComponent: () => import('./components/client_buildcard_pages/chatbot/chatbot.component').then(c => c.ChatbotComponent), canActivate: [authGuard]
      },
      {
            path: 'code-generator/:id', loadComponent: () => import('./components/client_buildcard_pages/ai-preview/react-build-preview/react-build-preview.component').then(c => c.ReactBuildPreviewComponent), canActivate: [authGuard]
      },
      {
            path: 'schedule-a-call', loadComponent: () => import('./components/schedule-a-call/schedule-a-call.component').then(c => c.ScheduleACallComponent)
      },
      {
            path: 'refine-idea/:id', loadComponent: () => import('./components/client_buildcard_pages/refine-idea/refine-idea.component').then(c => c.RefineIdeaComponent), canDeactivate: [canDeactivateGuard]
      },
      {
            path: 'plan-delivery/:id', loadComponent: () => import('./components/client_buildcard_pages/plan-delivery/plan-delivery.component').then(c => c.PlanDeliveryComponent), canDeactivate: [canDeactivateGuard]
      },
      {
            path: 'review-buildcard', loadComponent: () => import('./components/client_buildcard_pages/review-buildcard/review-buildcard.component').then(c => c.ReviewBuildcardComponent), canDeactivate: [canDeactivateGuard]
      },
      {
            path: 'billing-details', loadComponent: () => import('./components/client_buildcard_pages/billing-details/billing-details.component').then(c => c.BillingDetailsComponent), canDeactivate: [canDeactivateGuard]
      },
      {
            path: 'payment-plan', loadComponent: () => import('./components/client_buildcard_pages/payment-plan/payment-plan.component').then(c => c.PaymentPlanComponent), canDeactivate: [canDeactivateGuard]
      },
      {
            path: 'payment-option', loadComponent: () => import('./components/client_buildcard_pages/payment-detail/payment-detail.component').then(c => c.PaymentDetailComponent), canDeactivate: [canDeactivateGuard]
      },
      {
            path: 'payment-status', loadComponent: () => import('./components/client_buildcard_pages/payment-status/payment-status.component').then(c => c.PaymentStatusComponent), canActivate: [authGuard]
      },
      {
            path: 'payment-success', loadComponent: () => import('./components/payment-sucessfull/payment-sucessfull.component').then(c => c.PaymentSucessfullComponent)
      },
      {
            path: 'my-plan', loadComponent: () => import('./components/client_buildcard_pages/user-plans/user-plans.component').then(c => c.UserPlansComponent), canActivate: [authGuard]
      },
      {
            path: 'bd_loader', loadComponent: () => import('./components/client_buildcard_pages/builder-loader/builder-loader.component').then(c => c.BuilderLoaderComponent)
      },
      {
            path: 'profile', loadComponent: () => import('./components/profile/profile.component').then(c => c.ProfileComponent), canActivate: [authGuard]
      },
      {
            path: 'contact', loadComponent: () => import('./components/contactus/contactus.component').then(c => c.ContactusComponent)
      },
      {
            path: '', loadChildren: () => import('./components/landing-pages/landing.routes').then(r => r.LandingRoutes), canActivate: [loginGuard]
      },
      {
            path: 'user', loadChildren: () => import('./components/user-section/user.routes').then(r => r.UserRoutes)
      },
      {
            path: '**', loadComponent: () => import('./components/page-not-found/page-not-found.component').then(c => c.PageNotFoundComponent)
      }
];

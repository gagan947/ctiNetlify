import { Routes } from '@angular/router';

export const UserRoutes: Routes = [
      {
            path: '', loadComponent: () => import('./user-home/user-home.component').then(c => c.UserHomeComponent),
            children: [
                  {
                        path: '',
                        redirectTo: 'dashboard',
                        pathMatch: 'full'
                  },
                  {
                        path: 'dashboard',
                        loadComponent: () =>
                              import('./user-dashboard/user-dashboard.component').then(c => c.UserDashboardComponent)
                  },
                  {
                        path: 'journeys-and-features',
                        loadComponent: () => import('./journeys-and-features/journeys-and-features.component').then(c => c.JourneysAndFeaturesComponent)
                  },
                  {
                        path: 'journeys-and-features-details',
                        loadComponent: () => import('./journeys-and-features-details/journeys-and-features-details.component').then(c => c.JourneysAndFeaturesDetailsComponent)
                  },
                  {
                        path: 'to-dos',
                        loadComponent: () => import('./to-dos/to-dos.component').then(c => c.ToDosComponent)
                  },
                  {
                        path: 'Archieved-To-dos',
                        loadComponent: () => import('./archieved-to-dos/archieved-to-dos.component').then(c => c.ArchievedToDosComponent)
                  },
                  {
                        path: 'to-dos-detail',
                        loadComponent: () => import('./to-dos-detail/to-dos-detail.component').then(c => c.ToDosDetailComponent)
                  },
                  {
                        path: 'releases',
                        loadComponent: () => import('./releases/releases.component').then(c => c.ReleasesComponent)
                  },
                  {
                        path: 'requests',
                        loadComponent: () => import('./requests/requests.component').then(c => c.RequestsComponent)
                  },
                  {
                        path: 'buildcard',
                        loadComponent: () => import('./buildcard/buildcard.component').then(c => c.BuildcardComponent)
                  },
                  {
                        path: 'feature-progress',
                        loadComponent: () => import('./feature-progress/feature-progress.component').then(c => c.FeatureProgressComponent)
                  },
                  {
                        path: 'marketplace-integrations',
                        loadComponent: () => import('./marketplace-integrations/marketplace-integrations.component').then(c => c.MarketplaceIntegrationsComponent)
                  },
                  {
                        path: 'meetings',
                        loadComponent: () => import('./meetings/meetings.component').then(c => c.MeetingsComponent)
                  },
                  {
                        path: 'timeline',
                        loadComponent: () => import('./timeline/timeline.component').then(c => c.TimelineComponent)
                  },
                  {
                        path: 'documents',
                        loadComponent: () => import('./documents/documents.component').then(c => c.DocumentsComponent)
                  },
                  {
                        path: 'payments',
                        loadComponent: () => import('./payments/payments.component').then(c => c.PaymentsComponent)
                  },
                  {
                        path: 'notifications',
                        loadComponent: () => import('./notifications/notifications.component').then(c => c.NotificationsComponent)
                  },
            ]
      },
]
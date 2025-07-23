import { Routes } from '@angular/router';

export const LandingRoutes: Routes = [
      {
            path: '', loadComponent: () => import('./home/home.component').then(c => c.HomeComponent)
      },
      {
            path: 'creative-studio', loadComponent: () => import('./creative-studio/creative-studio.component').then(c => c.CreativeStudioComponent)
      },
      {
            path: 'creative-store', loadComponent: () => import('./creative-store/creative-store.component').then(c => c.CreativeStoreComponent)
      },
      {
            path: 'creative-now', loadComponent: () => import('./creative-now/creative-now.component').then(c => c.CreativeNowComponent)
      },
      {
            path: 'enterprenuers', loadComponent: () => import('./enterprenuers/enterprenuers.component').then(c => c.EnterprenuersComponent)
      },
      {
            path: 'enterprise', loadComponent: () => import('./enterprise/enterprise.component').then(c => c.EnterpriseComponent)
      },
      {
            path: 'financial-services', loadComponent: () => import('./financial-services/financial-services.component').then(c => c.FinancialServicesComponent)
      },
      {
            path: 'health-care', loadComponent: () => import('./health-care/health-care.component').then(c => c.HealthCareComponent)
      },
      {
            path: 'manufacturing', loadComponent: () => import('./manufacturing/manufacturing.component').then(c => c.ManufacturingComponent)
      },
      {
            path: 'entertainment', loadComponent: () => import('./enrertainment/enrertainment.component').then(c => c.EnrertainmentComponent)
      },
      {
            path: 'education', loadComponent: () => import('./financial-services/financial-services.component').then(c => c.FinancialServicesComponent)
      },
      {
            path: 'telecom', loadComponent: () => import('./telecom/telecom.component').then(c => c.TelecomComponent)
      },
      {
            path: 'energy', loadComponent: () => import('./financial-services/financial-services.component').then(c => c.FinancialServicesComponent)
      },
      {
            path: 'retail-ecommerce', loadComponent: () => import('./retail-ecommerce/retail-ecommerce.component').then(c => c.RetailEcommerceComponent)
      },
      {
            path: 'smbs', loadComponent: () => import('./smbs/smbs.component').then(c => c.SmbsComponent)
      },
      {
            path: 'why-we-use-ai', loadComponent: () => import('./why-we-use-ai/why-we-use-ai.component').then(c => c.WhyWeUseAiComponent)
      },
      {
            path: 'dedicated-customers', loadComponent: () => import('./dedicated-customer/dedicated-customer.component').then(c => c.DedicatedCustomerComponent)
      },
      {
            path: 'how-we-compare', loadComponent: () => import('./how-we-compare/how-we-compare.component').then(c => c.HowWeCompareComponent)
      },
      {
            path: 'case-studies', loadComponent: () => import('./case-studies/case-studies.component').then(c => c.CaseStudiesComponent)
      },
      {
            path: 'our-story', loadComponent: () => import('./our-story/our-story.component').then(c => c.OurStoryComponent)
      },
      {
            path: 'careers', loadComponent: () => import('./careers/careers.component').then(c => c.CareersComponent)
      },
      {
            path: 'blog', loadComponent: () => import('./blog/blog.component').then(c => c.BlogComponent)
      },
      {
            path: 'FAQs', loadComponent: () => import('./faqs/faqs.component').then(c => c.FAQsComponent)
      },
      {
            path: 'pricing', loadComponent: () => import('./pricing/pricing.component').then(c => c.PricingComponent)
      },
      {
            path: 'terms-conditions', loadComponent: () => import('./terms-conditions/terms-conditions.component').then(c => c.TermsConditionsComponent)
      },
      {
            path: 'privacy-policy', loadComponent: () => import('./privacy-policy/privacy-policy.component').then(c => c.PrivacyPolicyComponent)
      }

]
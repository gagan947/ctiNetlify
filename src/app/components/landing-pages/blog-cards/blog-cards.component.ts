import { AfterViewInit, Component, ElementRef, ViewChild, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../services/api.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
@Component({
  selector: 'app-blog-cards',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './blog-cards.component.html',
  styleUrl: './blog-cards.component.css'
})
export class BlogCardsComponent implements AfterViewInit {

  private apiService = inject(ApiService);
  @ViewChild('relatedArticleCarousel') relatedArticleCarousel?: ElementRef<HTMLElement>;

  imageUrl = this.apiService.imageUrl;
  blogData: any[] = [];
  private isViewReady = false;

  constructor() {
    this.getBlogs();
  }

  ngAfterViewInit(): void {
    this.isViewReady = true;
    this.initCarousel();
  }

  getBlogs(): void {
    this.apiService.getApi('api/user/getBlogs')
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (res: any) => {
          if (res.success) {
            this.blogData = res.data;
            setTimeout(() => this.initCarousel());
          }
          console.log('Blogs:', res);
        },
        error: (err) => {
          console.error('Error fetching blogs:', err);
        }
      });
  }

  private initCarousel(): void {
    if (!this.isViewReady || !this.relatedArticleCarousel?.nativeElement || !this.blogData.length) {
      return;
    }

    const jqWindow = window as Window & {
      $?: any;
      jQuery?: any;
    };
    const $ = jqWindow.$ ?? jqWindow.jQuery;

    if (!$?.fn?.owlCarousel) {
      console.warn('Owl Carousel is not available on window.');
      return;
    }

    const $carousel = $(this.relatedArticleCarousel.nativeElement);

    if ($carousel.hasClass('owl-loaded')) {
      $carousel.trigger('destroy.owl.carousel');
      $carousel.find('.owl-stage-outer').children().unwrap();
      $carousel.removeClass('owl-center owl-loaded owl-text-select-on');
    }

    $carousel.owlCarousel({
      loop: true,
      margin: 30,
      nav: true,
      responsive: {
        0: {
          items: 1,
        },
        600: {
          items: 2,
        },
        1000: {
          items: 3,
        },
      },
    });
  }
}

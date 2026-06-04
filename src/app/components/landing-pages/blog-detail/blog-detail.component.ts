import { Component, inject } from '@angular/core';
import { FooterComponent } from "../../shared/footer/footer.component";
import { HeaderComponent } from "../../shared/header/header.component";
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../../services/api.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-blog-detail',
  standalone: true,
  imports: [FooterComponent, HeaderComponent, RouterLink],
  templateUrl: './blog-detail.component.html',
  styleUrl: './blog-detail.component.css'
})
export class BlogDetailComponent {


  private apiService = inject(ApiService);
  private route = inject(ActivatedRoute);
  blogId = this.route.snapshot.paramMap.get('slug');

  imageUrl = this.apiService.imageUrl;
  blogData: any;
  constructor() {
    this.getBlogs();
  }

  getBlogs(): void {
    this.apiService.getApi('api/user/getBlogById?slug=' + this.blogId)
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (res: any) => {
          if (res.success) {
            this.blogData = res.data[0]
          }

        },
        error: (err) => {
          console.error('Error fetching blogs:', err);
        }
      });
  }
}

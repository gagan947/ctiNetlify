import { Component, inject } from '@angular/core';
import { FooterComponent } from "../../shared/footer/footer.component";
import { HeaderComponent } from "../../shared/header/header.component";
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
export class BlogCardsComponent {

  private apiService = inject(ApiService);
  imageUrl = this.apiService.imageUrl;
  blogData: any[] = [];
  constructor() {
    this.getBlogs();
  }

  getBlogs(): void {
    this.apiService.getApi('api/user/getBlogs')
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (res: any) => {
          if (res.success) {
            this.blogData = res.data
          }
          console.log('Blogs:', res);
        },
        error: (err) => {
          console.error('Error fetching blogs:', err);
        }
      });
  }
}

import { Component, ElementRef, inject, Input, ViewChild } from '@angular/core';
import { FormBuilder, FormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../../../services/api.service';
import { CommonModule } from '@angular/common';
import { Location } from '@angular/common';
import { ColorPickerModule } from 'ngx-color-picker';
import { NzMessageService } from 'ng-zorro-antd/message';
import { SidebarComponent } from "../../sidebar/sidebar.component";
import { BdLoaderComponent } from "../../../shared/bd-loader/bd-loader.component";
import { MobileViewComponent } from "../mobile-view/mobile-view.component";
import { ModalService } from '../../../../services/modal.service';

@Component({
    selector: 'app-make-it-mine',
    standalone: true,
    imports: [RouterLink, FormsModule, CommonModule, ColorPickerModule, SidebarComponent, BdLoaderComponent, MobileViewComponent],
    templateUrl: './make-it-mine.component.html',
    styleUrl: './make-it-mine.component.css'
})
export class MakeItMineComponent {
    @ViewChild('preview1', { static: true }) iframe1!: ElementRef<HTMLIFrameElement>;
    @Input() id!: string;
    projectsData: any;
    projectName: string = 'My Creative Project';
    imagePreview: any;
    public color: string = '#2889e9';
    selectedColor: any
    logoImg: File | undefined
    @ViewChild('logoBox') logoBox!: ElementRef;
    nameInvalid = false
    mobile_base = true;
    submitted: boolean = false;
    htmlCode: any = '';
    loading: boolean = true;
    hasUnsavedChanges: boolean = true;
    private modal = inject(ModalService);
    constructor(private fb: FormBuilder, private apiService: ApiService, private router: Router, public location: Location, private message: NzMessageService,) {
        let projectData = sessionStorage.getItem('projectData');
        this.projectsData = JSON.parse(projectData!);
        if (this.projectsData) {
            this.imagePreview = this.projectsData.projectLogo
            this.projectName = this.projectsData.projectName
            this.apiService._htmlCode.set(sessionStorage.getItem('htmlCode'));
            if (this.projectsData.projectLogo) {
                this.apiService._imagePreview.set(this.projectsData.projectLogo);
            }
        }
    }

    ngOnInit() {
        if (this.id && !this.projectsData) {
            this.getProjectHtml()
        }else{
            const doc1 = this.iframe1.nativeElement.contentDocument || this.iframe1.nativeElement.contentWindow?.document;
                if (doc1) {
                    doc1.open();
                    doc1.write(this.apiService._htmlCode());

                    
                    doc1.close();
                    const logo1 = doc1.querySelector('#mylogo') as HTMLElement;

                    const newLogoHtml = `<img id="mylogo" loading="lazy" src="${this.apiService._imagePreview() || 'https://https://creativethoughts.ai/assets/img/c.png'}" alt="AI app builder for mobile and web" style="width: 70px; height: 30px;">`;

                    if (logo1) logo1.outerHTML = newLogoHtml;
                }
        }
    }

    updateLogo() {
        const doc1 = this.iframe1.nativeElement.contentDocument;
        if (doc1) {
            const logo1 = doc1.querySelector('#mylogo') as HTMLElement;

            const newLogoHtml = `<img id="mylogo" loading="lazy" src="${this.imagePreview || 'https://https://creativethoughts.ai/assets/img/c.png'}" alt="AI app builder for mobile and web" style="width: 70px; height: 30px;">`;

            if (logo1) logo1.outerHTML = newLogoHtml;
        }
    }

    updateName(name: any) {
        this.projectName = name.trim();
        if (!this.projectName) {
            this.nameInvalid = true
        } else {
            this.nameInvalid = false
        }
    };

    onFileSelected(event: Event) {
        const file = (event.target as HTMLInputElement).files?.[0];
        this.logoImg = file;
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                this.imagePreview = reader.result;
                this.apiService._imagePreview.set(this.imagePreview);
                this.updateLogo();
            };
            reader.readAsDataURL(file);
        }
    }

    onColorChange(color: string) {
        this.selectedColor = color;
    }


    Navigate(id: any) {

        if (this.projectName == '') {
            this.submitted = true
            return
        }

        let formData = new FormData();
        formData.append('logoImg', this.logoImg ? this.logoImg : '');
        formData.append('projectName', this.projectName);
        formData.append('projectId', this.id ? this.id : '0');
        formData.append('currentRoutes', this.router.url);
        formData.append('clientEnquryId', this.projectsData?.clientEnquryId ? this.projectsData.clientEnquryId : '');

        this.apiService.postAPI('api/user/addProjectNameAndLogo', formData).subscribe({
            next: (res: any) => {
                if (res.success == true) {
                    let projectData = {
                        ...this.projectsData,
                        clientEnquryId: res.data,
                        projectName: this.projectName,
                        projectLogo: this.imagePreview ? this.imagePreview : this.apiService._imagePreview(),
                    }

                    sessionStorage.setItem('projectData', JSON.stringify(projectData))
                    this.router.navigate([`/refine-idea/${id}`])
                }
            },
            error: err => {
                this.message.error(err.error.message);
            }
        })
    }

    getProjectHtml() {
        this.apiService.getApi('api/user/getProjectHtml?id=' + this.id + '').subscribe((res: any) => {
            if (res.success == true) {
                this.htmlCode = (res.data[0].html_pages);
                sessionStorage.setItem('htmlCode', this.htmlCode);
                this.apiService._htmlCode.set(this.htmlCode);

                const doc1 = this.iframe1.nativeElement.contentDocument || this.iframe1.nativeElement.contentWindow?.document;
                if (doc1) {
                    doc1.open();
                    doc1.write(this.htmlCode);
                    doc1.close();
                    const logo1 = doc1.querySelector('#mylogo') as HTMLElement;

                    const newLogoHtml = `<img id="mylogo" loading="lazy" src="${res.data[0].projectImage || 'https://https://creativethoughts.ai/assets/img/c.png'}" alt="AI app builder for mobile and web" style="width: 70px; height: 30px;">`;

                    if (logo1) logo1.outerHTML = newLogoHtml;
                }
                this.projectName = res.data[0].projectName;
                this.apiService._imagePreview.set(res.data[0].projectImage);
            }
        });
    }

}

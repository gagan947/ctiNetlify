import { Component, ElementRef, Input, ViewChild } from '@angular/core';
import { FormBuilder, FormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../../../services/api.service';
import { CommonModule } from '@angular/common';
import { Location } from '@angular/common';

import { ColorPickerModule } from 'ngx-color-picker';
import { NzMessageService } from 'ng-zorro-antd/message';
import { SidebarComponent } from "../../sidebar/sidebar.component";
@Component({
  selector: 'app-make-it-mine',
  standalone: true,
  imports: [RouterLink, FormsModule, CommonModule, ColorPickerModule, SidebarComponent],
  templateUrl: './make-it-mine.component.html',
  styleUrl: './make-it-mine.component.css'
})
export class MakeItMineComponent {
  @ViewChild('preview', { static: true }) iframe!: ElementRef<HTMLIFrameElement>;
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
  submitted: boolean = false
  constructor(private fb: FormBuilder, private apiService: ApiService, private router: Router, public location: Location, private message: NzMessageService,) {
    let projectData = sessionStorage.getItem('projectData');
    this.projectsData = JSON.parse(projectData!);
    if (this.projectsData) {
      this.imagePreview = this.projectsData.projectLogo
      this.projectName = this.projectsData.projectName
    }
  }

  ngAfterViewInit() {
    const doc = this.iframe.nativeElement.contentDocument || this.iframe.nativeElement.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(this.htmlCode);
      doc.close();
    }
  }

  updateLogo() {
    const doc = this.iframe.nativeElement.contentDocument;
    if (doc) {
      const logo = doc.querySelector('#myLogo') as HTMLImageElement;
      if (logo) {
        logo.src = this.imagePreview
        logo.style.width = '100px'
        logo.style.height = '30px'
      }
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
    formData.append('projectId', this.id);
    // formData.append('logoSize', this.logoBox.nativeElement.getAttribute('style'));

    this.apiService.postAPI('api/user/addProjectNameAndLogo', formData).subscribe({
      next: (res: any) => {
        if (res.success == true) {
          let projectData = {
            ...this.projectsData,
            clientEnquryId: res.data,
            selectedColor: this.selectedColor,
            projectName: this.projectName,
            projectLogo: this.imagePreview,
            // logoStyle: this.logoBox.nativeElement.getAttribute('style'),
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


  htmlCode = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Facebook-like Social Media App</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/lucide/0.263.1/umd/lucide.min.js">
    <style>
        :root {
            --font-size: 14px;
            --background: #ffffff;
            --foreground: oklch(0.145 0 0);
            --card: #ffffff;
            --card-foreground: oklch(0.145 0 0);
            --primary: #030213;
            --primary-foreground: oklch(1 0 0);
            --secondary: oklch(0.95 0.0058 264.53);
            --secondary-foreground: #030213;
            --muted: #ececf0;
            --muted-foreground: #717182;
            --accent: #e9ebef;
            --accent-foreground: #030213;
            --destructive: #d4183d;
            --destructive-foreground: #ffffff;
            --border: rgba(0, 0, 0, 0.1);
            --input-background: #f3f3f5;
            --radius: 0.625rem;
        }
        
        body {
            font-size: var(--font-size);
            background-color: #f8f9fa;
        }
        
        .bg-background { background-color: var(--background); }
        .text-foreground { color: var(--foreground); }
        .bg-primary { background-color: var(--primary); }
        .text-primary-foreground { color: var(--primary-foreground); }
        .bg-muted { background-color: var(--muted); }
        .text-muted-foreground { color: var(--muted-foreground); }
        .bg-accent { background-color: var(--accent); }
        .border-border { border-color: var(--border); }
        .bg-input-background { background-color: var(--input-background); }
        
        .card {
            background-color: var(--card);
            border: 1px solid var(--border);
            border-radius: var(--radius);
            box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
        }
        
        .avatar {
            border-radius: 50%;
            overflow: hidden;
        }
        
        .btn-primary {
            background-color: var(--primary);
            color: var(--primary-foreground);
            border-radius: var(--radius);
            padding: 8px 16px;
            border: none;
            font-weight: 500;
        }
        
        .btn-ghost {
            background-color: transparent;
            border: none;
            padding: 8px 12px;
            border-radius: var(--radius);
        }
        
        .btn-ghost:hover {
            background-color: var(--accent);
        }
    </style>
</head>
<body class="min-h-screen" style="background-color: #f8f9fa;">
    
    <!-- Header -->
    <header class="bg-background border-b sticky top-0 z-50" style="background-color: white; border-bottom: 1px solid var(--border); box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);">
        <div class="container mx-auto px-4 py-3">
            <div class="flex items-center justify-between gap-4">
                <!-- Logo and Search -->
                <div class="flex items-center gap-4 flex-1">
                    <div class="flex items-center gap-2">
                        <button class="btn-ghost md:hidden">
                            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
                            </svg>
                        </button>
                       <img id="myLogo" loading="lazy" src="https://creativethoughts.ai/assets/img/c.png" alt="AI app builder for mobile and web" class="h-6 w-6">
                    </div>
                    
                    <!-- Search Bar -->
                    <div class="flex-1 max-w-md">
                        <div class="relative">
                            <svg class="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <circle cx="11" cy="11" r="8"/>
                                <path d="m21 21-4.35-4.35"/>
                            </svg>
                            <input type="text" placeholder="Search Facebook" class="pl-10 pr-4 py-2 w-full rounded-full border-0" style="background-color: var(--input-background);">
                        </div>
                    </div>
                </div>
                
                <!-- Navigation Tabs -->
                <div class="hidden md:flex items-center gap-1">
                    <button class="btn-primary">
                        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                        </svg>
                    </button>
                    <button class="btn-ghost">
                        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 0 0-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 0 1 5.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 0 1 9.288 0M15 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/>
                        </svg>
                    </button>
                    <button class="btn-ghost">
                        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                        </svg>
                    </button>
                </div>
                
                <!-- User Actions -->
                <div class="flex items-center gap-2">
                    <button class="btn-ghost relative">
                        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                        </svg>
                        <span class="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs rounded-full" style="background-color: var(--destructive); color: var(--destructive-foreground);">2</span>
                    </button>
                    
                    <button class="btn-ghost relative">
                        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-5 5-5-5h5V3h0z"/>
                        </svg>
                        <span class="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs rounded-full" style="background-color: var(--destructive); color: var(--destructive-foreground);">5</span>
                    </button>
                    
                    <div class="avatar h-8 w-8 cursor-pointer">
                        <img src="https://images.unsplash.com/photo-1539605480396-a61f99da1041?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwZXJzb24lMjBwcm9maWxlJTIwcG9ydHJhaXR8ZW58MXx8fHwxNzU2NjgyMzIwfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral" alt="Profile" class="w-full h-full object-cover">
                    </div>
                </div>
            </div>
        </div>
    </header>

    <!-- Main Content -->
    <div class="container mx-auto px-4 py-6 max-w-6xl">
        <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
            
            <!-- Left Sidebar -->
            <div class="hidden lg:block space-y-4">
                <!-- Shortcuts -->
                <div class="card p-4">
                    <h3 class="font-medium mb-4">Shortcuts</h3>
                    <div class="space-y-1">
                        <button class="btn-ghost w-full justify-start gap-3 h-auto py-2">
                            <svg class="h-5 w-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 0 0-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 0 1 5.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 0 1 9.288 0M15 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/>
                            </svg>
                            <span>Friends</span>
                        </button>
                        <button class="btn-ghost w-full justify-start gap-3 h-auto py-2">
                            <svg class="h-5 w-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                            </svg>
                            <span>Events</span>
                        </button>
                        <button class="btn-ghost w-full justify-start gap-3 h-auto py-2">
                            <svg class="h-5 w-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16a2 2 0 01-2 2H7a2 2 0 01-2-2V5z"/>
                            </svg>
                            <span>Saved</span>
                        </button>
                    </div>
                </div>

                <!-- Contacts -->
                <div class="card p-4">
                    <div class="flex items-center justify-between mb-3">
                        <h3 class="font-medium">Contacts</h3>
                        <span class="text-xs px-2 py-1 rounded" style="background-color: var(--secondary); color: var(--secondary-foreground);">3 online</span>
                    </div>
                    <div class="space-y-2">
                        <div class="flex items-center gap-3 p-2 rounded-lg hover:bg-accent cursor-pointer">
                            <div class="relative">
                                <div class="avatar h-8 w-8">
                                    <img src="https://images.unsplash.com/photo-1494790108755-2616b612b64c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3b21hbiUyMHBvcnRyYWl0fGVufDF8fHx8MTc1NjY4MjMyMHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral" alt="Sarah" class="w-full h-full object-cover">
                                </div>
                                <div class="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                            </div>
                            <span class="text-sm font-medium">Sarah Johnson</span>
                        </div>
                        
                        <div class="flex items-center gap-3 p-2 rounded-lg hover:bg-accent cursor-pointer">
                            <div class="relative">
                                <div class="avatar h-8 w-8">
                                    <img src="https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3b21hbiUyMHBvcnRyYWl0fGVufDF8fHx8MTc1NjY4MjMyMHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral" alt="Emma" class="w-full h-full object-cover">
                                </div>
                                <div class="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                            </div>
                            <span class="text-sm font-medium">Emma Davis</span>
                        </div>
                        
                        <div class="flex items-center gap-3 p-2 rounded-lg hover:bg-accent cursor-pointer">
                            <div class="relative">
                                <div class="avatar h-8 w-8">
                                    <img src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtYW4lMjBwb3J0cmFpdHxlbnwxfHx8fDE3NTY2ODIzMjB8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral" alt="Alex" class="w-full h-full object-cover">
                                </div>
                                <div class="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                            </div>
                            <span class="text-sm font-medium">Alex Rodriguez</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Main Feed -->
            <div class="lg:col-span-2">
                
                <!-- Stories -->
                <div class="card mb-6 p-4">
                    <div class="flex gap-3 overflow-x-auto pb-2">
                        <!-- Create Story -->
                        <div class="flex-shrink-0">
                            <div class="relative w-24 h-32 rounded-lg overflow-hidden cursor-pointer">
                                <img src="https://images.unsplash.com/photo-1539605480396-a61f99da1041?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwZXJzb24lMjBwcm9maWxlJTIwcG9ydHJhaXR8ZW58MXx8fHwxNzU2NjgyMzIwfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral" alt="Your story" class="w-full h-3/4 object-cover">
                                <div class="absolute bottom-0 left-0 right-0 h-1/4 bg-white flex items-center justify-center">
                                    <div class="w-6 h-6 rounded-full flex items-center justify-center -mt-3 border-2 border-white" style="background-color: var(--primary);">
                                        <svg class="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                                        </svg>
                                    </div>
                                </div>
                                <div class="absolute bottom-1 left-0 right-0 text-center">
                                    <span class="text-xs font-medium">Create</span>
                                </div>
                            </div>
                        </div>
                        
                        <!-- User Stories -->
                        <div class="flex-shrink-0">
                            <div class="relative w-24 h-32 rounded-lg overflow-hidden cursor-pointer">
                                <img src="https://images.unsplash.com/photo-1690303472493-c21e659b5abf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0cmF2ZWwlMjB2YWNhdGlvbiUyMHBob3RvfGVufDF8fHx8MTc1NjczMzgyMHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral" alt="Sarah's story" class="w-full h-full object-cover">
                                <div class="absolute top-2 left-2">
                                    <div class="avatar h-8 w-8 border-2" style="border-color: #1877f2;">
                                        <img src="https://images.unsplash.com/photo-1494790108755-2616b612b64c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3b21hbiUyMHBvcnRyYWl0fGVufDF8fHx8MTc1NjY4MjMyMHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral" alt="Sarah" class="w-full h-full object-cover">
                                    </div>
                                </div>
                                <div class="absolute bottom-2 left-2 right-2">
                                    <span class="text-xs font-medium text-white drop-shadow-lg">Sarah Johnson</span>
                                </div>
                                <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Create Post -->
                <div class="card mb-6 p-4">
                    <div class="flex gap-3">
                        <div class="avatar h-10 w-10">
                            <img src="https://images.unsplash.com/photo-1539605480396-a61f99da1041?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwZXJzb24lMjBwcm9maWxlJTIwcG9ydHJhaXR8ZW58MXx8fHwxNzU2NjgyMzIwfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral" alt="You" class="w-full h-full object-cover">
                        </div>
                        <div class="flex-1">
                            <textarea placeholder="What's on your mind, You?" class="w-full min-h-[80px] border-0 p-0 resize-none text-base bg-transparent" style="outline: none; color: var(--muted-foreground);"></textarea>
                        </div>
                    </div>
                    <hr class="my-4" style="border-color: var(--border);">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <button class="btn-ghost text-sm gap-1">
                                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
                                    <circle cx="9" cy="9" r="2"/>
                                    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
                                </svg>
                                Photo/video
                            </button>
                            <button class="btn-ghost text-sm gap-1">
                                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                                </svg>
                                Check in
                            </button>
                        </div>
                        <button class="btn-primary text-sm">Post</button>
                    </div>
                </div>

                <!-- Post -->
                <div class="card mb-4">
                    <!-- Post Header -->
                    <div class="p-4 pb-3">
                        <div class="flex items-start justify-between">
                            <div class="flex items-center gap-3">
                                <div class="avatar h-10 w-10">
                                    <img src="https://images.unsplash.com/photo-1494790108755-2616b612b64c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3b21hbiUyMHBvcnRyYWl0fGVufDF8fHx8MTc1NjY4MjMyMHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral" alt="Sarah" class="w-full h-full object-cover">
                                </div>
                                <div>
                                    <div class="flex items-center gap-2">
                                        <span class="font-medium">Sarah Johnson</span>
                                        <span class="text-muted-foreground text-sm">is feeling grateful</span>
                                    </div>
                                    <div class="flex items-center gap-1 text-sm text-muted-foreground">
                                        <span>2h</span>
                                        <span>•</span>
                                        <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                                        </svg>
                                        <span>Santorini, Greece</span>
                                    </div>
                                </div>
                            </div>
                            <button class="btn-ghost">
                                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <circle cx="12" cy="12" r="1"/>
                                    <circle cx="19" cy="12" r="1"/>
                                    <circle cx="5" cy="12" r="1"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                    
                    <!-- Post Content -->
                    <div class="px-4 pb-3">
                        <p class="text-sm leading-relaxed">Just had the most amazing sunset view from my hotel room! Sometimes you need to pause and appreciate the simple beauties in life. ✨ #travel #sunset #grateful</p>
                    </div>
                    
                    <!-- Post Image -->
                    <div class="relative">
                        <img src="https://images.unsplash.com/photo-1690303472493-c21e659b5abf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0cmF2ZWwlMjB2YWNhdGlvbiUyMHBob3RvfGVufDF8fHx8MTc1NjczMzgyMHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral" alt="Sunset view" class="w-full aspect-[4/3] object-cover">
                    </div>
                    
                    <!-- Engagement Stats -->
                    <div class="px-4 py-3">
                        <div class="flex items-center justify-between text-sm text-muted-foreground">
                            <div class="flex items-center gap-4">
                                <span class="flex items-center gap-1">
                                    <div class="w-4 h-4 rounded-full flex items-center justify-center" style="background-color: var(--primary);">
                                        <svg class="w-2 h-2 fill-white text-white" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                                        </svg>
                                    </div>
                                    127
                                </span>
                            </div>
                            <div class="flex items-center gap-4">
                                <span>23 comments</span>
                                <span>8 shares</span>
                            </div>
                        </div>
                    </div>
                    
                    <hr style="border-color: var(--border);">
                    
                    <!-- Action Buttons -->
                    <div class="p-2">
                        <div class="flex items-center">
                            <button class="btn-ghost flex-1 justify-center gap-2">
                                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                                </svg>
                                Like
                            </button>
                            <button class="btn-ghost flex-1 justify-center gap-2">
                                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                                </svg>
                                Comment
                            </button>
                            <button class="btn-ghost flex-1 justify-center gap-2">
                                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"/>
                                </svg>
                                Share
                            </button>
                        </div>
                    </div>
                </div>
                
            </div>
                <div class="card mb-4">
                    <!-- Post Header -->
                    <div class="p-4 pb-3">
                        <div class="flex items-start justify-between">
                            <div class="flex items-center gap-3">
                                <div class="avatar h-10 w-10">
                                    <img src="https://images.unsplash.com/photo-1494790108755-2616b612b64c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3b21hbiUyMHBvcnRyYWl0fGVufDF8fHx8MTc1NjY4MjMyMHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral" alt="Sarah" class="w-full h-full object-cover">
                                </div>
                                <div>
                                    <div class="flex items-center gap-2">
                                        <span class="font-medium">Sarah Johnson</span>
                                        <span class="text-muted-foreground text-sm">is feeling grateful</span>
                                    </div>
                                    <div class="flex items-center gap-1 text-sm text-muted-foreground">
                                        <span>2h</span>
                                        <span>•</span>
                                        <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                                        </svg>
                                        <span>Santorini, Greece</span>
                                    </div>
                                </div>
                            </div>
                            <button class="btn-ghost">
                                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <circle cx="12" cy="12" r="1"/>
                                    <circle cx="19" cy="12" r="1"/>
                                    <circle cx="5" cy="12" r="1"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                    
                    <!-- Post Content -->
                    <div class="px-4 pb-3">
                        <p class="text-sm leading-relaxed">Just had the most amazing sunset view from my hotel room! Sometimes you need to pause and appreciate the simple beauties in life. ✨ #travel #sunset #grateful</p>
                    </div>
                    
                    <!-- Post Image -->
                    <div class="relative">
                        <img src="https://images.unsplash.com/photo-1690303472493-c21e659b5abf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0cmF2ZWwlMjB2YWNhdGlvbiUyMHBob3RvfGVufDF8fHx8MTc1NjczMzgyMHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral" alt="Sunset view" class="w-full aspect-[4/3] object-cover">
                    </div>
                    
                    <!-- Engagement Stats -->
                    <div class="px-4 py-3">
                        <div class="flex items-center justify-between text-sm text-muted-foreground">
                            <div class="flex items-center gap-4">
                                <span class="flex items-center gap-1">
                                    <div class="w-4 h-4 rounded-full flex items-center justify-center" style="background-color: var(--primary);">
                                        <svg class="w-2 h-2 fill-white text-white" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                                        </svg>
                                    </div>
                                    127
                                </span>
                            </div>
                            <div class="flex items-center gap-4">
                                <span>23 comments</span>
                                <span>8 shares</span>
                            </div>
                        </div>
                    </div>
                    
                    <hr style="border-color: var(--border);">
                    
                    <!-- Action Buttons -->
                    <div class="p-2">
                        <div class="flex items-center">
                            <button class="btn-ghost flex-1 justify-center gap-2">
                                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                                </svg>
                                Like
                            </button>
                            <button class="btn-ghost flex-1 justify-center gap-2">
                                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                                </svg>
                                Comment
                            </button>
                            <button class="btn-ghost flex-1 justify-center gap-2">
                                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"/>
                                </svg>
                                Share
                            </button>
                        </div>
                    </div>
                </div>
                
            </div>
                <div class="card mb-4">
                    <!-- Post Header -->
                    <div class="p-4 pb-3">
                        <div class="flex items-start justify-between">
                            <div class="flex items-center gap-3">
                                <div class="avatar h-10 w-10">
                                    <img src="https://images.unsplash.com/photo-1494790108755-2616b612b64c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3b21hbiUyMHBvcnRyYWl0fGVufDF8fHx8MTc1NjY4MjMyMHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral" alt="Sarah" class="w-full h-full object-cover">
                                </div>
                                <div>
                                    <div class="flex items-center gap-2">
                                        <span class="font-medium">Sarah Johnson</span>
                                        <span class="text-muted-foreground text-sm">is feeling grateful</span>
                                    </div>
                                    <div class="flex items-center gap-1 text-sm text-muted-foreground">
                                        <span>2h</span>
                                        <span>•</span>
                                        <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                                        </svg>
                                        <span>Santorini, Greece</span>
                                    </div>
                                </div>
                            </div>
                            <button class="btn-ghost">
                                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <circle cx="12" cy="12" r="1"/>
                                    <circle cx="19" cy="12" r="1"/>
                                    <circle cx="5" cy="12" r="1"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                    
                    <!-- Post Content -->
                    <div class="px-4 pb-3">
                        <p class="text-sm leading-relaxed">Just had the most amazing sunset view from my hotel room! Sometimes you need to pause and appreciate the simple beauties in life. ✨ #travel #sunset #grateful</p>
                    </div>
                    
                    <!-- Post Image -->
                    <div class="relative">
                        <img src="https://images.unsplash.com/photo-1690303472493-c21e659b5abf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0cmF2ZWwlMjB2YWNhdGlvbiUyMHBob3RvfGVufDF8fHx8MTc1NjczMzgyMHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral" alt="Sunset view" class="w-full aspect-[4/3] object-cover">
                    </div>
                    
                    <!-- Engagement Stats -->
                    <div class="px-4 py-3">
                        <div class="flex items-center justify-between text-sm text-muted-foreground">
                            <div class="flex items-center gap-4">
                                <span class="flex items-center gap-1">
                                    <div class="w-4 h-4 rounded-full flex items-center justify-center" style="background-color: var(--primary);">
                                        <svg class="w-2 h-2 fill-white text-white" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                                        </svg>
                                    </div>
                                    127
                                </span>
                            </div>
                            <div class="flex items-center gap-4">
                                <span>23 comments</span>
                                <span>8 shares</span>
                            </div>
                        </div>
                    </div>
                    
                    <hr style="border-color: var(--border);">
                    
                    <!-- Action Buttons -->
                    <div class="p-2">
                        <div class="flex items-center">
                            <button class="btn-ghost flex-1 justify-center gap-2">
                                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                                </svg>
                                Like
                            </button>
                            <button class="btn-ghost flex-1 justify-center gap-2">
                                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                                </svg>
                                Comment
                            </button>
                            <button class="btn-ghost flex-1 justify-center gap-2">
                                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"/>
                                </svg>
                                Share
                            </button>
                        </div>
                    </div>
                </div>
                
            </div>

            <!-- Right Sidebar -->
            <div class="hidden lg:block">
                <div class="sticky top-24">
                    <!-- Sponsored -->
                    <div class="card p-4">
                        <h3 class="font-medium mb-4">Sponsored</h3>
                        <div class="flex gap-3">
                            <div class="w-16 h-16 rounded-lg flex items-center justify-center" style="background-color: var(--muted);">
                                <span class="text-xs text-muted-foreground">Ad</span>
                            </div>
                            <div class="flex-1 min-w-0">
                                <p class="text-sm font-medium">Discover amazing products just for you</p>
                                <p class="text-xs text-muted-foreground">example.com</p>
                            </div>
                        </div>
                    </div>

                    <!-- Birthdays -->
                    <div class="card p-4 mt-4">
                        <h3 class="font-medium mb-4">Birthdays</h3>
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded-full flex items-center justify-center" style="background-color: var(--primary);">
                                🎂
                            </div>
                            <p class="text-sm">
                                <span class="font-medium">Sarah Johnson</span> has a birthday today
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

</body>
</html>`
}

import { Injectable, Inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';

@Injectable({
    providedIn: 'root'
})
export class CanonicalService {

    constructor(@Inject(DOCUMENT) private dom: Document) { }

    setCanonicalURL(url: string) {

        const head = this.dom.getElementsByTagName('head')[0];
        let element = this.dom.querySelector("link[rel='canonical']");

        if (element) {
            element.setAttribute('href', url);
        } else {
            element = this.dom.createElement('link');
            element.setAttribute('rel', 'canonical');
            element.setAttribute('href', url);
            head.appendChild(element);
        }
    }
}
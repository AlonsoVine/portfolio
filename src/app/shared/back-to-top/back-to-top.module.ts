import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BackToTopComponent } from './back-to-top.component';

@NgModule({
  imports: [CommonModule],
  declarations: [BackToTopComponent],
  exports: [BackToTopComponent]
})
export class BackToTopModule {}


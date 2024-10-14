import { Component } from '@angular/core';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent {

  irAlComponente() {
    const elemento = document.getElementById('mi-perfil');
    if (elemento) {
      elemento.scrollIntoView({ behavior: 'smooth' });
    }
  }

}

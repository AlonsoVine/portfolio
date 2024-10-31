import { Component } from '@angular/core';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent {

  irAlComponentePerfil() {
    const elemento = document.getElementById('mi-perfil');
    if (elemento) {
      elemento.scrollIntoView({ behavior: 'smooth' });
    }
  }

  irAlComponenteHabilidades() {
    const elemento = document.getElementById('habilidades');
    if (elemento) {
      elemento.scrollIntoView({ behavior: 'smooth' });
    }
  }

}

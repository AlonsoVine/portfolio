import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HeaderComponent } from './header/header.component';
import { PerfilComponent } from './perfil/perfil.component';
import { HabilidadesComponent } from './habilidades/habilidades.component';
import { ExperienciaComponent } from './experiencia/experiencia.component';
import { ProyectosComponent } from './proyectos/proyectos.component';
import { CertificadosComponent } from './certificados/certificados.component';
import { ContactoComponent } from './contacto/contacto.component';
import { FooterComponent } from './footer/footer.component';
import { FormsModule } from '@angular/forms';
import { BackToTopModule } from './shared/back-to-top/back-to-top.module';
import { SettingsMenuComponent } from './shared/settings-menu/settings-menu.component';
import { QuickNavMenuComponent } from './shared/quick-nav-menu/quick-nav-menu.component';

@NgModule({
  declarations: [
    AppComponent,
    HeaderComponent,
    PerfilComponent,
    HabilidadesComponent,
    ExperienciaComponent,
    ProyectosComponent,
    CertificadosComponent,
    ContactoComponent,
    FooterComponent,
    SettingsMenuComponent,
    QuickNavMenuComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    BackToTopModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }

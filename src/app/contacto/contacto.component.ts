import { Component } from '@angular/core';
import emailjs, { EmailJSResponseStatus } from 'emailjs-com';

@Component({
  selector: 'app-contacto',
  templateUrl: './contacto.component.html',
  styleUrls: ['./contacto.component.scss']
})
export class ContactoComponent {

  nombre: string = '';
  email: string = '';
  mensaje: string = '';
  message: string = '';

  constructor() {
    // Inicializamos EmailJS con nuestro User ID
    emailjs.init('F8YHXTC_H3fASTvre'); // Reemplaza 'TU_USER_ID' con tu User ID de EmailJS
  }

  onSubmit(): void {
    // Los parámetros que se enviarán a EmailJS
    const templateParams = {
      from_name: this.nombre,
      from_email: this.email,
      message: this.mensaje
    };

    // Enviar el correo usando EmailJS
    emailjs.send('service_wwphcca', 'template_s8sidh1', templateParams)
      .then((response: EmailJSResponseStatus) => {
        console.log('SUCCESS!', response.status, response.text);
        this.message = 'Mensaje enviado exitosamente!';
        this.resetForm();  // Limpiar el formulario después de enviar el mensaje
      }, (error) => {
        console.error('FAILED...', error);
        this.message = 'Ocurrió un error al enviar el mensaje. Inténtalo más tarde.';
      });
  }

  resetForm() {
    this.nombre = '';
    this.email = '';
    this.mensaje = '';
  }
}
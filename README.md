# 📁 Mi Portfolio

Este es un portafolio personal diseñado para presentar mi trayectoria profesional.

Desarrollado con **Angular**, el portafolio incluye secciones dedicadas para mostrar habilidades, experiencia profesional, proyectos y certificados, así como un formulario de contacto funcional.

## 🗂 Estructura del Proyecto

El proyecto sigue una estructura modular basada en componentes de Angular. A continuación, se describe cada área del portafolio y su funcionalidad:


## ✨ Funcionalidades

### 1. **Certificados**
   - Muestra los certificados del DevOps, cada uno con su imagen y descripción correspondiente.
   - Los certificados pueden incluir imágenes y archivos PDF, que están organizados en la carpeta `assets/certificates`.

### 2. **Contacto**
   - Formulario de contacto funcional que envía mensajes utilizando **EmailJS**.
   - Captura el nombre, correo y mensaje del usuario y envía un correo al propietario del portafolio.

### 3. **Experiencia**
   - Sección que detalla la experiencia profesional, destacando cada puesto ocupado y las principales responsabilidades desempeñadas.
   - Incluye descripciones detalladas de cada rol, tecnologías usadas y proyectos en los que se participó.

### 4. **Proyectos**
   - Muestra proyectos realizados, cada uno con una breve descripción de las tecnologías utilizadas y el impacto del proyecto.
   - Incluye enlaces para ver más detalles sobre cada proyecto (si aplica).

### 5. **Habilidades**
   - Muestra las habilidades técnicas, tales como lenguajes de programación, frameworks, herramientas y metodologías ágiles.

### 6. **Perfil**
   - Una descripción general del profesional, su enfoque, y las áreas en las que se especializa.

### 7. **Header y Footer**
   - **Header**: Contiene la introducción general, nombre y título profesional.
   - **Footer**: Incluye enlaces a redes sociales como GitHub, LinkedIn y otros, con un diseño curvado y enlaces visuales.

---

## 👨‍💻 Tecnologías Utilizadas

El portafolio está desarrollado con las siguientes tecnologías y librerías:

- **Angular**: Framework principal para el desarrollo de la aplicación.
- **Bootstrap**: Framework CSS utilizado para la maquetación y diseño responsivo.
- **SCSS**: Preprocesador CSS utilizado para crear estilos de manera modular y eficiente.
- **EmailJS**: Librería para gestionar el envío de correos desde el formulario de contacto.
- **Font Awesome**: Librería de iconos utilizada para los iconos de redes sociales y otros elementos gráficos.
- **TypeScript**: Lenguaje de programación principal para el desarrollo en Angular.
- **HTML5**: Estructura base de la aplicación.
- **CSS3**: Para el diseño visual de la aplicación.

---
---

# 🚀 Guía para Desarrolladores 



## 🛠️ Configuración del Entorno Local

Esta sección proporciona una guía detallada para configurar y ejecutar el proyecto de manera local en tu entorno de desarrollo.

## Requisitos Previos

Asegúrate de tener los siguientes requisitos antes de iniciar la configuración del proyecto:

- **Node.js**: Debes tener Node.js instalado en tu sistema. Si no lo tienes, puedes descargarlo desde [aquí](https://nodejs.org/).
- **Angular CLI**: Angular CLI es la interfaz de línea de comandos para Angular y se necesita para ejecutar comandos como `ng serve` y `ng build`.

  Puedes instalar Angular CLI globalmente en tu sistema usando:

  ```bash
  npm install -g @angular/cli
    ```
## Estructura del Proyecto

El proyecto tiene la siguiente estructura básica:

# Estructura del Proyecto

```plaintext

PORTFOLIO/
├── src/
│   ├── app/                   # Componentes de la aplicación Angular
│   │   ├── certificados/      # Sección de certificados
│   │   ├── contacto/          # Sección de contacto con EmailJS
│   │   ├── experiencia/       # Sección de experiencia profesional
│   │   ├── footer/            # Componente de pie de página
│   │   ├── habilidades/       # Sección de habilidades técnicas
│   │   ├── header/            # Encabezado con diseño curvado
│   │   ├── perfil/            # Sección de perfil personal
│   │   └── proyectos/         # Sección de proyectos destacados
│   ├── assets/                # Archivos estáticos e imágenes
│   │   ├── certificados/      # Imágenes de los certificados
│   │   └── img/               # Imágenes de la aplicación
│   ├── environments/          # Configuración de entornos (producción y desarrollo)
│   ├── index.html             # Página principal de la aplicación
│   ├── styles.scss            # Estilos globales de la aplicación
│   └── main.ts                # Punto de entrada principal
├── angular.json               # Configuración de Angular
├── package.json               # Dependencias y scripts del proyecto
└── README.md                  # Documentación del proyecto
```



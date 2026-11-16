// title: Hola JavaScript

// %% Asincronía
setTimeout(() => {
  console.log("world")
}, 1000)

console.log("Hello")

// %% Errores
const usuario = { nombre: "Ada" }
console.log(usuario)
console.log(usuario.direccion.calle)

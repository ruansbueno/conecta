// Spec 002 (D-MN-4): aplica o tema antes da primeira pintura, para o escuro não piscar claro.
// Script clássico da mesma origem (a CSP não permite script embutido). A mesma decisão está em
// src/lib/tema.ts; tests/unit/tema.test.ts confere que os dois concordam.
;(function () {
  var tema = null
  try {
    tema = localStorage.getItem('conecta:tema')
  } catch (e) {
    tema = null
  }
  if (tema !== 'claro' && tema !== 'escuro') {
    try {
      tema = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro'
    } catch (e) {
      tema = 'claro'
    }
  }
  document.documentElement.dataset.tema = tema
  document.documentElement.style.colorScheme = tema === 'escuro' ? 'dark' : 'light'
})()

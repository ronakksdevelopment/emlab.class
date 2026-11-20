/*
 * onboarding.js - first time walkthrough slides.
 */
const EMlabOnboarding = (() => {
  let currentSlide = 0;
  let totalSlides = 0;
  let onComplete = null;

  function init(completeCallback) {
    onComplete = completeCallback;
    const slides = document.querySelectorAll('.onboarding-slide');
    totalSlides = slides.length;
    const dotsWrap = document.getElementById('onboardingDots');
    dotsWrap.innerHTML = '';
    slides.forEach((_, i) => {
      const dot = document.createElement('span');
      if (i === 0) dot.classList.add('active');
      dotsWrap.appendChild(dot);
    });
    currentSlide = 0;
    updateUI();

    document.getElementById('onboardingNext').onclick = next;
    document.getElementById('onboardingBack').onclick = back;
    document.getElementById('skipOnboarding').onclick = finish;
  }

  function updateUI() {
    document.querySelectorAll('.onboarding-slide').forEach((s, i) => {
      s.classList.toggle('active', i === currentSlide);
    });
    document.querySelectorAll('#onboardingDots span').forEach((d, i) => {
      d.classList.toggle('active', i === currentSlide);
    });
    const backBtn = document.getElementById('onboardingBack');
    const nextBtn = document.getElementById('onboardingNext');
    backBtn.disabled = currentSlide === 0;
    nextBtn.innerHTML = currentSlide === totalSlides - 1
      ? 'Get Started <i class="fa-solid fa-check"></i>'
      : 'Next <i class="fa-solid fa-arrow-right"></i>';
  }

  function next() {
    if (currentSlide < totalSlides - 1) {
      currentSlide++;
      updateUI();
    } else {
      finish();
    }
  }

  function back() {
    if (currentSlide > 0) {
      currentSlide--;
      updateUI();
    }
  }

  function finish() {
    EMlabStorage.set(EMlabStorage.KEYS.ONBOARDED, true);
    onComplete && onComplete();
  }

  function replay(completeCallback) {
    init(completeCallback);
  }

  return { init, replay };
})();

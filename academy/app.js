const progress = document.querySelector(".reading-progress");
let scheduled = false;
function updateProgress() {
  const distance = document.documentElement.scrollHeight - innerHeight;
  progress.style.width = `${distance > 0 ? Math.min(100, (scrollY / distance) * 100) : 0}%`;
  scheduled = false;
}
window.addEventListener(
  "scroll",
  () => {
    if (!scheduled) {
      scheduled = true;
      requestAnimationFrame(updateProgress);
    }
  },
  { passive: true },
);
window.addEventListener("resize", updateProgress, { passive: true });
updateProgress();

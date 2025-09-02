document.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("research-canvas");
  if (!canvas) return;

  // Example of fetching research data
  async function loadResearchData() {
    try {
      const res = await fetch("./researchData.json");
      const data = await res.json();
      console.log("Research hub data loaded:", data);
      // TODO: your visualization code that uses `data`
    } catch (err) {
      console.error("Error loading researchData.json:", err);
    }
  }

  loadResearchData();

  // Placeholder for interactive 3D research hub (Three.js logic here)
  // You can import THREE from ./assets/js/three.min.js and OrbitControls locally
  // Example:
  // const scene = new THREE.Scene();
  // ... setup camera, renderer, etc.
});

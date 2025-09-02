document.addEventListener("DOMContentLoaded", () => {
  // Utility function to fetch and render JSON content
  async function fetchData(file, renderFn) {
    try {
      const response = await fetch(`./${file}`);
      const data = await response.json();
      renderFn(data);
    } catch (error) {
      console.error(`Error loading ${file}:`, error);
    }
  }

  // Example render functions (adapt to your existing DOM structure)
  function renderNews(newsItems) {
    const container = document.getElementById("news-list");
    if (!container) return;
    container.innerHTML = "";
    newsItems.forEach(item => {
      const div = document.createElement("div");
      div.className = "news-item card p-4";
      div.innerHTML = `
        <h3 class="text-xl font-bold mb-2">${item.title}</h3>
        <p class="text-sm text-gray-400 mb-1">${item.date}</p>
        <p>${item.description}</p>
        ${item.image ? `<img src="${item.image}" alt="">` : ""}
      `;
      container.appendChild(div);
    });
  }

  function renderResearch(items) {
    const container = document.getElementById("research-content-grid");
    if (!container) return;
    container.innerHTML = "";
    items.forEach(project => {
      const div = document.createElement("div");
      div.className = "research-item card p-4";
      div.innerHTML = `
        <h3 class="font-bold text-lg mb-2">${project.title}</h3>
        <p>${project.description}</p>
        ${project.image ? `<img src="${project.image}" alt="">` : ""}
      `;
      container.appendChild(div);
    });
  }

  function renderTeam(members) {
    const container = document.getElementById("team-grid");
    if (!container) return;
    container.innerHTML = "";
    members.forEach(member => {
      const div = document.createElement("div");
      div.className = "team-member card p-4 text-center";
      div.innerHTML = `
        <img src="${member.photo}" alt="${member.name}" class="rounded-full w-24 h-24 mx-auto mb-2">
        <h3 class="font-bold">${member.name}</h3>
        <p class="text-sm text-gray-500">${member.role}</p>
        <p class="mt-2 text-sm">${member.bio}</p>
      `;
      container.appendChild(div);
    });
  }

  // Fetch and render data
  fetchData("newsData.json", renderNews);
  fetchData("researchData.json", renderResearch);
  fetchData("teamData.json", renderTeam);
  fetchData("alumniData.json", () => {}); // add renderer if needed
  fetchData("gamesData.json", () => {}); // add renderer if needed
  fetchData("outreachTalksData.json", () => {}); // add renderer if needed
  fetchData("outreachNewsData.json", () => {}); // add renderer if needed
  fetchData("academicPresentationsData.json", () => {}); // add renderer if needed
});

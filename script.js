const BADGE_IDS = [2124799722];

async function checkBadges() {
  const username = document.getElementById("username").value.trim();
  const gridContainer = document.getElementById("badge-grid");

  if (!username) {
    alert("Please enter a username!");
    return;
  }

  gridContainer.innerHTML = "<p>Loading...</p>";

  // Step 1: Username -> User ID (using GET search instead of POST usernames/users)
let userId;
try {
  const userRes = await fetch(
    `https://users.roproxy.com/v1/users/search?keyword=${encodeURIComponent(username)}&limit=10`
  );
  console.log("Username lookup status:", userRes.status);
  const userData = await userRes.json();
  console.log("Username lookup data:", userData);

  if (!userData.data || userData.data.length === 0) {
    gridContainer.innerHTML = "<p>User not found!</p>";
    return;
  }
  // Find the exact match (search can return partial matches)
  const exact = userData.data.find(
    u => u.name.toLowerCase() === username.toLowerCase()
  );
  userId = (exact || userData.data[0]).id;
} catch (err) {
  console.error("Step 1 (username lookup) failed:", err);
  gridContainer.innerHTML = "<p>Error looking up username. Check console for details.</p>";
  return;
}

  // Step 2: Badge thumbnails
  let badgeImages = {};
  try {
    const badgeIdsParam = BADGE_IDS.join(",");
    const thumbRes = await fetch(
      `https://thumbnails.roproxy.com/v1/badges/icons?badgeIds=${badgeIdsParam}&size=150x150&format=Png`
    );
    console.log("Thumbnail fetch status:", thumbRes.status);
    const thumbData = await thumbRes.json();
    console.log("Thumbnail data:", thumbData);

    if (thumbData.data) {
      thumbData.data.forEach(item => {
        badgeImages[item.targetId] = item.imageUrl;
      });
    }
  } catch (err) {
    console.error("Step 2 (thumbnails) failed:", err);
    // Not fatal — continue with placeholder images
  }

  // Step 3: Check ownership per badge
  const ownedBadges = new Set();
  for (const badgeId of BADGE_IDS) {
    try {
      const checkRes = await fetch(
        `https://inventory.roproxy.com/v1/users/${userId}/items/Badge/${badgeId}`
      );
      console.log(`Ownership check for badge ${badgeId}: status ${checkRes.status}`);
      if (checkRes.ok) {
        const checkData = await checkRes.json();
        console.log(`Ownership data for badge ${badgeId}:`, checkData);
        if (checkData && checkData.data && checkData.data.length > 0) {
          ownedBadges.add(badgeId);
        }
      }
    } catch (err) {
      console.error(`Step 3 (ownership check for badge ${badgeId}) failed:`, err);
    }
  }

  // Step 4: Render
  gridContainer.innerHTML = "";
  BADGE_IDS.forEach(badgeId => {
    const isOwned = ownedBadges.has(badgeId);
    const imageUrl = badgeImages[badgeId] || "https://via.placeholder.com/100";

    const card = document.createElement("div");
    card.className = `badge-card ${isOwned ? "owned" : ""}`;
    card.innerHTML = `
      <img src="${imageUrl}" alt="Badge ${badgeId}">
      <div><strong>Badge ID:</strong></div>
      <div>${badgeId}</div>
      <div style="margin-top: 5px; font-size: 12px; font-weight: bold;">
        ${isOwned ? "OWNED" : "LOCKED"}
      </div>
    `;
    gridContainer.appendChild(card);
  });
}
// Quick test to verify TieHandler works correctly
const testData = [
  {playerId: 1, playerName: "Player A", grossScore: 72, netScore: 70, handicap: 2},
  {playerId: 2, playerName: "Player B", grossScore: 73, netScore: 71, handicap: 2},
  {playerId: 3, playerName: "Player C", grossScore: 74, netScore: 71, handicap: 3},
  {playerId: 4, playerName: "Player D", grossScore: 75, netScore: 72, handicap: 3}
];

// Mock points config
const mockPointsConfig = {
  tour: [
    {position: 1, points: 500},
    {position: 2, points: 400},
    {position: 3, points: 325},
    {position: 4, points: 260}
  ]
};

// Simulate TieHandler logic manually
console.log("Testing TieHandler logic...");

// Sort by net score
const sorted = [...testData].sort((a, b) => a.netScore - b.netScore);
console.log("Sorted by net score:", sorted.map(p => `${p.playerName}: ${p.netScore}`));

// Group by score
const scoreGroups = new Map();
sorted.forEach(player => {
  const score = player.netScore;
  if (!scoreGroups.has(score)) {
    scoreGroups.set(score, []);
  }
  scoreGroups.get(score).push(player);
});

console.log("\nScore groups:");
scoreGroups.forEach((players, score) => {
  console.log(`Score ${score}: ${players.map(p => p.playerName).join(', ')}`);
});

// Calculate positions and points
let currentPosition = 1;
const results = [];

for (const [score, players] of scoreGroups) {
  const numTied = players.length;
  
  // Calculate average points for tied positions
  let totalPoints = 0;
  for (let i = 0; i < numTied; i++) {
    const positionPoints = mockPointsConfig.tour.find(p => p.position === currentPosition + i)?.points || 0;
    totalPoints += positionPoints;
  }
  const avgPoints = totalPoints / numTied;
  
  console.log(`\nPosition ${currentPosition} (${numTied} players tied):`);
  console.log(`Points calculation: positions ${currentPosition}-${currentPosition + numTied - 1}`);
  console.log(`Total points: ${totalPoints}, Average: ${avgPoints}`);
  
  players.forEach(player => {
    results.push({
      player: player.playerName,
      position: currentPosition,
      displayPosition: numTied > 1 ? `T${currentPosition}` : `${currentPosition}`,
      points: avgPoints,
      tied: numTied > 1
    });
  });
  
  currentPosition += numTied;
}

console.log("\nFinal results:");
results.forEach(r => {
  console.log(`${r.player}: ${r.displayPosition}, ${r.points} points`);
});
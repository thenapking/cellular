let cols, rows;
let grid;
let cellSize = 10;
let w = 800;
let initialMaliciousCount = 2;
let initialCopCount = 20;
let initialBadCopCount = 20;
let policeRadius = 10;
let deathRate = 0.125;
let birthRate = 0.125;
let releaseRate = 0.125;
let crimeRate = 0.125;
let naturalDeathRate = 0.0125;
let arrestProbability = 0.5;
let cops = true;
let citizens = false;
let debug = true;
let t = 0;
let gridMinimum = (citizens || cops) ? -2 : -1;
let gridMaximum = cops ? 12 : 10;

function setup() {
  createCanvas(w, w);
  cols = floor(width / cellSize);
  rows = floor(height / cellSize);
  grid = createGrid(cols, rows);
  frameRate(1); // Adjust frame rate as needed
}

function draw() {
  background(255);
  updateGrid();
  displayGrid();
  console.log(t++);
}

function createGrid(cols, rows) {
  let grid = new Array(cols);
  for (let i = 0; i < cols; i++) {
    grid[i] = new Array(rows);
    for (let j = 0; j < rows; j++) {
      grid[i][j] = floor(random(3, 9));
    }
  }

  for (let k = 0; k < initialMaliciousCount; k++) {
    let i = floor(random(cols));
    let j = floor(random(rows));
    grid[i][j] = 0;
  }

  for (let k = 0; k < initialCopCount; k++) {
    let i = floor(random(cols));
    let j = floor(random(rows));
    grid[i][j] = 11;
  }

  for (let k = 0; k < initialBadCopCount; k++) {
    let i = floor(random(cols));
    let j = floor(random(rows));
    grid[i][j] = 12;
  }

  return grid;
}

function falseAlarmProbability() {
  let maliciousCount = 0;

  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      if (grid[i][j] === 0) {
        maliciousCount++;
      }
    }
  }

  return maliciousCount / (cols * rows)
}

function updateGrid() {
  // console.log(falseAlarmProbability());
  let alarm = random(0,1) > falseAlarmProbability() ? true : false;

  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      let state = grid[i][j];
      if (state === null) continue; 

      // This is a distributed system where a group of trustworthy people can imprison a distrustful neighbour
      if(state === 0 && citizens) {
        if(countTrustfulNeighbors(i, j) > 4) { grid[i][j] = -2; }
      } 
      
      if (state === -1) {
        // new birth
        if(random(0,1) < birthRate) {
          grid[i][j] = floor(random(3, 9));
        }
      } 

      if (state === -2) {
        // get released
        if(random(0,1) < releaseRate) {
          grid[i][j] = floor(random(2, 6));
        }
      } 

      // This is a centralised system where a cop can arrest a malicious cell within n cell radius
      if (state === 11) {
        arrestNeighbours(i, j)
      }

      if (state === 12) {
        roundUpTheUsualSuspects(i, j)
      }

      if (state == 1){
        if(random(0,1) < crimeRate) grid[i][j] = 0;
      }
      
      if (state > 0 && state < 11) {
        // if (alarm) {
        //   if (state < 5) {
        //     // Distrustful cells die in a real alarm
        //     if(random(0,1) < deathRate) {
        //       grid[i][j] = -1;
        //     }
        //   } else {
        //     // Trustful cells become more trusting in a real alarm
        //     if(state < 10) grid[i][j]++;
        //   }
        // } else {
        //   // Trustful cells become less trusting in a false alarm
        //   if (state >= 5) {
        //     grid[i][j]--;
        //   }
        // }

        // Spread distrust - acutally this is spreading death
        if(countDistrustfulNeighbors(i, j) > 7) { constrain(grid[i][j]--, 0, 10)}
        if(countMaliciousNeighbors(i, j) > 0) { constrain(grid[i][j]--, 0, 10) }
        // Spread trust
        if(state > 0 && state < 9 && countTrustfulNeighbors(i, j) > 7) { grid[i][j]++; }
      }

      // All cells can die a natural death
      if(random(0,1) < naturalDeathRate && state < 11) {
        grid[i][j] = floor(random(3, 9));
      }

      grid[i][j] = constrain(grid[i][j], gridMinimum, gridMaximum);
    }
  }
}

function arrestNeighbours(x, y) {
  let number_of_arrests = 0;
  if(random() < arrestProbability) {
    for (let i = max(0, x - policeRadius); i <= min(cols - 1, x + policeRadius); i++) {
      for (let j = max(0, y - policeRadius); j <= min(rows - 1, y + policeRadius); j++) {
        if (number_of_arrests < 1 && grid[i][j] === 0) {
          // Arrest a malicious person
          grid[i][j] = -2;
          number_of_arrests++;
        } else if (grid[i][j] > 0 && grid[i][j] < 10) { 
          // Trustful cells become more trusting in a real arrest
          grid[i][j] = grid[i][j]++;
        }
      }
    }
  }
}

function roundUpTheUsualSuspects(x, y) {
  let number_of_arrests = 0;
  if(random() < arrestProbability){
    for (let i = max(0, x - policeRadius); i <= min(cols - 1, x + policeRadius); i++) {
      for (let j = max(0, y - policeRadius); j <= min(rows - 1, y + policeRadius); j++) {
        if (grid[i][j] > 1 && grid[i][j] < 10){
          if (number_of_arrests < 1) {
            // Arrest an innocent person
            console.log("Arrested an innocent person")
            grid[i][j] = -2;
            number_of_arrests++;
          } else {  
            // Trustful cells become less trusting after witnessing a false arrest
            grid[i][j] = grid[i][j]--;
          }
        }
      }
    }
  }
}

function countDistrustfulNeighbors(x, y) {
  let count = 0;
  for (let i = -1; i <= 1; i++) {
    for (let j = -1; j <= 1; j++) {
      let neighborX = x + i;
      let neighborY = y + j;
      if (neighborX >= 0 && neighborX < cols && neighborY >= 0 && neighborY < rows) {
        if (grid[neighborX][neighborY] <= 5 && grid[neighborX][neighborY] >= 0) {
          count++;
        }
      }
    }
  }
  return count;
}

function countMaliciousNeighbors(x, y) {
  let count = 0;
  for (let i = -1; i <= 1; i++) {
    for (let j = -1; j <= 1; j++) {
      let neighborX = x + i;
      let neighborY = y + j;
      if (neighborX >= 0 && neighborX < cols && neighborY >= 0 && neighborY < rows) {
        if (grid[neighborX][neighborY] == 0) {
          count++;
        }
      }
    }
  }
  return count;
}

function countTrustfulNeighbors(x, y) {
  let count = 0;
  for (let i = -1; i <= 1; i++) {
    for (let j = -1; j <= 1; j++) {
      let neighborX = x + i;
      let neighborY = y + j;
      if (neighborX >= 0 && neighborX < cols && neighborY >= 0 && neighborY < rows) {
        if (grid[neighborX][neighborY] > 5) {
          count++;
        }
      }
    }
  }
  return count;
}

function displayGrid() {
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      let state = grid[i][j];
      if (state === null) continue; 
      let x = i * cellSize;
      let y = j * cellSize;
      // Display cells based on their state
      fill(255);
      stroke(0);

      if(state < 5) fill("#FFA500")
      if(state === 0) fill(255, 0, 0);
      if(state === -1) fill(0, 0, 0); 
      if(state === -2) fill(0, 255, 0);
      if(state === 11) fill(0,0,255)
      if(state === 12) fill(255,0,255)
      rect(x, y, cellSize, cellSize);
      fill(0);

      if(debug) { 
        let fontSize = cellSize * 0.6; // Adjust the factor as needed
        if(state === -1) { stroke(255); fill(255) }
        textSize(fontSize);
        textAlign(CENTER, CENTER);
        text(state, x + cellSize / 2, y + cellSize / 2);
      }
      
    }
  }
}

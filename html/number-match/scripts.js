document.addEventListener('DOMContentLoaded', () => {
    const gameBoard = document.getElementById('game-board');
    const scoreElement = document.getElementById('score');
    const addNumbersBtn = document.getElementById('add-numbers-btn');
    const restartBtn = document.getElementById('restart-btn');
    const gameOverModal = document.getElementById('game-over');
    const finalScoreElement = document.getElementById('final-score');
    const playAgainBtn = document.getElementById('play-again-btn');

    const levelElement = document.getElementById('level');
    const addsLeftElement = document.getElementById('adds-left');

    let numbers = [];
    let selectedIndex = null;
    let score = 0;
    let level = 1;
    let addsLeft = 5;
    const GRID_WIDTH = 9;

    // Initialize game
    const initGame = (isNewLevel = false) => {
        if (!isNewLevel) {
            score = 0;
            level = 1;
        } else {
            level++;
        }
        
        addsLeft = 5;
        updateStats();
        
        // Difficulty scaling: reduce allowed direct matches as level increases
        // Level 1: ~15 matches, Level 2: ~10, Level 3: ~5, Level 4+: 2 or less
        const matchThreshold = Math.max(2, 20 - (level * 5));
        
        let startNumbers = [];
        const fullRows = 1 + level;
        const totalNumbers = (fullRows * GRID_WIDTH) + (Math.floor(Math.random() * (GRID_WIDTH - 1)) + 1);
        
        // Attempt to generate a puzzle with limited direct matches
        let attempts = 0;
        do {
            startNumbers = [];
            for (let i = 0; i < totalNumbers; i++) {
                startNumbers.push(Math.floor(Math.random() * 9) + 1);
            }
            attempts++;
            // Don't loop forever, stop after 50 attempts
        } while (countDirectMatches(startNumbers) > matchThreshold && attempts < 50);
        
        numbers = startNumbers.map(n => ({ value: n, cleared: false }));
        renderBoard();
        gameOverModal.classList.add('hidden');
        addNumbersBtn.disabled = false;
        addNumbersBtn.style.opacity = '1';
    };

    const countDirectMatches = (nums) => {
        let count = 0;
        const tempNumbers = nums.map(n => ({ value: n, cleared: false }));
        
        for (let i = 0; i < tempNumbers.length; i++) {
            // Check only forward neighbors to avoid double counting
            const neighbors = [i + 1, i + GRID_WIDTH, i + GRID_WIDTH - 1, i + GRID_WIDTH + 1];
            neighbors.forEach(neighborIdx => {
                if (neighborIdx < tempNumbers.length) {
                    // Check if they are "naturally" adjacent
                    if (isAdjacentIndices(i, neighborIdx)) {
                        const val1 = tempNumbers[i].value;
                        const val2 = tempNumbers[neighborIdx].value;
                        if (val1 === val2 || val1 + val2 === 10) {
                            count++;
                        }
                    }
                }
            });
        }
        return count;
    };

    const isAdjacentIndices = (idx1, idx2) => {
        const r1 = Math.floor(idx1 / GRID_WIDTH);
        const c1 = idx1 % GRID_WIDTH;
        const r2 = Math.floor(idx2 / GRID_WIDTH);
        const c2 = idx2 % GRID_WIDTH;
        
        const rowDiff = Math.abs(r1 - r2);
        const colDiff = Math.abs(c1 - c2);
        
        // Direct adjacency (H, V, D) or Wrapped
        if (rowDiff <= 1 && colDiff <= 1) return true;
        
        // Wrapped adjacency: idx2 is exactly 1 after idx1 in linear sequence
        if (idx2 === idx1 + 1) return true;
        
        return false;
    };

    const renderBoard = () => {
        gameBoard.innerHTML = '';
        numbers.forEach((item, index) => {
            const cell = document.createElement('div');
            cell.classList.add('number-cell');
            if (item.cleared) cell.classList.add('cleared');
            cell.textContent = item.value;
            cell.dataset.index = index;

            cell.addEventListener('click', () => handleCellClick(index));
            gameBoard.appendChild(cell);
        });
    };

    const handleCellClick = (index) => {
        if (numbers[index].cleared) return;

        if (selectedIndex === null) {
            selectedIndex = index;
            highlightCell(index, true);
        } else if (selectedIndex === index) {
            highlightCell(index, false);
            selectedIndex = null;
        } else {
            if (isValidMatch(selectedIndex, index)) {
                clearMatch(selectedIndex, index);
            } else {
                highlightCell(selectedIndex, false);
                selectedIndex = index;
                highlightCell(index, true);
            }
        }
    };

    const highlightCell = (index, highlight) => {
        const cells = gameBoard.querySelectorAll('.number-cell');
        if (highlight) {
            cells[index].classList.add('selected');
        } else {
            cells[index].classList.remove('selected');
        }
    };

    const isValidMatch = (idx1, idx2) => {
        const val1 = numbers[idx1].value;
        const val2 = numbers[idx2].value;

        // Rule 1: Values match or sum is 10
        if (val1 !== val2 && val1 + val2 !== 10) return false;

        // Rule 2: Adjacency (ignoring cleared cells)
        return isAdjacent(idx1, idx2);
    };

    const isAdjacent = (idx1, idx2) => {
        const min = Math.min(idx1, idx2);
        const max = Math.max(idx1, idx2);

        // Check horizontal/linear adjacency
        let horizontal = true;
        for (let i = min + 1; i < max; i++) {
            if (!numbers[i].cleared) {
                horizontal = false;
                break;
            }
        }
        if (horizontal) return true;

        // Check vertical adjacency
        if (min % GRID_WIDTH === max % GRID_WIDTH) {
            let vertical = true;
            for (let i = min + GRID_WIDTH; i < max; i += GRID_WIDTH) {
                if (!numbers[i].cleared) {
                    vertical = false;
                    break;
                }
            }
            if (vertical) return true;
        }

        // Check diagonal adjacency (top-left to bottom-right)
        if ((max - min) % (GRID_WIDTH + 1) === 0) {
            let diagonal = true;
            for (let i = min + GRID_WIDTH + 1; i < max; i += GRID_WIDTH + 1) {
                if (!numbers[i].cleared) {
                    diagonal = false;
                    break;
                }
            }
            if (diagonal) return true;
        }

        // Check diagonal adjacency (top-right to bottom-left)
        if ((max - min) % (GRID_WIDTH - 1) === 0) {
            let diagonal = true;
            for (let i = min + GRID_WIDTH - 1; i < max; i += GRID_WIDTH - 1) {
                if (!numbers[i].cleared) {
                    diagonal = false;
                    break;
                }
            }
            if (diagonal) return true;
        }

        return false;
    };

    const clearMatch = (idx1, idx2) => {
        numbers[idx1].cleared = true;
        numbers[idx2].cleared = true;
        
        const cells = gameBoard.querySelectorAll('.number-cell');
        cells[idx1].classList.add('just-cleared');
        cells[idx2].classList.add('just-cleared');

        setTimeout(() => {
            cells[idx1].classList.remove('just-cleared', 'selected');
            cells[idx2].classList.remove('just-cleared', 'selected');
            cells[idx1].classList.add('cleared');
            cells[idx2].classList.add('cleared');
            
            // Check for empty rows and remove them
            checkAndRemoveEmptyRows();

            // Check win AFTER rows are removed
            if (checkWin()) {
                showGameOver(true);
            } else if (addsLeft === 0 && !hasValidMoves()) {
                showGameOver(false);
            }
        }, 400);

        score += 10;
        updateStats();
        selectedIndex = null;
    };

    const hasValidMoves = () => {
        const unclearedIndices = [];
        numbers.forEach((n, i) => { if (!n.cleared) unclearedIndices.push(i); });

        for (let i = 0; i < unclearedIndices.length; i++) {
            for (let j = i + 1; j < unclearedIndices.length; j++) {
                if (isValidMatch(unclearedIndices[i], unclearedIndices[j])) {
                    return true;
                }
            }
        }
        return false;
    };

    const checkAndRemoveEmptyRows = () => {
        let changed = false;
        // Check rows from bottom to top to avoid index issues during splice
        for (let i = Math.floor(numbers.length / GRID_WIDTH) - 1; i >= 0; i--) {
            const start = i * GRID_WIDTH;
            const row = numbers.slice(start, start + GRID_WIDTH);
            
            if (row.length === GRID_WIDTH && row.every(n => n.cleared)) {
                numbers.splice(start, GRID_WIDTH);
                changed = true;
            }
        }

        if (changed) {
            renderBoard();
        }
    };

    const addNumbers = () => {
        if (addsLeft <= 0) return;

        const remaining = numbers.filter(n => !n.cleared).map(n => ({ value: n.value, cleared: false }));
        if (remaining.length === 0) return;
        
        numbers = [...numbers, ...remaining];
        addsLeft--;
        updateStats();

        if (addsLeft <= 0) {
            addNumbersBtn.disabled = true;
            addNumbersBtn.style.opacity = '0.5';
            
            // If we just ran out of adds, check if we're stuck
            if (!hasValidMoves()) {
                showGameOver(false);
            }
        }

        renderBoard();
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    };

    const updateStats = () => {
        scoreElement.textContent = score;
        levelElement.textContent = level;
        addsLeftElement.textContent = addsLeft;
    };

    const checkWin = () => {
        return numbers.length === 0 || numbers.every(n => n.cleared);
    };

    const showGameOver = (isWin) => {
        if (isWin) {
            gameOverModal.querySelector('h2').textContent = "Level " + level + " Cleared!";
            gameOverModal.querySelector('p').textContent = "Ready for a harder puzzle?";
            playAgainBtn.textContent = "Start Level " + (level + 1);
            playAgainBtn.onclick = () => initGame(true);
        } else {
            gameOverModal.querySelector('h2').textContent = "Game Over!";
            gameOverModal.querySelector('p').textContent = "No more moves possible.";
            playAgainBtn.textContent = "Try Again";
            playAgainBtn.onclick = () => initGame(false);
        }
        finalScoreElement.textContent = score;
        gameOverModal.classList.remove('hidden');
    };

    // Event Listeners
    addNumbersBtn.addEventListener('click', addNumbers);
    restartBtn.addEventListener('click', () => initGame(false));
    playAgainBtn.addEventListener('click', () => initGame(true));

    // Initial load
    initGame();
});

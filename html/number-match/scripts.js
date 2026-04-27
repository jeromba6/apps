document.addEventListener('DOMContentLoaded', () => {
    const gameBoard = document.getElementById('game-board');
    const scoreElement = document.getElementById('score');
    const addNumbersBtn = document.getElementById('add-numbers-btn');
    const restartBtn = document.getElementById('restart-btn');
    const gameOverModal = document.getElementById('game-over');
    const finalScoreElement = document.getElementById('final-score');
    const playAgainBtn = document.getElementById('play-again-btn');

    let numbers = [];
    let selectedIndex = null;
    let score = 0;
    const GRID_WIDTH = 9;

    // Initialize game
    const initGame = () => {
        score = 0;
        updateScore();
        
        const startNumbers = [];
        // Generate 27 random numbers (3 rows)
        for (let i = 0; i < 27; i++) {
            startNumbers.push(Math.floor(Math.random() * 9) + 1);
        }
        
        numbers = startNumbers.map(n => ({ value: n, cleared: false }));
        renderBoard();
        gameOverModal.classList.add('hidden');
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
        }, 400);

        score += 10;
        updateScore();
        selectedIndex = null;

        if (checkWin()) {
            showGameOver();
        }
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
        const remaining = numbers.filter(n => !n.cleared).map(n => ({ value: n.value, cleared: false }));
        if (remaining.length === 0) return;
        
        numbers = [...numbers, ...remaining];
        renderBoard();
        // Scroll to bottom
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    };

    const updateScore = () => {
        scoreElement.textContent = score;
    };

    const checkWin = () => {
        return numbers.every(n => n.cleared);
    };

    const showGameOver = () => {
        finalScoreElement.textContent = score;
        gameOverModal.classList.remove('hidden');
    };

    // Event Listeners
    addNumbersBtn.addEventListener('click', addNumbers);
    restartBtn.addEventListener('click', initGame);
    playAgainBtn.addEventListener('click', initGame);

    // Initial load
    initGame();
});

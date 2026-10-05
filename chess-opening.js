const files = 'abcdefgh';
const names = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const glyphs = { p: '♟', n: '♞', b: '♝', r: '♜', q: '♛', k: '♚' };

export function initialBoard() {
  const board = {};
  [...'rnbqkbnr'].forEach((piece, i) => {
    board[files[i] + '8'] = { color: 'black', piece };
    board[files[i] + '7'] = { color: 'black', piece: 'p' };
    board[files[i] + '2'] = { color: 'white', piece: 'p' };
    board[files[i] + '1'] = { color: 'white', piece };
  });
  return board;
}
// Only the first move is played: these are all 20 legal opening moves.
export function openingMoves(square) {
  if (/^[a-h]2$/.test(square)) return [square[0] + '3', square[0] + '4'];
  if (square === 'b1') return ['a3', 'c3'];
  if (square === 'g1') return ['f3', 'h3'];
  return [];
}
export function judgeOpening(from, to) {
  if (!openingMoves(from).includes(to)) return null;
  return from === 'b2' && to === 'b3';
}
export function chessPage() {
  return `<section class="page chess-page" aria-label="Chess opening">
    <a class="back-link" href="#about">← about me</a>
    <p class="feature-kicker">a very opinionated opening quiz</p>
    <h1>what is the best chess opening?</h1>
    <p class="chess-instruction">white to move. pick a piece, then its destination.</p>
    <div class="chess-board" role="group" aria-label="Chess board, White at the bottom"></div>
    <div class="chess-feedback"><p class="chess-result" role="status" aria-live="polite">your move.</p><button class="quiet-button chess-reset" type="button">start again</button></div>
  </section>`;
}
export function setupChess(root) {
  const container = root.querySelector('.chess-board');
  if (!container) return;
  let board = initialBoard(), selected = null, played = null;
  const result = root.querySelector('.chess-result');
  function render() {
    const destinations = selected ? openingMoves(selected) : [];
    container.innerHTML = Array.from({ length: 64 }, (_, i) => {
      const rank = 8 - Math.floor(i / 8), file = i % 8, square = files[file] + rank;
      const occupant = board[square];
      const label = `${square}${occupant ? `, ${occupant.color} ${names[occupant.piece]}` : ', empty'}${destinations.includes(square) ? ', legal destination' : ''}`;
      return `<button type="button" class="chess-square ${(rank + file) % 2 ? 'dark-square' : 'light-square'}${selected === square ? ' selected' : ''}${destinations.includes(square) ? ' legal' : ''}${played?.to === square || played?.from === square ? ' last-move' : ''}" data-square="${square}" aria-label="${label}" aria-pressed="${selected === square}"${played ? ' disabled' : ''}>
        ${file === 0 ? `<span class="rank-label" aria-hidden="true">${rank}</span>` : ''}
        ${rank === 1 ? `<span class="file-label" aria-hidden="true">${files[file]}</span>` : ''}
        ${occupant ? `<span aria-hidden="true" class="chess-piece ${occupant.color}">${glyphs[occupant.piece]}</span>` : ''}
      </button>`;
    }).join('');
  }
  container.addEventListener('click', event => {
    const button = event.target.closest('[data-square]');
    if (!button || played) return;
    const square = button.dataset.square;
    const verdict = selected ? judgeOpening(selected, square) : null;
    if (verdict !== null) {
      const piece = board[selected].piece;
      played = { from: selected, to: square };
      board[square] = board[selected]; delete board[selected]; selected = null;
      result.className = `chess-result ${verdict ? 'correct' : 'wrong'}`;
      result.innerHTML = verdict
        ? '<strong>correct!!</strong> 1. b3 — nimzo–larsen attack. excellent taste.'
        : `<strong>wrongg!!</strong> 1. ${piece === 'n' ? 'N' : ''}${square}? try again :)`;
      render(); root.querySelector('.chess-reset').focus({ preventScroll: true });
      return;
    }
    if (board[square]?.color === 'white' && openingMoves(square).length) {
      selected = selected === square ? null : square;
      result.textContent = selected ? `choose a destination for ${square}.` : 'your move.';
    } else result.textContent = selected ? 'that square is not a legal destination.' : 'start with a white pawn or knight.';
    render(); container.querySelector(`[data-square="${square}"]`).focus({ preventScroll: true });
  });
  container.addEventListener('keydown', event => {
    const button = event.target.closest('[data-square]');
    if (!button || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    const square = button.dataset.square;
    const file = Math.max(0, Math.min(7, files.indexOf(square[0]) + (event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0)));
    const rank = Math.max(1, Math.min(8, +square[1] + (event.key === 'ArrowUp' ? 1 : event.key === 'ArrowDown' ? -1 : 0)));
    container.querySelector(`[data-square="${files[file]}${rank}"]`).focus();
  });
  root.querySelector('.chess-reset').addEventListener('click', () => {
    board = initialBoard(); selected = played = null;
    result.className = 'chess-result'; result.textContent = 'your move.'; render();
    container.querySelector('[data-square="e2"]').focus({ preventScroll: true });
  });
  render();
}

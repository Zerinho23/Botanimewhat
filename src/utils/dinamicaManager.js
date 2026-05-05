// Gestiona las dinámicas/juegos activos por grupo
const activeGames = new Map(); // groupJid -> gameState

function startGame(groupJid, game) {
  const existing = activeGames.get(groupJid);
  if (existing?.timeout) clearTimeout(existing.timeout);
  activeGames.set(groupJid, game);
}

function getGame(groupJid) {
  return activeGames.get(groupJid) || null;
}

function endGame(groupJid) {
  const game = activeGames.get(groupJid);
  if (game?.timeout) clearTimeout(game.timeout);
  activeGames.delete(groupJid);
}

module.exports = { startGame, getGame, endGame };

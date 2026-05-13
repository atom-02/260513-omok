import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RotateCcw, User, Cpu, Trophy, History } from 'lucide-react';

const SIZE = 19;
const PADDING = 30;
const CANVAS_SIZE = 600;
const CELL_SIZE = (CANVAS_SIZE - PADDING * 2) / (SIZE - 1);
const STONE_RADIUS = CELL_SIZE * 0.42;

type Player = 1 | 2; // 1: Black, 2: White
type GameMode = 'pve' | 'pvp';

interface BoardState {
  grid: (Player | 0)[][];
  history: { r: number; c: number; p: Player }[];
}

export default function OmokGame() {
  const [board, setBoard] = useState<BoardState>({
    grid: Array.from({ length: SIZE }, () => Array(SIZE).fill(0)),
    history: [],
  });
  const [currentPlayer, setCurrentPlayer] = useState<Player>(1);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [winner, setWinner] = useState<Player | null>(null);
  const [gameMode, setGameMode] = useState<GameMode>('pve');
  const [isAiThinking, setIsAiThinking] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Draw the board and stones
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Board Background
    ctx.fillStyle = "#e3a05b";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid Lines
    ctx.beginPath();
    ctx.strokeStyle = "rgba(0,0,0,0.8)";
    ctx.lineWidth = 1;
    for (let i = 0; i < SIZE; i++) {
      // Horizontal
      ctx.moveTo(PADDING, PADDING + i * CELL_SIZE);
      ctx.lineTo(CANVAS_SIZE - PADDING, PADDING + i * CELL_SIZE);
      // Vertical
      ctx.moveTo(PADDING + i * CELL_SIZE, PADDING);
      ctx.lineTo(PADDING + i * CELL_SIZE, CANVAS_SIZE - PADDING);
    }
    ctx.stroke();

    // Star Points (Standard Positions)
    const dots = [3, 9, 15];
    ctx.fillStyle = "rgba(0,0,0,0.9)";
    dots.forEach(row => {
      dots.forEach(col => {
        ctx.beginPath();
        ctx.arc(PADDING + col * CELL_SIZE, PADDING + row * CELL_SIZE, 4, 0, Math.PI * 2);
        ctx.fill();
      });
    });

    // Draw Stones
    board.grid.forEach((row, r) => {
      row.forEach((player, c) => {
        if (player !== 0) {
          drawStone(ctx, r, c, player);
        }
      });
    });

    // Highlight last move
    if (board.history.length > 0) {
      const last = board.history[board.history.length - 1];
      ctx.beginPath();
      ctx.strokeStyle = last.p === 1 ? "white" : "red";
      ctx.lineWidth = 2;
      ctx.arc(
        PADDING + last.c * CELL_SIZE,
        PADDING + last.r * CELL_SIZE,
        STONE_RADIUS / 2,
        0,
        Math.PI * 2
      );
      ctx.stroke();
    }
  }, [board]);

  const drawStone = (ctx: CanvasRenderingContext2D, r: number, c: number, player: Player) => {
    const x = PADDING + c * CELL_SIZE;
    const y = PADDING + r * CELL_SIZE;

    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, STONE_RADIUS, 0, Math.PI * 2);

    const grad = ctx.createRadialGradient(
      x - STONE_RADIUS / 3,
      y - STONE_RADIUS / 3,
      1,
      x,
      y,
      STONE_RADIUS
    );

    if (player === 1) {
      grad.addColorStop(0, "#555");
      grad.addColorStop(1, "#0a0a0a");
    } else {
      grad.addColorStop(0, "#ffffff");
      grad.addColorStop(1, "#d1d1d1");
    }

    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 3;
    ctx.shadowColor = "rgba(0,0,0,0.4)";
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.restore();
  };

  useEffect(() => {
    draw();
  }, [draw]);

  const checkWin = (grid: (Player | 0)[][], r: number, c: number, p: Player) => {
    const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
    for (const [dr, dc] of dirs) {
      let count = 1;
      // One direction
      for (let i = 1; i < 5; i++) {
        const nr = r + dr * i, nc = c + dc * i;
        if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && grid[nr][nc] === p) count++; else break;
      }
      // Opposite direction
      for (let i = 1; i < 5; i++) {
        const nr = r - dr * i, nc = c - dc * i;
        if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && grid[nr][nc] === p) count++; else break;
      }
      if (count >= 5) return true;
    }
    return false;
  };

  const makeMove = useCallback((r: number, c: number) => {
    if (gameOver || board.grid[r][c] !== 0) return;

    const newGrid = board.grid.map(row => [...row]);
    newGrid[r][c] = currentPlayer;
    const newHistory = [...board.history, { r, c, p: currentPlayer }];

    setBoard({ grid: newGrid, history: newHistory });

    if (checkWin(newGrid, r, c, currentPlayer)) {
      setWinner(currentPlayer);
      setGameOver(true);
      return;
    }

    setCurrentPlayer(prev => (prev === 1 ? 2 : 1));
  }, [board, currentPlayer, gameOver]);

  // Enhanced Heuristic AI
  const evaluatePosition = (grid: (Player | 0)[][], r: number, c: number) => {
    const getPatternScore = (player: Player) => {
      let score = 0;
      const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
      
      for (const [dr, dc] of dirs) {
        // Look at a 9-cell window centered on (r, c)
        let line = [];
        for (let i = -4; i <= 4; i++) {
          const nr = r + dr * i;
          const nc = c + dc * i;
          if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE) {
            if (i === 0) line.push(player); // Assume stone is placed
            else line.push(grid[nr][nc]);
          } else {
            line.push(-1); // Wall / Outside
          }
        }

        const lineStr = line.map(v => v === -1 ? 'X' : v === 0 ? '0' : v === player ? '1' : '2').join('');
        // 1=Current point/Player, 0=Empty, 2=Opponent, X=Wall

        // High priority patterns
        if (lineStr.includes('11111')) score += 100000; // Win
        if (lineStr.includes('011110')) score += 10000; // Open Four
        if (lineStr.includes('011112') || lineStr.includes('211110') || lineStr.includes('01111X') || lineStr.includes('X11110')) score += 5000; // Four
        if (lineStr.includes('10111') || lineStr.includes('11101') || lineStr.includes('11011')) score += 4500; // Broken Four
        if (lineStr.includes('01110')) score += 1000; // Open Three
        if (lineStr.includes('01112') || lineStr.includes('21110') || lineStr.includes('010110') || lineStr.includes('011010')) score += 500; // Three / Broken Three
        if (lineStr.includes('0110')) score += 100; // Open Two
      }
      return score;
    };

    // AI is White (2), Human is Black (1)
    const attackScore = getPatternScore(2); // AI's offensive potential
    const defenseScore = getPatternScore(1); // Block human's potential

    // Strategic weightings
    // If Human has an immediate win (4 in a row), block it at all costs.
    // If AI can win, take it.
    let totalScore = attackScore + defenseScore * 1.1; 

    // Center bonus
    const distFromCenter = Math.abs(r - SIZE/2) + Math.abs(c - SIZE/2);
    totalScore += (20 - distFromCenter);

    return totalScore;
  };

  const aiAction = useCallback(() => {
    if (gameOver || currentPlayer !== 2 || gameMode !== 'pve') return;

    setIsAiThinking(true);
    
    setTimeout(() => {
      let bestScore = -1;
      let candidates: {r: number, c: number}[] = [];

      // Optimize: Only search near existing stones
      const searchRange = 2;
      const interestPoints: {r: number, c: number}[] = [];
      
      if (board.history.length === 0) {
        interestPoints.push({ r: 9, c: 9 });
      } else {
        for (let r = 0; r < SIZE; r++) {
          for (let c = 0; c < SIZE; c++) {
            if (board.grid[r][c] === 0) {
              let nearStone = false;
              for (let i = -searchRange; i <= searchRange; i++) {
                for (let j = -searchRange; j <= searchRange; j++) {
                  const nr = r + i, nc = c + j;
                  if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && board.grid[nr][nc] !== 0) {
                    nearStone = true;
                    break;
                  }
                }
                if (nearStone) break;
              }
              if (nearStone) interestPoints.push({ r, c });
            }
          }
        }
      }

      // If no stones yet, start in middle
      if (interestPoints.length === 0) {
        interestPoints.push({ r: 9, c: 9 });
      }

      for (const pt of interestPoints) {
        const score = evaluatePosition(board.grid, pt.r, pt.c);
        if (score > bestScore) {
          bestScore = score;
          candidates = [pt];
        } else if (score === bestScore) {
          candidates.push(pt);
        }
      }

      const move = candidates[Math.floor(Math.random() * candidates.length)];
      makeMove(move.r, move.c);
      setIsAiThinking(false);
    }, 500);
  }, [board, currentPlayer, gameMode, gameOver, makeMove]);

  useEffect(() => {
    if (gameMode === 'pve' && currentPlayer === 2 && !gameOver) {
      aiAction();
    }
  }, [currentPlayer, gameMode, gameOver, aiAction]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameOver || (gameMode === 'pve' && currentPlayer === 2)) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const c = Math.round((x - PADDING) / CELL_SIZE);
    const r = Math.round((y - PADDING) / CELL_SIZE);

    if (r >= 0 && r < SIZE && c >= 0 && c < SIZE && board.grid[r][c] === 0) {
      makeMove(r, c);
    }
  };

  const resetGame = () => {
    setBoard({
      grid: Array.from({ length: SIZE }, () => Array(SIZE).fill(0)),
      history: [],
    });
    setCurrentPlayer(1);
    setGameOver(false);
    setWinner(null);
  };

  return (
    <div className="flex flex-col lg:flex-row items-center lg:items-start justify-center gap-8 p-6 min-h-screen bg-[#fdfaf5] font-sans">
      {/* Sidebar Info */}
      <div className="w-full lg:w-72 flex flex-col gap-6 order-2 lg:order-1">
        <div className="bg-white p-6 rounded-3xl shadow-xl shadow-orange-900/5 border border-orange-100">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">OMOK PREMIUM</h1>
          <p className="text-slate-500 text-sm mb-6">전통적인 오목의 미학을 경험하세요.</p>

          <div className="space-y-4">
            {/* Game Mode Toggle */}
            <div className="flex p-1 bg-slate-100 rounded-xl">
              <button
                onClick={() => { setGameMode('pve'); resetGame(); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold rounded-lg transition-all ${
                  gameMode === 'pve' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Cpu className="w-4 h-4" /> AI 대결
              </button>
              <button
                onClick={() => { setGameMode('pvp'); resetGame(); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold rounded-lg transition-all ${
                  gameMode === 'pvp' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <User className="w-4 h-4" /> 2인용
              </button>
            </div>

            {/* Current Turn Status */}
            <div className={`p-4 rounded-2xl border-l-4 transition-all ${
              currentPlayer === 1 ? 'bg-slate-50 border-slate-900' : 'bg-orange-50 border-orange-300'
            }`}>
              <div className="text-xs text-slate-400 font-medium mb-1 uppercase tracking-wider">현재 차례</div>
              <div className="flex items-center gap-3">
                <div className={`w-4 h-4 rounded-full border shadow-sm ${
                  currentPlayer === 1 ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
                }`} />
                <span className="text-xl font-bold text-slate-800">
                  {gameOver ? '경기 종료' : (
                    currentPlayer === 1 ? '흑돌 (플레이어)' : (gameMode === 'pve' ? '백돌 (AI)' : '백돌 (플레이어2)')
                  )}
                </span>
              </div>
              {isAiThinking && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex gap-1">
                    <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 0.6 }} className="w-1 h-1 bg-orange-400 rounded-full" />
                    <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-1 h-1 bg-orange-400 rounded-full" />
                    <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="w-1 h-1 bg-orange-400 rounded-full" />
                  </div>
                  <span className="text-xs text-orange-500 font-medium italic">AI가 분석 중...</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats / Controls */}
        <div className="bg-white p-6 rounded-3xl shadow-xl shadow-orange-900/5 border border-orange-100 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-600">
               <History className="w-4 h-4" />
               <span className="text-sm font-medium">총 수: {board.history.length}수</span>
            </div>
          </div>
          
          <button
            onClick={resetGame}
            className="w-full flex items-center justify-center gap-2 py-3 bg-rose-500 hover:bg-rose-600 active:scale-95 text-white font-bold rounded-xl shadow-lg shadow-rose-200 transition-all"
          >
            <RotateCcw className="w-5 h-5" /> 새 게임 시작
          </button>
        </div>
      </div>

      {/* Main Board */}
      <div className="relative group order-1 lg:order-2">
        <div className="absolute -inset-4 bg-orange-900/10 rounded-[2.5rem] blur-2xl opacity-50 transition-opacity" />
        
        <div className="relative p-2 bg-[#d3904b] rounded-lg shadow-2xl overflow-hidden shadow-black/40">
          <canvas
            ref={canvasRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            onClick={handleCanvasClick}
            className="block cursor-pointer active:scale-[0.99] transition-transform duration-75"
          />
        </div>

        {/* Win Overlay */}
        <AnimatePresence>
          {gameOver && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <div className="bg-white/90 backdrop-blur-md px-10 py-8 rounded-3xl shadow-2xl border border-white/50 text-center pointer-events-auto">
                <Trophy className={`w-16 h-16 mx-auto mb-4 ${winner === 1 ? 'text-slate-900' : 'text-orange-500'}`} />
                <h2 className="text-2xl font-black text-slate-900 mb-1">
                  {winner === 1 ? '흑돌의 완벽한 승리!' : '백돌의 짜릿한 승리!'}
                </h2>
                <p className="text-slate-500 font-medium mb-6">
                  {board.history.length}수 만에 승패가 결정되었습니다.
                </p>
                <button
                  onClick={resetGame}
                  className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-800 transition-colors"
                >
                  다시 도전하기
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

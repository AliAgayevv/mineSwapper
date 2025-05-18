const SQUARE_SIZE = 50; // Hər bir xananın ölçüsü
const TEXT_SIZE = 32; // Xana içindəki yazının ölçüsü
const centeredSquareStyle = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
};
const overlayStyle = {
  position: "fixed",
  top: "0",
  left: "0",
  width: "100%",
  height: "100%",
  backgroundColor: "rgba(0, 0, 0, 0.7)",
  zIndex: "100",
};
const messageStyle = {
  backgroundColor: "#fff",
  color: "#000",
  padding: "20px 40px",
  borderRadius: "10px",
  boxShadow: "0 0 20px rgba(0, 0, 0, 0.5)",
  textAlign: "center",
};

const startGameButton = document.getElementById("startGame");

startGameButton.addEventListener("click", () => startGame());

class Game {
  // Oyun çətinliklərini saxlayır static olmasinin sebebi odur ki, bu sinifdən instance yaradanda hər dəfə bu enumu yaratmayaq, bu enum-ı istifade etmek ucun sadece Game.DIFFICULTY_CONFIGS istifadə ede bilerik
  static DIFFICULTY_CONFIGS = {
    easy: { columns: 9, rows: 9, mineCount: 10 },
    medium: { columns: 16, rows: 16, mineCount: 40 },
    hard: { columns: 30, rows: 16, mineCount: 99 },
  };

  // Game constructor - oyun çətinliyini alır və uyğun sətir, sütun və mina sayını təyin edir
  constructor(difficulty) {
    const normalizedDifficulty = difficulty?.toLowerCase();
    if (!Game.DIFFICULTY_CONFIGS[normalizedDifficulty]) {
      throw new Error(
        `Keçersiz çətinlik səviyyəsi: "${difficulty}". Keçərli seçimlər: ${Object.keys(
          Game.DIFFICULTY_CONFIGS
        ).join(", ")}`
      );
    }

    // Destructuring edərək enumdan sütün, sətir və mina sayını alırıq
    const { columns, rows, mineCount } =
      Game.DIFFICULTY_CONFIGS[normalizedDifficulty];
    // _ ilə başlayan dəyişənlər private dəyişənlərdir, yəni game instance-ında yalnız bu sinifdə istifadə edilə bilər
    // Destructuring edərək enumdan aldığımız sütün, sətir və mina sayını private dəyişənlərə mənimsədirik
    this._columns = columns;
    this._rows = rows;
    this._mineCount = mineCount;
    // initial olaraq oyun vəziyyətini "playing" olaraq təyin edirik
    this._gameState = "playing";
    // Bütün xanaları saxlayacaq array
    this._squares = [];

    // Butun bos xanalarin sayi (checkWinCondition metodunun optimal versiyasında istifadə edirik)
    this._totalSafeCells = this._rows * this._columns - this._mineCount;

    this._revealedSafeCells = 0; // Açılmış bos xanalarin sayı
  }

  // Board mount edilməsi üçün metod
  renderBoard() {
    const board = document.getElementById("board");
    if (!board) {
      console.error("Board elementi tapılmadı!");
      return;
    }

    // Boardu sıfırlayırıq
    board.innerHTML = "";
    // Boardun ölçülərini təyin edirik. Grid template colums və rows sayına əsasən edirik ki hər hansı bir sütün və sətir sayı ilə boardu render edə bilək
    board.style.gridTemplateColumns = `repeat(${this._columns}, 1fr)`;
    board.style.gridTemplateRows = `repeat(${this._rows}, 1fr)`;
    // eni - sətir sayın * hər bir xananın ölçüsü (px)
    // hündürlüyü - sütünların sayı * hər bir xananın ölçüsü (px)
    board.style.width = `${this._columns * SQUARE_SIZE}px`;
    board.style.height = `${this._rows * SQUARE_SIZE}px`;
    board.style.display = "grid";
    board.style.border = "1px solid black";
    board.style.gap = "1px";
    board.style.position = "relative";
    board.style.margin = "20px auto";
    board.style.backgroundColor = "#f0f0f0";

    // ! Fix
    const statusDisplay = document.createElement("div");
    statusDisplay.id = "game-status";
    statusDisplay.style.textAlign = "center";
    statusDisplay.style.marginBottom = "10px";
    statusDisplay.textContent = `Mines: ${this._mineCount} | Flags: 0`;
    board.parentElement.insertBefore(statusDisplay, board);

    // Bütün xanaları saxlayacaq array
    this._squares = [];

    // Minaların təsadüfi yerlərdə yerləşdirilməsi
    // Ümumi xananın sayını hesablayırıq
    const totalCells = this._rows * this._columns;
    // Set istifadə edirik ki hər bir xanada tək bir mina olsun
    const minePositions = new Set();
    // Mina sayına bərabər qədər təsadüfi xananın yerini seçirik
    while (minePositions.size < this._mineCount) {
      const position = Math.floor(Math.random() * totalCells);
      minePositions.add(position);
    }
    // Minaları boarda yerləşdiririk (Heleki DOM elementi yaratmamışıq)
    for (let y = 0; y < this._rows; y++) {
      const row = [];
      for (let x = 0; x < this._columns; x++) {
        const position = y * this._columns + x;
        const isMined = minePositions.has(position);
        // Xana yaratmaq üçün Square sinifindən instance constructor edirik
        const square = new Square(x, y, isMined);
        row.push(square);
      }
      // Private dəyişənimiz olan _squares arrayına rowu əlavə edirik
      this._squares.push(row);
    }

    // Hər bir xananı yaratdıq, indi isə bunları render edirik
    for (let y = 0; y < this._rows; y++) {
      for (let x = 0; x < this._columns; x++) {
        const square = this._squares[y][x];
        square.createSquareElement(this); // Square elementini yaratmaq üçün Square sinifinin metodunu çağırırıq
      }
    }
  }
  // Oyun bitəndən (lose olandan) sonra bütün xanaların üstündə gəzir və mina olan yerləri göstərir
  revealAllMines() {
    for (let y = 0; y < this._rows; y++) {
      for (let x = 0; x < this._columns; x++) {
        const square = this._squares[y][x];
        // Xananı yaradanda data-x və data-y atributları ilə yaratmışdıq, və indidə həmin atributları istifadə edərək xananı tapırıq x və y koordinatları ilə
        const element = document.querySelector(
          `[data-x="${x}"][data-y="${y}"]`
        );

        if (square._isMined) {
          element.innerHTML = "💣";
          element.style.fontSize = `${TEXT_SIZE}px`;
          // Bu metodu birçox yerdə istifadə edirik, qısaca izahı odurki "element" adlı DOM elementinə "centeredSquareStyle" adlı mərkəzləmə üçün stillər olan obyekti mənimsədirik
          // və bunun daha qısa formasıdır;
          // element.style.display = "flex";
          // element.style.justifyContent = "center";
          // element.style.alignItems = "center";
          Object.assign(element.style, centeredSquareStyle);
        } else if (square._isFlagged) {
          element.innerHTML = "🚩";
          element.style.fontSize = `${TEXT_SIZE}px`;
          Object.assign(element.style, centeredSquareStyle);
        }
      }
    }
    this._gameState = "lost";
    this.showLoseMessage();
  }

  // ! checkWinCondition() üçün ilkin cəhd (optimal deyil)
  // n = rows
  // m = columns
  // m = columns
  // Burdaki funksiya O(n*m) zaman mürəkkəbliyinə malikdir, çünki bütün xanalara baxırıq
  // checkWinCondition() {
  // Əgər bütün minalar tapılıbsa və yerdə qalan xanalarda mina yoxdursa, oyunu qazanmışıq, bunun üçündə bütün xanaları check etməliyik
  //     for (let y = 0; y < this._rows; y++) {
  //       for (let x = 0; x < this._columns; x++) {
  //         const square = this._squares[y][x];
  // Əgər xananın içində mina yoxdursa və açılmayıbsa, deməli hələki oyunu qazanmış deyilik
  //         if (!square._isMined && !square._isRevealed) {
  //           return false;
  //         }
  //       }
  //     }
  // Əgər bütün minalar tapılıbsa və yerdə qalan xanalarda mina yoxdursa, oyunu qazanmışıq
  //     this._gameState = "won";
  //     this.showWinMessage();
  //     return true;
  //   }

  // bunun əvəzinə daha optimal bir yol tapdım, hansıki O(1) zaman mürəkkəbliyinə malikdir
  // ! checkWinCondition() üçün optimal yol
  checkWinCondition() {
    if (this._revealedSafeCells === this._totalSafeCells) {
      this._gameState = "won";
      this.showWinMessage();
      return true;
    }
    return false;
  }

  showLoseMessage = () => {
    const overlay = document.createElement("div");
    overlay.id = "gameOverlay";
    Object.assign(overlay.style, overlayStyle);
    Object.assign(overlay.style, centeredSquareStyle);

    // Game over mesajı
    const gameOverMessage = document.createElement("div");
    gameOverMessage.id = "gameOverMessage";
    gameOverMessage.innerHTML = `
    <h2>Oyun bitdi!</h2>
    <p>Minanı partlatdın!</p>
    <button id="playAgainBtn">Yenidən Başla</button>
    <button id="showBoard">Oyun taxtasını göstər</button>
  `;
    Object.assign(gameOverMessage.style, messageStyle);

    overlay.appendChild(gameOverMessage);
    document.body.appendChild(overlay);

    // Oyun bitdiyi zaman oyun taxtasını göstərmək
    document.getElementById("showBoard").addEventListener("click", () => {
      gameOverMessage.style.display = "none";
      overlay.style.display = "none";

      const restartButtonAfterShowBoardClicked = document.getElementById(
        "restartGameAfterShowBoard"
      );
      if (restartButtonAfterShowBoardClicked) {
        Object.assign(
          restartButtonAfterShowBoardClicked.style,
          centeredSquareStyle
        );
        ``;
        restartButtonAfterShowBoardClicked.style.marginLeft = "auto";
        restartButtonAfterShowBoardClicked.style.marginRight = "auto";
        restartButtonAfterShowBoardClicked.style.marginTop = "20px";

        restartButtonAfterShowBoardClicked.addEventListener("click", () => {
          document.body.removeChild(overlay);
          restartButtonAfterShowBoardClicked.style.display = "none";
          startGame();
        });
      }
    });

    // playAgainBtn düyməsinə basanda oyunu yenidən başladır
    document.getElementById("playAgainBtn").addEventListener("click", () => {
      // Overlay elementini silirik
      document.body.removeChild(overlay);
      startGame();
    });
  };

  incrementRevealedSafeCells() {
    this._revealedSafeCells++;
    return this.checkWinCondition();
  }

  showWinMessage() {
    // Win message da problem yarandir, nedense developer toolsda overlay de yaradilan 2 buttonun her birinde 2 event listener olurdu ve buna gorede click edile bilmirdi her ikisine, bu hissede AI dan komek aldim hell ucun
    // Əvvəlcə köhnə overlay-i təmizləyək (əgər varsa)
    const existingOverlay = document.getElementById("gameOverlay");
    if (existingOverlay) {
      document.body.removeChild(existingOverlay);
    }

    // Yeni overlay yaradaq
    const overlay = document.createElement("div");
    overlay.id = "gameOverlay";
    Object.assign(overlay.style, overlayStyle);
    Object.assign(overlay.style, centeredSquareStyle);

    const winMessage = document.createElement("div");
    winMessage.id = "winMessage";
    winMessage.innerHTML = `
    <h2>Təbriklər!</h2>
    <p>Bütün minaları tapdınız!</p>
    <button id="playAgainBtn">Yenidən başla</button>
    <button id="showBoard">Oyun taxtasını göstər</button>
  `;
    Object.assign(winMessage.style, messageStyle);

    overlay.appendChild(winMessage);
    document.body.appendChild(overlay);

    // showBoard düyməsi
    let showBoardBtn = document.getElementById("showBoard");
    if (showBoardBtn) {
      const newShowBoardBtn = showBoardBtn.cloneNode(true);
      showBoardBtn.parentNode.replaceChild(newShowBoardBtn, showBoardBtn);
      showBoardBtn = newShowBoardBtn;

      showBoardBtn.addEventListener("click", () => {
        winMessage.style.display = "none";
        overlay.style.display = "none";

        const restartButtonAfterShowBoardClicked = document.getElementById(
          "restartGameAfterShowBoard"
        );

        if (!restartButtonAfterShowBoardClicked) {
          const restartBtn = document.createElement("button");
          restartBtn.id = "restartGameAfterShowBoard";
          restartBtn.textContent = "Yenidən başla";
          restartBtn.style.display = "block";
          restartBtn.style.margin = "20px auto";
          restartBtn.style.padding = "10px 20px";

          document.getElementById("game-container").appendChild(restartBtn);

          restartBtn.addEventListener("click", () => {
            if (overlay.parentNode) {
              document.body.removeChild(overlay);
            }
            restartBtn.style.display = "none";
            startGame();
          });
        } else {
          const newRestartBtn =
            restartButtonAfterShowBoardClicked.cloneNode(true);
          restartButtonAfterShowBoardClicked.parentNode.replaceChild(
            newRestartBtn,
            restartButtonAfterShowBoardClicked
          );

          Object.assign(newRestartBtn.style, centeredSquareStyle);
          newRestartBtn.style.marginLeft = "auto";
          newRestartBtn.style.marginRight = "auto";
          newRestartBtn.style.marginTop = "20px";
          newRestartBtn.style.display = "block";

          newRestartBtn.addEventListener("click", () => {
            if (overlay.parentNode) {
              document.body.removeChild(overlay);
            }
            newRestartBtn.style.display = "none";
            startGame();
          });
        }
      });
    }

    let playAgainBtn = document.getElementById("playAgainBtn");
    if (playAgainBtn) {
      const newPlayAgainBtn = playAgainBtn.cloneNode(true);
      playAgainBtn.parentNode.replaceChild(newPlayAgainBtn, playAgainBtn);
      playAgainBtn = newPlayAgainBtn;

      playAgainBtn.addEventListener("click", () => {
        if (overlay.parentNode) {
          document.body.removeChild(overlay);
        }
        startGame();
      });
    }
  }
}

function startGame() {
  const difficultySelect = document.getElementById("gameDifficulys");
  if (!difficultySelect) {
    console.error("Seçilən oyun çətinliyi tapılmadı!");
    return;
  }
  // Dropdowndaki seçim əsasında Game instance yaradılır və board render edilir
  const difficultyValue = difficultySelect.value;
  const game = new Game(difficultyValue);
  game.renderBoard();

  // Dropdownu gizlətmək üçün
  difficultySelect.parentElement.style.display = "none";
  const startGameButton = document.getElementById("startGame");
  // Start buttonu gizlətmək üçün
  if (startGameButton) {
    startGameButton.style.display = "none";
  }
}

// Hər bir xana bu sinifdən törəyir, constructor olaraq x, y və bir sıra xana parametrləri alır və törədilən objectə məniməsdir
class Square {
  constructor(xArg, yArg, isMined) {
    this._x = xArg;
    this._y = yArg;
    this._isMined = isMined; // Mina var mı
    this._isRevealed = false; // Xananın açılıb-açılmadığı
    this._isFlagged = false; // Bayraq qoyulubmu
    this._adjacentMines = 0; // Xananın ətrafındaki 8 dənə zonadaki mina sayı
  }

  // DOMda xananı yaratmaq üçün metod
  createSquareElement(game) {
    // game instanceini alırıq ki, xananın ətrafındakı minaları hesablaya bilək
    const squareElement = document.createElement("div");
    squareElement.style.width = `${SQUARE_SIZE - 3}px`;
    squareElement.style.height = `${SQUARE_SIZE - 3}px`;
    squareElement.style.border = "1px solid #ccc";

    // Hər bir xananı yaradanda ona x və y koordinatlarını data-x və data-y atributları ilə veririk ki, daha sonra həmin xananı tapmaq üçün istifadə edə bilək
    squareElement.setAttribute("data-x", this._x);
    squareElement.setAttribute("data-y", this._y);

    squareElement.addEventListener("click", () => {
      // Əgər xana açılmayıbsa, mina yoxdursa və oyun hələ bitməyibsə, xananı açırıq
      if (
        !this._isRevealed &&
        !this._isFlagged &&
        game._gameState === "playing"
      ) {
        // Kəşf edildi olaraq təyin edirik
        this._isRevealed = true;

        if (this._adjacentMines === 0) {
          this._adjacentMines = this.calculateMines(game);
        }

        // Əgər açılan xanada mina varsa, həm minanı göstəririk, həm də oyunu bitirmək üçün funksiya çağırırıq
        if (this._isMined) {
          squareElement.innerHTML = "💣";
          squareElement.style.fontSize = `${TEXT_SIZE}px`;
          Object.assign(squareElement.style, centeredSquareStyle);
          game.revealAllMines();
          game._gameState = "lost"; // parametr olaraq game instanceini almağımızın bir digər səbəbi də budur
        } else {
          // Əgər mina yoxdursa, xananı açırıq və ətrafındakı minaları hesablamaq üçün funksiya çağırırıq
          this.addNumber(game);

          game.incrementRevealedSafeCells();

          // Əgər ətrafında mina yoxdursa, ətrafındakı bütün xanaları açırıq
          if (this._adjacentMines === 0) {
            // 8 dənə qonşu xananı tapmaq üçün funksiya çağırırıq
            const neighbors = this.getNeighbors(game);
            for (const neighbor of neighbors) {
              // Qonşu xananın açılmadığını və bayraq qoyulmadığını yoxlayırıq
              // Əgər qonşu xananın içində mina yoxdursa, onu clcik edirik (avtomatik olur)
              if (!neighbor._isRevealed && !neighbor._isFlagged) {
                const neighborElement = document.querySelector(
                  `[data-x="${neighbor._x}"][data-y="${neighbor._y}"]`
                );
                if (neighborElement) {
                  neighborElement.click();
                }
              }
            }
          }

          // Hər bir successful clickdən sonra oyunun statusunu yoxlayırıq ki win olub ya yox
          game.checkWinCondition();
        }
      }
    });

    // Sağ click ilə bayraq qoymaq üçün
    squareElement.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      this.addFlag(game);
    });

    squareElement.addEventListener("touchstart", (event) => {
      touchStartX = event.touches[0].clientX;
      touchStartY = event.touches[0].clientY;

      touchTimeout = setTimeout(() => {
        this.addFlag(game);
      }, 500);
    });

    squareElement.addEventListener("touchend", () => {
      clearTimeout(touchTimeout);
    });

    squareElement.addEventListener("touchmove", (event) => {
      const touchX = event.touches[0].clientX;
      const touchY = event.touches[0].clientY;

      const moveThreshold = 10;

      if (
        Math.abs(touchX - touchStartX) > moveThreshold ||
        Math.abs(touchY - touchStartY) > moveThreshold
      ) {
        clearTimeout(touchTimeout);
      }
    });

    // Yaratdığımız xananı DOMa əlavə edirik
    document.getElementById("board").appendChild(squareElement);
    return squareElement; // Referansı qaytarırıq ki, funksiya çağıranda istifadə edə bilək
  }

  // Hər bir xananın sağ clickdə işə düşəcək funksiyası
  addFlag(game) {
    // Əgər xana açılmayıbsa, o zaman ona bayraq qoya bilirik, açılmış yerə qoya bilmirik
    if (!this._isRevealed && game._gameState === "playing") {
      // Toggle məntiqi çünki bayrağı qoyandan sonra götürə bilirik yenidən sağ click edib
      this._isFlagged = !this._isFlagged;
      const squareElement = document.querySelector(
        `[data-x="${this._x}"][data-y="${this._y}"]`
      );

      if (squareElement) {
        if (this._isFlagged) {
          Object.assign(squareElement.style, centeredSquareStyle);
          squareElement.innerHTML = "🚩";
          squareElement.style.fontSize = `${TEXT_SIZE}px`;
          squareElement.style.backgroundColor = "#f0f0f0";
        } else {
          squareElement.innerHTML = "";
        }
        squareElement.style.backgroundColor = "#f0f0f0";
      }
    }
  }

  // Xananın ətrafındaki minaları xananın içində göstərmək üçün funksiya
  addNumber(game) {
    const squareElement = document.querySelector(
      `[data-x="${this._x}"][data-y="${this._y}"]`
    );

    if (!squareElement) return;

    if (this._adjacentMines === 0) {
      this._adjacentMines = this.calculateMines(game);
    }

    if (this._adjacentMines > 0) {
      squareElement.innerText = this._adjacentMines;
      squareElement.style.fontSize = `${TEXT_SIZE}px`;
      Object.assign(squareElement.style, centeredSquareStyle);

      // Hər bir rəqəmdə fərqli rəng olacaq
      const colors = [
        "",
        "blue",
        "green",
        "red",
        "darkblue",
        "brown",
        "teal",
        "black",
        "gray",
      ];
      squareElement.style.color = colors[this._adjacentMines] || "black";
    } else {
      squareElement.innerText = "";
    }

    squareElement.style.backgroundColor = "#e0e0e0";
  }

  // Xananın ətrafındakı minaları hesablamaq üçün funksiya
  calculateMines(game) {
    // Əgər xananın özündə mina varsa, -1 qaytarırıq
    if (this._isMined) return -1;

    // Ətrafındakı minaları hesablamaq üçün qonşu xanalara (8 ədəd) baxırıq
    let mineCount = 0;
    const neighbors = this.getNeighbors(game);

    for (const neighbor of neighbors) {
      if (neighbor._isMined) {
        mineCount++;
      }
    }

    return mineCount;
  }

  // Qonşu xanaları tapmaq üçün funksiya
  getNeighbors(game) {
    // Boş bir array initial edirik
    const neighbors = [];

    // Y oxu istiqamətində -1, 0, 1 addımları üçün dövr edirik
    for (let dy = -1; dy <= 1; dy++) {
      // X oxu istiqamətində -1, 0, 1 addımları üçün dövr edirik
      for (let dx = -1; dx <= 1; dx++) {
        // Əgər dx=0 və dy=0 olarsa, bu hazırki xananın özüdür, keçirik
        if (dx === 0 && dy === 0) continue;

        // Qonşu xananın koordinatlarını hesablayırıq
        const neighborX = this._x + dx;
        const neighborY = this._y + dy;

        // Burda check edirik ki, qonşu xananın koordinatları boardımızın sərhədləri içindədir ya yox
        if (
          neighborX >= 0 && // Sol sərhəddən kənara çıxmır
          neighborX < game._columns && // Sağ sərhəddən kənara çıxmır
          neighborY >= 0 && // Yuxarı sərhəddən kənara çıxmır
          neighborY < game._rows // Aşağı sərhəddən kənara çıxmır
        ) {
          // Əgər koordinatlar düzgündürsə, bu xananı qonşular siyahısına əlavə edirik
          neighbors.push(game._squares[neighborY][neighborX]);
        }
      }
    }

    return neighbors;
  }
}

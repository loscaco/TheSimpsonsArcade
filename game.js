const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

ctx.imageSmoothingEnabled = false;

// Variables de Estado y Progresión
let gameState = "MENU";
let score = 0;
let lives = 3;
let stageWaves = 0;
let cameraX = 0;

// Delimitadores del plano de profundidad (Y-Sorting Floor)
const GROUND_MIN = 320;
const GROUND_MAX = 460;

// Jugador (Homer con físicas de sprite dinámico)
const player = {
    x: 120,
    y: 390,
    z: 0,
    vz: 0,
    width: 64,
    height: 96,
    speed: 4,
    facing: 1, // 1: Derecha, -1: Izquierda
    isJumping: false,
    isPunching: false,
    animFrame: 0,
    animTimer: 0,
    state: "IDLE" // IDLE, WALK, JUMP, PUNCH, HIT
};

let enemies = [];
let effects = []; // Textos flotantes de daño o gráficos estilo "POW!"

// Controles
const input = { left: false, right: false, up: false, down: false };

window.addEventListener("keydown", (e) => handleKey(e, true));
window.addEventListener("keyup", (e) => handleKey(e, false));

function handleKey(e, isDown) {
    switch(e.key.toLowerCase()) {
        case "arrowleft": case "a": input.left = isDown; break;
        case "arrowright": case "d": input.right = isDown; break;
        case "arrowup": case "w": input.up = isDown; break;
        case "arrowdown": case "s": input.down = isDown; break;
        case " ": case "k": if(isDown) triggerJump(); break;
        case "j": case "f": if(isDown) triggerPunch(); break;
    }
}

// Configuración táctil
setupTouchButton("btnLeft", "left");
setupTouchButton("btnRight", "right");
setupTouchButton("btnUp", "up");
setupTouchButton("btnDown", "down");
document.getElementById("btnJump").addEventListener("click", triggerJump);
document.getElementById("btnPunch").addEventListener("click", triggerPunch);

function setupTouchButton(id, key) {
    const btn = document.getElementById(id);
    btn.addEventListener("touchstart", (e) => { e.preventDefault(); input[key] = true; });
    btn.addEventListener("touchend", (e) => { e.preventDefault(); input[key] = false; });
    btn.addEventListener("mousedown", () => input[key] = true);
    btn.addEventListener("mouseup", () => input[key] = false);
}

function triggerJump() {
    if (gameState === "PLAYING" && !player.isJumping) {
        player.vz = -10;
        player.isJumping = true;
        player.state = "JUMP";
    }
}

function triggerPunch() {
    if (gameState === "PLAYING" && !player.isPunching) {
        player.isPunching = true;
        player.state = "PUNCH";
        player.animFrame = 0;

        // Comprobación de Hitbox contra enemigos en rango táctico
        enemies.forEach((enemy, idx) => {
            const hitBoxX = player.facing === 1 ? player.x + player.width : player.x - 45;
            const distanceX = Math.abs((player.x + player.width/2) - (enemy.x + enemy.width/2));
            const distanceY = Math.abs(player.y - enemy.y);

            if (distanceX < 75 && distanceY < 30) {
                if ((player.facing === 1 && enemy.x > player.x) || (player.facing === -1 && enemy.x < player.x)) {
                    enemy.hp -= 1;
                    enemy.isHit = true;
                    enemy.hitTimer = 10;
                    score += 150;

                    // Generar efecto visual de impacto estilo cómic
                    effects.push({
                        text: "POW!",
                        x: enemy.x + 10,
                        y: enemy.y - 30,
                        life: 25,
                        color: "#ffcc00"
                    });

                    if (enemy.hp <= 0) {
                        enemies.splice(idx, 1);
                        stageWaves++;
                        spawnEnemy();
                    }
                }
            }
        });

        setTimeout(() => { player.isPunching = false; }, 200);
    }
}

function startGame() {
    gameState = "PLAYING";
    score = 0;
    lives = 3;
    stageWaves = 0;
    player.x = 100;
    player.y = 400;
    enemies = [];
    effects = [];
    spawnEnemy();
    document.getElementById("startScreen").classList.add("hidden");
    document.getElementById("gameOverScreen").classList.add("hidden");
}

function resetGame() {
    startGame();
}

function spawnEnemy() {
    enemies.push({
        x: cameraX + canvas.width + 100 + Math.random() * 150,
        y: GROUND_MIN + Math.random() * (GROUND_MAX - GROUND_MIN),
        width: 56,
        height: 88,
        speed: 1.5 + Math.random() * 0.8,
        hp: 2,
        isHit: false,
        hitTimer: 0,
        type: Math.random() > 0.5 ? "SMITHERS" : "AGENT"
    });
}

function gameLoop() {
    update();
    render();
    requestAnimationFrame(gameLoop);
}

function update() {
    if (gameState !== "PLAYING") return;

    let isMoving = false;
    if (input.left) { player.x -= player.speed; player.facing = -1; isMoving = true; }
    if (input.right) { player.x += player.speed; player.facing = 1; isMoving = true; }
    if (input.up) { player.y -= player.speed * 0.8; isMoving = true; }
    if (input.down) { player.y += player.speed * 0.8; isMoving = true; }

    if (isMoving && !player.isJumping && !player.isPunching) {
        player.state = "WALK";
        player.animTimer++;
        if (player.animTimer > 8) {
            player.animFrame = (player.animFrame + 1) % 4;
            player.animTimer = 0;
        }
    } else if (!player.isJumping && !player.isPunching && player.state !== "IDLE") {
        player.state = "IDLE";
    }

    // Límites de suelo
    if (player.y < GROUND_MIN) player.y = GROUND_MIN;
    if (player.y > GROUND_MAX) player.y = GROUND_MAX;
    if (player.x < cameraX + 20) player.x = cameraX + 20;

    // Desplazamiento de Cámara (Parallax dinámico)
    if (player.x > cameraX + canvas.width * 0.5) {
        cameraX = player.x - canvas.width * 0.5;
    }

    // Gravedad de Salto
    if (player.isJumping) {
        player.z += player.vz;
        player.vz += 0.65;
        if (player.z >= 0) {
            player.z = 0;
            player.isJumping = false;
            player.state = "IDLE";
        }
    }

    // Actualización de Enemigos (Persecución Inteligente)
    enemies.forEach(enemy => {
        if (enemy.hitTimer > 0) enemy.hitTimer--;
        else enemy.isHit = false;

        if (enemy.x > player.x + 20) enemy.x -= enemy.speed;
        if (enemy.x < player.x - 20) enemy.x += enemy.speed;
        if (enemy.y < player.y - 2) enemy.y += enemy.speed * 0.4;
        if (enemy.y > player.y + 2) enemy.y -= enemy.speed * 0.4;

        // Daño al jugador por colisión directa
        const dist = Math.hypot((player.x - enemy.x), (player.y - enemy.y));
        if (dist < 40 && player.z === 0) {
            lives--;
            player.x -= player.facing * 40; // Empuje de retroceso
            effects.push({ text: "-1 ❤️", x: player.x, y: player.y - 40, life: 30, color: "#ff3333" });
            if (lives <= 0) {
                triggerGameOver();
            }
        }
    });

    // Actualizar Efectos Flotantes
    effects.forEach((eff, idx) => {
        eff.y -= 1;
        eff.life--;
        if (eff.life <= 0) effects.splice(idx, 1);
    });

    // Actualizar HUD superior
    document.getElementById("hudScore").innerText = `1UP: ${String(score).padStart(6, '0')}`;
    document.getElementById("hudLives").innerText = `HOMER: ${'❤️'.repeat(Math.max(0, lives))}`;
}

function triggerGameOver() {
    gameState = "GAMEOVER";
    document.getElementById("finalStats").innerText = `FINAL SCORE: ${score} | STAGE CLEARED: ${stageWaves}`;
    const tweetText = encodeURIComponent(`¡Conseguí ${score} puntos en Springfield Arcade! 🍩🎮 Reviví la experiencia Konami acá: https://loscaco.github.io/TheSimpsonsArcade/`);
    document.getElementById("shareBtn").href = `https://twitter.com/intent/tweet?text=${tweetText}`;
    document.getElementById("gameOverScreen").classList.remove("hidden");
}

function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // --- CAPA 1: FONDO URBANO CON EFECTO PARALLAX ---
    ctx.fillStyle = "#120d26"; // Cielo nocturno Springfield
    ctx.fillRect(0, 0, canvas.width, GROUND_MIN);

    // Edificios lejanos desplazados a menor velocidad (Parallax)
    ctx.fillStyle = "#1d1538";
    let bgScroll = cameraX * 0.3;
    for (let i = -1; i < 5; i++) {
        ctx.fillRect(i * 200 - (bgScroll % 200), GROUND_MIN - 140, 140, 140);
        // Ventanas iluminadas típicas de la planta nuclear
        ctx.fillStyle = "#ffe600";
        ctx.fillRect(i * 200 - (bgScroll % 200) + 20, GROUND_MIN - 110, 20, 25);
        ctx.fillRect(i * 200 - (bgScroll % 200) + 70, GROUND_MIN - 110, 20, 25);
        ctx.fillStyle = "#1d1538";
    }

    // --- CAPA 2: PAVIMENTO Y CALLE ARCADE ---
    ctx.fillStyle = "#2c2830";
    ctx.fillRect(0, GROUND_MIN, canvas.width, canvas.height - GROUND_MIN);

    // Líneas de acera con perspectiva móvil
    ctx.strokeStyle = "#403945";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_MIN);
    ctx.lineTo(canvas.width, GROUND_MIN);
    ctx.stroke();

    // --- CAPA 3: Y-SORTING ENTITIES (ORDENAMIENTO DE PROFUNDIDAD) ---
    let renderList = [
        { y: player.y, draw: drawHomer },
        ...enemies.map(en => ({ y: en.y, draw: () => drawAdvancedEnemy(en) }))
    ];

    renderList.sort((a, b) => a.y - b.y);
    renderList.forEach(item => item.draw());

    // --- CAPA 4: EFECTOS VISUALES Y TEXTOS DE COMBATE ---
    effects.forEach(eff => {
        ctx.fillStyle = eff.color;
        ctx.font = "bold 20px 'Courier New'";
        ctx.fillText(eff.text, eff.x - cameraX, eff.y);
    });
}

// Renderizador Avanzado de Homer Simpson (Proporciones y Estética Arcade Fieles)
function drawHomer() {
    const rx = player.x - cameraX;
    const ry = player.y - player.z;

    // Sombra en el suelo
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.beginPath();
    ctx.ellipse(rx + player.width/2, player.y + 12, 22, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Pantalones azules clásicos
    ctx.fillStyle = "#0055cc";
    ctx.fillRect(rx + 16, ry + 52, 32, 35);

    // Camisa blanca
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(rx + 12, ry + 28, 40, 26);

    // Cabeza y Papada Amarilla
    ctx.fillStyle = "#ffcc00";
    ctx.fillRect(rx + 14, ry - 6, 38, 38);

    // Ojos y Pelo icónico lateral
    ctx.fillStyle = "#000";
    ctx.fillRect(rx + (player.facing === 1 ? 38 : 16), ry + 4, 6, 8); // Ojo
    ctx.fillRect(rx + (player.facing === 1 ? 8 : 46), ry + 10, 6, 3); // Pelo oreja

    // Animación de Ataque (Puñetazo con guante blanco)
    if (player.isPunching) {
        ctx.fillStyle = "#ffffff";
        const fistX = player.facing === 1 ? rx + player.width : rx - 28;
        ctx.fillRect(fistX, ry + 26, 32, 20);
    }
}

// Renderizador Avanzado de Enemigos
function drawAdvancedEnemy(enemy) {
    const rx = enemy.x - cameraX;
    const ry = enemy.y;

    // Sombra
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.beginPath();
    ctx.ellipse(rx + enemy.width/2, enemy.y + 12, 20, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Cuerpo (Parpadea en blanco si recibe daño)
    ctx.fillStyle = enemy.isHit ? "#ffffff" : (enemy.type === "SMITHERS" ? "#3366cc" : "#cc3333");
    ctx.fillRect(rx + 10, ry + 24, 36, 55);

    // Cabeza
    ctx.fillStyle = "#ffcc99";
    ctx.fillRect(rx + 14, ry - 2, 28, 28);
}

// Lanzar motor gráfico
requestAnimationFrame(gameLoop);

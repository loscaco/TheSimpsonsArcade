const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let score = 0;
let lives = 3;
let wave = 1;
let gameState = "PLAYING"; // PLAYING, GAMEOVER
let screenShakeTimer = 0;

// Jugador (Homer)
let player = {
    x: 100,
    y: 310,
    width: 45,
    height: 75,
    speed: 5,
    dx: 0,
    dy: 0,
    isAttacking: false,
    facing: 1 // 1 derecha, -1 izquierda
};

// Enemigos (Secuaces de Springfield con IA por estados)
let enemies = [
    { x: 750, y: 315, width: 42, height: 72, speed: 2, active: true, color: "#e74c3c", hp: 2 },
    { x: 950, y: 315, width: 42, height: 72, speed: 1.6, active: true, color: "#9b59b6", hp: 1 }
];

// Sistema de partículas para impactos y golpes
let particles = [];
function spawnParticles(x, y, color) {
    for (let i = 0; i < 8; i++) {
        particles.push({
            x: x,
            y: y,
            dx: (Math.random() - 0.5) * 6,
            dy: (Math.random() - 0.5) * 6,
            radius: Math.random() * 4 + 2,
            color: color,
            life: 25
        });
    }
}

// Control de Teclado
let keys = {};
window.addEventListener("keydown", e => {
    keys[e.key] = true;
    if ((e.key === " " || e.key === "z" || e.key === "Z") && gameState === "PLAYING") {
        triggerAttack();
    }
});
window.addEventListener("keyup", e => keys[e.key] = false);

// Controles Táctiles para Móviles / App de X
function bindTouch(id, actionStart, actionEnd) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("touchstart", (e) => { e.preventDefault(); actionStart(); });
    el.addEventListener("touchend", (e) => { e.preventDefault(); if (actionEnd) actionEnd(); });
}

bindTouch("btn-left", () => { player.dx = -player.speed; player.facing = -1; }, () => { if(player.dx < 0) player.dx = 0; });
bindTouch("btn-right", () => { player.dx = player.speed; player.facing = 1; }, () => { if(player.dx > 0) player.dx = 0; });
bindTouch("btn-attack", () => triggerAttack());

function triggerAttack() {
    if (gameState !== "PLAYING") return;
    player.isAttacking = true;
    setTimeout(() => { player.isAttacking = false; }, 180);
}

function update() {
    if (screenShakeTimer > 0) screenShakeTimer--;

    if (gameState === "PLAYING") {
        // Movimiento del jugador
        player.x += player.dx;
        if (keys["ArrowLeft"] || keys["a"] || keys["A"]) { player.x -= player.speed; player.facing = -1; }
        if (keys["ArrowRight"] || keys["d"] || keys["D"]) { player.x += player.speed; player.facing = 1; }

        // Límites de la pantalla
        if (player.x < 15) player.x = 15;
        if (player.x > canvas.width - player.width - 15) player.x = canvas.width - player.width - 15;

        // Actualizar Enemigos
        enemies.forEach(enemy => {
            if (!enemy.active) return;

            // IA de persecución suave
            if (enemy.x > player.x) {
                enemy.x -= enemy.speed + (wave * 0.2);
            } else {
                enemy.x += enemy.speed + (wave * 0.2);
            }

            // Detección de golpe del jugador
            if (player.isAttacking && Math.abs(player.x - enemy.x) < 55) {
                enemy.hp--;
                spawnParticles(enemy.x + 20, enemy.y + 30, "#ffd700");
                screenShakeTimer = 6; // Efecto de impacto arcade

                if (enemy.hp <= 0) {
                    enemy.active = false;
                    score += 200 * wave;
                    document.getElementById("score").innerText = `SCORE: ${String(score).padStart(6, '0')}`;
                    
                    // Reaparecer con más velocidad (Oleadas)
                    setTimeout(() => {
                        enemy.x = canvas.width + 100;
                        enemy.hp = 1 + Math.floor(wave / 2);
                        enemy.active = true;
                        if (score > wave * 1000) wave++;
                    }, 1500);
                } else {
                    enemy.x += player.facing * 30; // Retroceso al recibir golpe
                }
            }

            // Colisión con el jugador (Daño)
            if (Math.abs(player.x - enemy.x) < 32 && enemy.active) {
                lives--;
                screenShakeTimer = 12;
                document.getElementById("lives").innerText = `HOMER x${lives}`;
                enemy.x += 80;
                spawnParticles(player.x + 20, player.y + 30, "#ff3333");

                if (lives <= 0) {
                    gameState = "GAMEOVER";
                }
            }
        });

        // Actualizar Partículas
        particles.forEach(p => {
            p.x += p.dx;
            p.y += p.dy;
            p.life--;
        });
        particles = particles.filter(p => p.life > 0);
    }
}

function draw() {
    ctx.save();
    // Efecto Screen Shake en impactos fuertes
    if (screenShakeTimer > 0) {
        let shakeX = (Math.random() - 0.5) * 8;
        let shakeY = (Math.random() - 0.5) * 8;
        ctx.translate(shakeX, shakeY);
    }

    // --- FONDO ARCADE DETALLADO ---
    ctx.fillStyle = "#141226";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Siluetas de edificios de Springfield
    ctx.fillStyle = "#1e1b3c";
    ctx.fillRect(40, 90, 130, 260);
    ctx.fillRect(210, 60, 160, 290);
    ctx.fillRect(430, 110, 190, 240);
    ctx.fillRect(660, 70, 130, 280);

    // Suelo clásico de calle con bordes de neón
    ctx.fillStyle = "#222034";
    ctx.fillRect(0, 350, canvas.width, 100);
    ctx.fillStyle = "#f1c40f";
    ctx.fillRect(0, 350, canvas.width, 4);

    if (gameState === "PLAYING") {
        // --- RENDERIZAR JUGADOR (HOMER) ---
        // Cuerpo / Camisa
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(player.x + 8, player.y + 30, 28, 32);
        // Pantalones
        ctx.fillStyle = "#2980b9";
        ctx.fillRect(player.x + 8, player.y + 62, 28, 14);
        // Cabeza
        ctx.fillStyle = "#ffcc00";
        ctx.fillRect(player.x + 6, player.y + 6, 34, 30);
        // Ojos
        ctx.fillStyle = "#000";
        ctx.fillRect(player.x + (player.facing > 0 ? 24 : 14), player.y + 15, 5, 5);

        // Animación de Golpe de Puño
        if (player.isAttacking) {
            ctx.fillStyle = "#e67e22";
            ctx.fillRect(player.x + (player.facing > 0 ? 35 : -20), player.y + 35, 25, 12);
        }

        // --- RENDERIZAR ENEMIGOS ---
        enemies.forEach(enemy => {
            if (!enemy.active) return;
            ctx.fillStyle = enemy.color;
            ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
            // Detalles enemigos
            ctx.fillStyle = "#000";
            ctx.fillRect(enemy.x + 12, enemy.y + 14, 6, 6);
        });

        // --- RENDERIZAR PARTÍCULAS ---
        particles.forEach(p => {
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
        });

        // Indicador de Oleada en pantalla
        ctx.fillStyle = "#00ff66";
        ctx.font = "bold 14px 'Courier New'";
        ctx.fillText(`WAVE ${wave}`, canvas.width / 2 - 30, 35);

    } else {
        // --- PANTALLA DE GAME OVER PROFESIONAL ---
        ctx.fillStyle = "rgba(0, 0, 0, 0.9)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = "#ff3333";
        ctx.font = "bold 36px 'Courier New'";
        ctx.textAlign = "center";
        ctx.fillText("MISSION FAILED", canvas.width / 2, 130);

        ctx.fillStyle = "#ffd700";
        ctx.font = "22px 'Courier New'";
        ctx.fillText(`FINAL SCORE: ${score} | WAVES CLEARED: ${wave}`, canvas.width / 2, 190);

        ctx.fillStyle = "#ffffff";
        ctx.font = "15px 'Courier New'";
        ctx.fillText("Challenge your developer friends on X!", canvas.width / 2, 240);

        // Botón de acción interactivo
        ctx.fillStyle = "#00ff66";
        ctx.fillRect(canvas.width / 2 - 150, 290, 300, 52);
        ctx.fillStyle = "#000000";
        ctx.font = "bold 16px 'Courier New'";
        ctx.fillText("SHARE SCORE ON X 🚀", canvas.width / 2, 323);
        ctx.textAlign = "left";
    }

    ctx.restore();
}

// Disparar Web Intent directo a X al terminar la partida
canvas.addEventListener("click", () => {
    if (gameState === "GAMEOVER") {
        const text = encodeURIComponent(`I survived ${wave} waves and scored ${score} points in Springfield Arcade natively inside X! Can you beat my dev skills? 🕹️🔥 #BuildInPublic #IndieDev`);
        window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
    }
});

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

loop();
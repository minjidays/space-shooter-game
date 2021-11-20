<!---JAVASCRIPT STARTS HERE--->

        <script>
            function openCity(evt, tabName) {
                var i, tabcontent, tablinks;
                tabcontent = document.getElementsByClassName("tabcontent");
                for (i = 0; i < tabcontent.length; i++) {
                    tabcontent[i].style.display = "none";
                }
                tablinks = document.getElementsByClassName("tablinks");
                for (i = 0; i < tablinks.length; i++) {
                    tablinks[i].className = tablinks[i].className.replace(" active", "");
                }
                document.getElementById(tabName).style.display = "block";
                evt.currentTarget.className += " active";
            }
            
            var homePage;

            function clearHome(store) {
                var parent = document.getElementById("Home");
                if (store) {
                    homePage = parent.innerHTML;
                };
                while (parent.firstChild) parent.removeChild(parent.firstChild);
                return parent;
            }

            function goBackHome() {
                document.getElementById("container").removeChild(stage);
                const parent = clearHome(false);
                parent.innerHTML = homePage;
                document.getElementById("play").addEventListener("click", playNow);
            }

            // game code start

            const DEV_MODE = false;

            const stage = document.createElement("canvas");
            var ctx;
            var dialogue;
            var hud;
            var scoreNode;

            let ship,
                lasers = [],
                enemies = [],
                playing = false,
                gameStarted = false,
                speedMultiplier,
                enemySeedFrameInterval,
                score = 0,
                tick = 0,
                laserTick = 0;

            function randomBetween(min, max) {
                return Math.floor(Math.random() * (max - min + 1)) + min;
            }

            function calcScore(x) {
                return Math.floor((1 / x) * 500);
            }

            function Ship(options) {
                this.radius = 15;
                this.x = options.x || stage.width * 0.5 - this.radius - 0.5;
                this.y = options.y || stage.height - this.radius - 30;
                this.width = this.radius * 2;
                this.height = this.width;
                this.color = options.color || "red";
                this.left = false;
                this.right = false;
                this.speed = 10;
                this.active = true;

                document.addEventListener("keydown", this.onKeyDown.bind(this));
                document.addEventListener("keyup", this.onKeyUp.bind(this));
            }

            Ship.prototype.update = function (x) {
                this.x = x;
                this.y = stage.height - this.radius - 30;
            };

            Ship.prototype.draw = function () {
                ctx.save();

                if (DEV_MODE) {
                    ctx.fillStyle = "skyblue";
                    ctx.fillRect(this.x, this.y, this.width, this.width);
                }

                ctx.fillStyle = this.color;
                ctx.fillRect(this.x + this.radius - 5, this.y, 10, this.radius);
                ctx.fillRect(this.x, this.y + this.radius, this.width, 10);
                ctx.fillRect(this.x, this.y + this.radius + 10, 10, 5);
                ctx.fillRect(this.x + this.width - 10, this.y + this.radius + 10, 10, 5);

                ctx.restore();
            };

            Ship.prototype.onKeyDown = function (e) {
                if (ship.active) {
                    if (e.keyCode === 39) this.right = true;
                    else if (e.keyCode === 37) this.left = true;

                    if (e.keyCode == 32 && !this.shooting) {
                        this.shooting = true;
                        laserTick = 0;
                    }
                }
            };

            Ship.prototype.onKeyUp = function (e) {
                if (e.key === "ArrowRight") this.right = false;
                else if (e.key === "ArrowLeft") this.left = false;
                else if (e.keyCode == 32) this.shooting = false;
            };

            function Laser(options) {
                this.x = options.x - 0.5;
                this.y = options.y || stage.height - 50;
                this.width = 6;
                this.height = 20;
                this.speed = 15;
                this.color = options.color || "white";
                this.active = true;
            }

            Laser.prototype.update = function (y) {
                this.y = y;
            };

            Laser.prototype.draw = function () {
                ctx.save();
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.rect(this.x, this.y, this.width, this.height);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            };

            function Enemy(options) {
                this.radius = randomBetween(10, 40);
                this.width = this.radius * 2;
                this.height = this.width;
                this.x = randomBetween(0, stage.width - this.width);
                this.y = -this.radius * 2;
                this.color = options != undefined && options.color ? options.color : "#896ce5";
                this.speed = 2;
                this.active = true;
            }

            Enemy.prototype.update = function (x, y) {
                this.x = x;
                this.y = y;
            };

            Enemy.prototype.draw = function () {
                if (DEV_MODE) {
                    ctx.fillStyle = "skyblue";
                    ctx.fillRect(this.x, this.y, this.width, this.width);
                }

                ctx.save();
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(this.x + this.radius, this.y + this.radius, this.radius, 0, Math.PI * 2);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            };

            function hitTest(item1, item2) {
                let collision = true;
                if (item1.x > item2.x + item2.width || item1.y > item2.y + item2.height || item2.x > item1.x + item1.width || item2.y > item1.y + item1.height) {
                    collision = false;
                }
                return collision;
            }

            function handleLaserCollision() {
                for (let enemy of enemies) {
                    for (let laser of lasers) {
                        let collision = hitTest(laser, enemy);
                        if (collision && laser.active) {
                            console.log("you destroyed an enemy");
                            enemy.active = false;
                            laser.active = false;

                            // increase enemy speed and frequency of enemy spawns
                            speedMultiplier += 0.025;
                            if (enemySeedFrameInterval > 20) {
                                enemySeedFrameInterval -= 2;
                            }

                            // increase score
                            score += calcScore(enemy.radius);
                            scoreNode.textContent = score;
                        }
                    }
                }
            }

            function handleShipCollision() {
                // check for collisions between ship and enemies
                if (enemies.length) {
                    for (let enemy of enemies) {
                        let collision = hitTest(ship, enemy);
                        if (collision) {
                            console.log("your ship was destroyed");
                            ship.active = false;
                            setTimeout(() => {
                                ship.active = true;
                                speedMultiplier = 1;
                                enemySeedFrameInterval = 100;
                                score = 0;
                                scoreNode.textContent = score;
                            }, 2000);
                        }
                    }
                }
            }

            function drawShip(xPosition) {
                if (ship.active) {
                    ship.update(xPosition);
                    ship.draw();
                }
            }

            function drawEnemies() {
                if (enemies.length) {
                    for (let enemy of enemies) {
                        // draw an enemy if it's active
                        if (enemy.active) {
                            enemy.update(enemy.x, (enemy.y += enemy.speed * speedMultiplier));
                            enemy.draw();
                        }
                    }
                }
            }

            function enemyCleanup() {
                if (enemies.length) {
                    enemies = enemies.filter((enemy) => {
                        let visible = enemy.y < stage.height + enemy.width;
                        let active = enemy.active === true;
                        return visible && active;
                    });
                }
            }

            function drawLasers() {
                if (lasers.length) {
                    for (let laser of lasers) {
                        if (laser.active) {
                            laser.update((laser.y -= laser.speed));
                            laser.draw();
                        }
                    }
                }
            }

            function laserCleanup() {
                lasers = lasers.filter((laser) => {
                    let visible = laser.y > -laser.height;
                    let active = laser.active === true;
                    return visible && active;
                });
            }

            function render(delta) {
                if (playing) {
                    let xPos = ship.x;

                    // seed new enemies
                    if (tick % enemySeedFrameInterval === 0 && ship.active) {
                        const enemy = new Enemy();
                        enemies.push(enemy);
                        console.log({ enemySeedFrameInterval, speedMultiplier });
                    }

                    // background
                    ctx.save();
                    ctx.fillStyle = "#272744";
                    ctx.fillRect(0, 0, stage.width, stage.height);
                    ctx.restore();

                    // ship movement
                    if (ship.left) xPos = ship.x -= ship.speed;
                    else if (ship.right) xPos = ship.x += ship.speed;

                    // stage boundaries
                    if (gameStarted) {
                        if (xPos < 0) xPos = 0;
                        else if (xPos > stage.width - ship.width) xPos = stage.width - ship.width;
                    }

                    // create lasers, if shooting
                    if (ship.active && ship.shooting) {
                        if (laserTick === 0 || laserTick % 10 === 0) {
                            let laser = new Laser({
                                color: "skyblue",
                                x: ship.x + ship.radius - 3,
                            });
                            lasers.push(laser);
                        }
                    }

                    drawShip(xPos);

                    handleShipCollision();
                    handleLaserCollision();

                    drawLasers();
                    drawEnemies();

                    enemyCleanup();
                    laserCleanup();

                    if (ship.shooting) laserTick++;
                    tick++;
                }

                requestAnimationFrame(render);
            }

            function quitGame() {
                console.log("stopping game");
                const quit = document.getElementById("quit");
                quit.title = "";
                quit.style.textShadow = "none";
                quit.innerHTML = '<a href="/" title="Return to blog">quit</a>';
                window.removeEventListener("resize", onResize);
                ship.x = -100;
                ship.y = -100;
                gameStarted = false;
                playing = false;
                goBackHome();
            }

            function startGame(e) {
                console.log("starting game");
                // redo quit button
                const quit = document.getElementById("quit");
                quit.addEventListener("click", quitGame);
                quit.innerHTML = "<p>quit</p>";
                quit.title = "Quit game";
                quit.style.textShadow = "0 0 5px #ff006c, 0 0 10px #ff006c, 0 0 15px #ff006c, 0 0 20px #ff417d, 0 0 25px #ff417d";

                dialogue.classList.add("dialogue--hidden");
                hud.classList.remove("hud--hidden");
                e.currentTarget.blur();

                // reset the demo/intro to the actual game settings:
                speedMultiplier = 1;
                enemySeedFrameInterval = 100;
                ship.x = stage.width * 0.5 - ship.radius - 0.5;
                ship.y = stage.height - ship.radius - 30;
                enemies = [];
                gameStarted = true;
            }

            function onResize() {
                stage.width = window.innerWidth;
                stage.height = window.innerHeight;
            }

            // game code end

            function playNow() {
                // clear out home panel
                const parent = clearHome(true);
                // add start menu instructions
                parent.innerHTML =
                    '<div class="dialogue"><div class="dialogue__content"><h1>Space Shooter</h1><ul><li>Use the <span class="key key--arrow">&larr;</span> and <span class="key key--arrow">&rarr;</span> keys to move.</li><li>Use <span class="key">spacebar</span> to fire lasers.</li></ul><button id="start">Start</button><button id="back">Back</button></div></div><ul class="hud hud--hidden"><li class="hud__score">Score: <span>0</span></li></ul>';

                document.getElementById("start").addEventListener("click", startGame);
                document.getElementById("back").addEventListener("click", goBackHome);

                (ctx = stage.getContext("2d")), (dialogue = document.querySelector(".dialogue"));
                (hud = document.querySelector(".hud")), (scoreNode = hud.querySelector(".hud__score span"));

                window.addEventListener("resize", onResize);

                document.getElementById("container").appendChild(stage);
                onResize();

                //start the ship off-screen:
                ship = new Ship({ color: "#FF3188", x: -100, y: -100 });
                // up some ridiculous enemy speeds for the intro:
                (speedMultiplier = 6), (enemySeedFrameInterval = 20);
                playing = true;
                render();
            }

            document.getElementById("defaultOpen").click();
            document.getElementById("play").addEventListener("click", playNow);
        </script>
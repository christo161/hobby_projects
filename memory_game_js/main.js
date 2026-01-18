import { generate_random_number } from "./helpers.js";
import { fisher_yates_shuffle } from "./helpers.js";

document.addEventListener("DOMContentLoaded", () => {

    //GAME LOGIC

    //GLOBAL VAR DEFS
    let actual_appstate;

    //game board cell properties, methods
    class cell {
        constructor (p_coord_i, p_coord_j, p_img_id = null) {
            this.coord_i = p_coord_i;
            this.coord_j = p_coord_j;
            this.img_id = p_img_id;

            this.first_revealed = false;
            this.second_revealed = false;
            this.matched = false;
        }

        toggle_first_revealed() {
            this.first_revealed = !this.first_revealed;
        }

        toggle_second_revealed() {
            this.second_revealed = !this.second_revealed;
        }

        match() {
            this.matched = true;
        }
    }

    //game status, game board
    class appstate {
        static game_status = {
            PLAYING: 1,
            WIN: 2
            // DEGUG: 3
        }

        constructor (p_numof_rows, p_numof_cols) {
            this.numof_rows = p_numof_rows;
            this.numof_cols = p_numof_cols;

            this.actual_status = appstate.game_status.PLAYING;

            this.game_board = this.generate_board();
            
            //actually revealed cell
            this.actually_revealed = [];

            //during the matching of 2 cells nothing should be clickable
            this.locked = false;
        }

        generate_board() {

            //we need random numbers for every cells associated to images behind the cells
            //but every numbers should occur twice
            const numof_random_numbers = parseInt((this.numof_rows * this.numof_cols) / 2);
            let random_numbers_img_ids = [];
            //put every number twice into the array
            for (let i = 0; i < numof_random_numbers; ++i) {
                let actual_random = generate_random_number(0, 59);
                while (random_numbers_img_ids.includes(actual_random)) {
                    actual_random = generate_random_number(0, 59);
                }
                random_numbers_img_ids.push(actual_random);
                random_numbers_img_ids.push(actual_random);
            }

            //shuffle img ids
            fisher_yates_shuffle(random_numbers_img_ids);

            let actual_board = [];

            for (let i = 0; i < this.numof_rows; ++i) {
                let actual_row = [];
                for (let j = 0; j < this.numof_cols; ++j) {
                    actual_row.push(new cell(i, j, random_numbers_img_ids.pop()));
                }
                actual_board.push(actual_row);
            }
            //if this.numof_rows * this.numof_cols % 2 == 1 then the last cell won't contain any img number

            return actual_board;
        }

        //matching logic is included here
        reveal(p_coord_i, p_coord_j) {

            let actual_cell = this.game_board[p_coord_i][p_coord_j];

            //guard clauses
            if (this.actual_status !== appstate.game_status.PLAYING || //no reveal in the case of game over
                this.locked || //no reveal during the matching

                actual_cell.first_revealed || //no reveal for revealed/matched cells 
                actual_cell.second_revealed ||
                actual_cell.matched) { 
                return;
            }

            //if there are no cells revealed yet
            if (this.actually_revealed.length === 0) {
                //add this cell to revealed 
                this.actually_revealed.push(actual_cell);

                //set appstate to revealed
                actual_cell.toggle_first_revealed();

                //update dom according to it
                update_cell_dom(actual_cell);

            //if there is one cell revealed
            } else if (this.actually_revealed.length === 1) {
                const first_revealed = this.actually_revealed[0];
                const second_revealed = actual_cell;

                //if match true
                if (first_revealed.img_id === second_revealed.img_id ) {
                    first_revealed.match();
                    update_cell_dom(first_revealed);

                    second_revealed.match();
                    update_cell_dom(second_revealed);

                    this.actually_revealed.pop();

                    this.game_over_check();

                //if match false
                } else {
                    //safe copies needed for async logic
                    const first_revealed_safe_copy = first_revealed;
                    const second_revealed_safe_copy = second_revealed;

                    this.locked = true;

                    //sleep 2 seconds between the statements
                    (async () => {
                        //set second revealed to true
                        second_revealed_safe_copy.toggle_second_revealed();
                        update_cell_dom(second_revealed_safe_copy);

                        //wait
                        await new Promise(sleep => setTimeout(sleep, 700));

                        //set second revealed to false
                        second_revealed_safe_copy.toggle_second_revealed();
                        update_cell_dom(second_revealed_safe_copy);

                        //set first revealed to false
                        first_revealed_safe_copy.toggle_first_revealed();
                        update_cell_dom(first_revealed_safe_copy);

                        this.locked = false;

                        this.actually_revealed.pop();
                    })();

                }
            }
        } //endof reveal

        game_over_check() {
            const is_win = this.game_board.flat().every(actual_cell => actual_cell.matched 
                || actual_cell.img_id === null);

            if (is_win) {
                this.actual_status = appstate.game_status.WIN;
            }
            
            return is_win;
        }
    }

    const img_sources = [
        "alien.png", "anchor.png", "apple.png", "atom.png", "barrel.png", "bird.png", "bonfire.png", "book.png",
        "brush.png", "butterfly.png", "cactus.png", "can.png", "candle.png", "clover.png", "cloud.png", "crystal.png",
        "dice.png", "dinosaur.png", "dollar.png", "endof_mainroad.png", "envelope.png", "eu_symbol.png", "flag.png",
        "floppy.png", "flower.png", "gear.png", "ghost.png", "hammer.png", "heart.png", "horse.png", "key.png",
        "ladybug.png", "lizard.png", "museum.png", "mushroom.png", "nuclear.png", "oil_barrel.png", "paperboat.png",
        "paw.png", "peace_symbol.png", "penguin.png", "pharmacy.png", "pig_bank.png", "pinetree.png", "pizza.png",
        "plane.png", "post_horn.png", "recycle.png", "rocket.png", "ruby.png", "school_board.png", "shopping_cart.png",
        "snowflake.png", "sqrt_minusone.png", "star.png", "stop_sign.png", "sun.png", "sunflower.png", "telephone.png",
        "theatre.png", "tulip.png", "www_symbol.png", "yin_and_yang_symbol.png"
    ];

    //VIEW, GAME GRAPHICS (DOM)
    function render_board () {
        const numof_rows = actual_appstate.numof_rows;
        const numof_cols = actual_appstate.numof_cols;

        const game_board_dom = document.querySelector("#game_board");

        game_board_dom.innerHTML = "";

        const document_fragment_dom = document.createDocumentFragment();

        for (let i = 0; i < numof_rows; ++i) {
            const game_board_row_dom = document.createElement("div");
            game_board_row_dom.classList.add("game_board_row");

            for (let j = 0; j < numof_cols; ++j) {
                const game_board_cell_dom = document.createElement("div");

                game_board_cell_dom.dataset.coord_i = i;
                game_board_cell_dom.dataset.coord_j = j;

                const actual_img_id = actual_appstate.game_board[i][j].img_id;

                if (actual_img_id !== null) {
                    game_board_cell_dom.dataset.img_id = actual_img_id;

                    const actual_img = document.createElement("img");
                    actual_img.src = "images/" + img_sources[actual_img_id];
                    game_board_cell_dom.appendChild(actual_img);
                } else {
                    game_board_cell_dom.classList.add("invalid");
                }

                //game_board_cell_dom.innerText = actual_img_id; //TODO DELETE
                
                game_board_cell_dom.classList.add("game_board_cell", "unrevealed");

                game_board_row_dom.appendChild(game_board_cell_dom);
            } //endof for

            document_fragment_dom.appendChild(game_board_row_dom);

        } //endof for

        game_board_dom.appendChild(document_fragment_dom);
    }

    let win_message_settimeout = null;

    function new_game () {
        const board_size_dom = document.querySelector("#board_size");
        if (board_size_dom.value === "") { return; }

        const board_size = parseInt(board_size_dom.value);

        actual_appstate = new appstate(board_size, board_size);

        if (document.querySelector("#game_board").classList.contains("test_mode")) {
            document.querySelector("#game_board").classList.remove("test_mode");
        }

        render_board();

        //if there was a message about winning a game from the previous game, it should be removed
        document.querySelector("#win_message")?.remove();

        //or it has been scheduled, it should be stopped
        if (win_message_settimeout !== null) {
            clearTimeout(win_message_settimeout);
            win_message_settimeout = null;
        }
    }

    (function broswer_load_init_dom () {
        //* EVENTLISTENERS
        //* BUTTONS
        //e new game BUTTON
        document.querySelector("#btn_new_game").addEventListener("click", () =>{
            new_game();
        });
        document.querySelector("#btn_test_mode").addEventListener("click", () =>{
            document.querySelector("#game_board").classList.toggle("test_mode");
        });
        //TODO test mode button
        const board_size_dom = document.querySelector("#board_size");
        board_size_dom.addEventListener("input", () =>{
            //disallow non-number characters
            board_size_dom.value = board_size_dom.value.replace("/[^0-9]/g", "");
        });
        board_size_dom.addEventListener("change", () =>{
            //board size min/max input validation
            const actual_value = parseInt(board_size_dom.value);
            const min = parseInt(board_size_dom.min);
            const max = parseInt(board_size_dom.max);

            if (board_size_dom.value === "") {
                board_size_dom.value = min;
            }

            if (board_size_dom.value !== "" && actual_value < min || actual_value > max) {
                board_size_dom.value = Math.min(Math.max(actual_value, min), max );
            }
        });

        document.querySelector("#game_board").addEventListener("click", (event) => {
            const actual_cell = event.target.closest(".game_board_cell")
            if(actual_cell && !actual_cell.classList.contains("invalid")) {

                const actual_coord_i = parseInt(actual_cell.dataset.coord_i);
                const actual_coord_j = parseInt(actual_cell.dataset.coord_j);

                actual_appstate.reveal(actual_coord_i, actual_coord_j);
            }
        });
        
        //* FIRST GAME
        new_game();
    })(); //this function executes when the browser is started for the first time

    function update_cell_dom(p_actual_cell_appstate) {
        const actual_cell = document.querySelector(
            `#game_board .game_board_cell[data-coord_i="${p_actual_cell_appstate.coord_i}"][data-coord_j="${p_actual_cell_appstate.coord_j}"]`
        );

        actual_cell.classList.toggle("first_revealed", p_actual_cell_appstate.first_revealed);
        actual_cell.classList.toggle("second_revealed", p_actual_cell_appstate.second_revealed);
        actual_cell.classList.toggle("matched", p_actual_cell_appstate.matched);

        //win message
        if (actual_appstate.game_over_check() ) {
            const win_message = document.createElement("div");

            win_message.innerHTML = "Congratulations,<br> you are winner!";
            win_message.id = "win_message";
            Object.assign(win_message.style, {
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                zIndex: "999",

                color: "#ffcc00",
                backgroundColor: "#00cc99",
                fontSize: "clamp(2rem, 6vw, 7rem)",

                padding: "clamp(1rem, 4vw, 3rem)",

                borderWidth: "clamp(0.5rem, 2vw, 2rem)",
                borderColor: "#ffcc00",
                borderStyle: "dotted"

            });

            win_message.addEventListener("click", (event) => {
                event.target.remove();
            });

            win_message_settimeout = setTimeout(() => {
                document.querySelector("#game_board").appendChild(win_message);
            }, 2000);
            
        }
    }

});
document.addEventListener("DOMContentLoaded", () => {

    //global var definitions
    //appstate: actual state of game logic
    let actual_appstate;

    //GAME LOGIC
    //properties of a cell/field 
    class cell {
        //in JavaScript, if a data filed is created in the constructor, there is no need to define it outside
        constructor(p_coord_i, p_coord_j) {
            this.revealed = false;
            this.revealed_win = false;
            this.mine = false;
            this.exploded = false;
            this.flagged = false;
            this.neighbour_mine_count = 0;

            this.coord_i = p_coord_i;
            this.coord_j = p_coord_j;
        }

        flag() {
            if (this.revealed) { return; }
            this.flagged = !this.flagged;
        }

        reveal() {
            if (this.flagged || this.revealed) { return; }
            this.revealed = true;
        }
    }

    class appstate {
        first_click_happened = false;

        //in JavaScript there are no enums
        //this is something like enum :)
        static game_status = {
            PLAYING: 1,
            WIN: 2,
            LOSE: 3,
            TEST_MODE: 4
        }

        constructor(p_numof_rows, p_numof_cols, p_numof_mines) {
            this.numof_rows = p_numof_rows;
            this.numof_cols = p_numof_cols;

            this.numof_mines = p_numof_mines;

            this.actual_status = appstate.game_status.PLAYING;
            
            this.game_board = this.generate_board();
        }

        generate_board() {
            let actual_board = [];
            
            for (let i = 0; i < this.numof_rows; ++i) {
                let actual_row = [];
                for (let j = 0; j < this.numof_cols; ++j) {
                    actual_row.push(new cell(i, j));
                }
                actual_board.push(actual_row);
            }

            return actual_board;
        }

        place_mines(p_coord_i, p_coord_j) {
            function random_number (min, max) {
                return Math.floor(Math.random() * (max - min + 1)) + min;
            }

            /*const forbidden_zone = [];
            for (let i = 0; i < this.numof_rows; i++) {
                for (let j = 0; j < this.numof_cols; j++) {
                    //3x3 zone around the first click
                    if (Math.abs(i - p_coord_i) <= 1 && Math.abs(j - p_coord_j) <= 1) {
                        forbidden_zone.push(this.game_board[i][j]);
                    }
                }
            }*/

            const forbidden_zone = get_neighbours(this.game_board, p_coord_i, p_coord_j);
            forbidden_zone.push(this.game_board[p_coord_i][p_coord_j]);

            //debug
            /*console.log("Forbidden zone:");
                for (const c of forbidden_zone) {
                console.log(`(${c.coord_i},${c.coord_j})`);
            }*/

            for (let placed = 0; placed < this.numof_mines;) {
                let coord_i = random_number(0, this.numof_rows - 1);
                let coord_j = random_number(0, this.numof_cols - 1);
 
                if (/*(p_coord_i !== coord_i || p_coord_j !== coord_j) &&*/
                    !forbidden_zone.includes(this.game_board[coord_i][coord_j]) &&
                    !this.game_board[coord_i][coord_j].mine) {
                    this.game_board[coord_i][coord_j].mine = true;
                    ++placed;

                    const neighbours = get_neighbours(this.game_board, coord_i, coord_j);
                    for (const element of neighbours) {
                        ++element.neighbour_mine_count;
                    }
                }
            }
            this.first_click_happened = true;

            //debug
            //console.log("First click at", p_coord_i, p_coord_j, "mine?", this.game_board[p_coord_i][p_coord_j].mine);

            //debug
            /*console.log("First click:", p_coord_i, p_coord_j);
                for (let i = 0; i < this.numof_rows; i++) {
                let row = "";
                for (let j = 0; j < this.numof_cols; j++) {
                    row += this.game_board[i][j].mine ? "💣" : ".";
                }
                console.log(row);
            }*/
            
        }

        update_neighbour_counts() {
            for (let i = 0; i < this.numof_rows; i++) {
                for (let j = 0; j < this.numof_cols; j++) {
                    const actual_cell = this.game_board[i][j];
                    const neighbours = get_neighbours(this.game_board, i, j);
                    actual_cell.neighbour_mine_count = neighbours.filter(neighbour => neighbour.mine).length;
                }
            }
        }

        toggle_flag(p_coord_i, p_coord_j) {
            const actual_cell = this.game_board[p_coord_i][p_coord_j];

            actual_cell.flag();
        }

        reveal(p_coord_i, p_coord_j) {
            //GUARD CLAUSES

            //quit if the actual game status is game over
            if(!(this.actual_status === appstate.game_status.PLAYING ||
                this.actual_status === appstate.game_status.TEST_MODE)) {
                return;
            }

            //if this cell is flagged, it would not be revealed
            if(this.game_board[p_coord_i][p_coord_j].flagged) {
                return;
            }

            //in test mode mines shouldn't be revealable
            //why? to be able to go back playing status from test mode in a valid state
            if (this.actual_status === appstate.game_status.TEST_MODE && this.game_board[p_coord_i][p_coord_j].mine) {
                return;
            }
            //endof GUARD CLAUSES
            
            //reveal this cell
            this.game_board[p_coord_i][p_coord_j].reveal();
            //if this cell is mine, gameover and return (no need for flood fill)
            if (this.game_board[p_coord_i][p_coord_j].mine && this.actual_status !== appstate.game_status.TEST_MODE) {
                this.game_board[p_coord_i][p_coord_j].exploded = true;
                this.gameover_check();
                return;
            }

            //flood fill algorithm
            //if this cell does not have neighbour cells which are mines, then its neighbour cells will be revealed
            //recursively (if this cell has neighbour cells which do not have neighbour cells which are mines, then its neighbour cells will be revealed)
            if (this.game_board[p_coord_i][p_coord_j].neighbour_mine_count === 0) {
                const neighbours = get_neighbours(this.game_board, p_coord_i, p_coord_j);
                for (const element of neighbours) {
                    if (!element.revealed && !element.mine) {
                        this.reveal(element.coord_i, element.coord_j);
                    }
                }
            } //endof flood fill

            //no gameover check in test mode
            if(this.actual_status === appstate.game_status.TEST_MODE) {
                return;
            }

            //gameover check in playing mode
            this.gameover_check();
        } //endof reveal

        gameover_check = () => {
            //lose: a mine cell is revealed
            const is_lose = this.game_board.some(actual_row => actual_row.some(
                actual_cell => (actual_cell.revealed && actual_cell.mine)
            ));
            //win: every cell is revealed which is not mine, every cell is not revealed which is mine 
            const is_win = this.game_board.every(actual_row => actual_row.every(
                actual_cell => ((actual_cell.revealed && !actual_cell.mine) || (!actual_cell.revealed && actual_cell.mine))
            ));
            
            if( is_lose || is_win ) {
                
                if (is_win) {
                    this.actual_status = appstate.game_status.WIN;
                    
                    this.game_board.forEach(actual_row => actual_row.forEach(
                        actual_cell => {
                            if (!actual_cell.mine) {
                                actual_cell.revealed = true;
                            } else {
                                actual_cell.revealed_win = true;
                            }
                        }
                    ));
                } else if (is_lose) {
                    this.actual_status = appstate.game_status.LOSE;

                    //reveal all cells
                    this.game_board.forEach(actual_row => actual_row.forEach(
                        actual_cell => actual_cell.revealed = true
                    ));
                }
            }
        }//endof gameover check

    } //endof appstate

    //APPSTATE HELPER FUNCTIONS

    const get_neighbours = (p_board, p_coord_i, p_coord_j) => {
        const neighbours = [];

        //-1: left/top neighbour
        //0: itself
        //1: right/bottom neighbour
        for (let di = -1; di <= 1; ++di) {
            for (let dj = -1; dj <= 1; ++dj) {
                //boundary check (check if the indices are inside the board)
                //vertical: board[p_coord_j + j] !== undefined
                //horizontal: board[p_coord_i + i] !== undefined
                if (p_board[p_coord_i + di] !== undefined && p_board[p_coord_i + di][p_coord_j + dj] !== undefined &&
                    //exclude itself (we just want to return neighbours)
                    (di !== 0 || dj !== 0)) {
                        neighbours.push(p_board[p_coord_i + di][p_coord_j + dj]);
                }
            }
        }

        return neighbours;
    }
    //endof HELPER FUNCTIONS

    //* DOM

    //* APPSTATE UPDATE
    //update the actual value and the max value of numberofmines input field
    //according to game board size input field
    const mines_input_update = () => {
        const board_size_dom = document.querySelector("#board_size");
        if (board_size_dom.value === "") { return; }
        const numberof_mines_dom = document.querySelector("#numberof_mines");

        //density of mines update
        const mines_density = 0.17; //medium difficulty
        const total_cells = Math.pow(board_size_dom.value, 2);
        let numberof_default_mines = Math.floor( total_cells * mines_density);
        //
        const numberof_maxmines = total_cells - 10;
        if (numberof_default_mines > numberof_maxmines) {
            numberof_default_mines = numberof_maxmines;
        }

        numberof_mines_dom.value = numberof_default_mines;
        numberof_mines_dom.max = numberof_maxmines;
    }

    //* RENDER
    //render game board cells
    const render_board = () => {
        const game_board_dom = document.querySelector("div#game_board");
        game_board_dom.innerHTML = "";

        const numof_rows = actual_appstate.numof_rows;
        const numof_cols = actual_appstate.numof_cols;

        const document_fragment_dom = document.createDocumentFragment();

        for (let i = 0; i < numof_rows; ++i) {
            const game_board_row_dom = document.createElement("div");

            game_board_row_dom.classList.add("game_board_row");

            for (let j = 0; j < numof_cols; ++j) {
                const game_board_cell_dom = document.createElement("div");

                game_board_cell_dom.classList.add("game_board_cell");

                const actual_cell = actual_appstate.game_board[i][j];
                if (actual_cell.mine) {
                    game_board_cell_dom.classList.add("mine");
                }
                if (actual_cell.flagged || actual_cell.revealed_win) {
                    game_board_cell_dom.classList.add("flagged");
                }
                if (actual_cell.revealed) {
                    game_board_cell_dom.classList.add("revealed");
                }
                if (actual_cell.exploded) {
                    game_board_cell_dom.classList.add("exploded");
                }
                if (actual_appstate.actual_status === appstate.game_status.TEST_MODE) {
                    game_board_cell_dom.classList.add("test_mode");
                }

                game_board_cell_dom.dataset.neighbour_mine_count = actual_cell.neighbour_mine_count;
                game_board_cell_dom.innerText = actual_cell.neighbour_mine_count;

                game_board_cell_dom.dataset.coord_i = i;
                game_board_cell_dom.dataset.coord_j = j;
                
                game_board_row_dom.appendChild(game_board_cell_dom);
            } //endof for
            document_fragment_dom.appendChild(game_board_row_dom);
        } //endof for
        game_board_dom.appendChild(document_fragment_dom);
    };

    //d win, lose, playing
    const render_game_status = () => {
        const game_status_icon = document.querySelector("#status_panel #status_icon");

        game_status_icon.classList.forEach(actual_class => game_status_icon.classList.remove(actual_class));

        switch (actual_appstate.actual_status) {
            case appstate.game_status.PLAYING: game_status_icon.classList.add("playing"); break;
            case appstate.game_status.WIN: game_status_icon.classList.add("win"); break;
            case appstate.game_status.LOSE: game_status_icon.classList.add("lose"); break;
            case appstate.game_status.TEST_MODE: game_status_icon.classList.add("test_mode"); break;
        }
    }

    //HELPER FUNCTIONS

    const get_coords = (p_cell_div) => {
        const coord_i = parseInt(p_cell_div.dataset.coord_i);
        const coord_j = parseInt(p_cell_div.dataset.coord_j);
        return { coord_i, coord_j };
    }

    const new_game = () => {
        const board_size_dom = document.querySelector("#board_size");
        const numberof_mines_dom = document.querySelector("#numberof_mines");
        if (board_size_dom.value === "" || numberof_mines_dom.value === "") { return; }

        const board_size = parseInt(board_size_dom.value);
        const numberof_mines = parseInt(numberof_mines_dom.value);
        
        actual_appstate = new appstate(board_size, board_size, numberof_mines);

        render_board();
        render_game_status();
    }

    //this executes when the browser is started for the first time
    /*const browser_load_init = () => {

    }*/
    const broswer_load_init_dom = () => {
        //* EVENTLISTENERS
        //* BUTTONS
        //e new game BUTTON
        document.querySelector("#btn_new_game").addEventListener("click", () =>{
            new_game();
        });
        //e test mode BUTTON
        document.querySelector("#btn_test_mode").addEventListener("click", () =>{
            //toggle play/test mode
            if (actual_appstate.actual_status === appstate.game_status.PLAYING) {
                actual_appstate.actual_status = appstate.game_status.TEST_MODE;
            } else if (actual_appstate.actual_status === appstate.game_status.TEST_MODE) {
                 actual_appstate.actual_status = appstate.game_status.PLAYING;
                 //in test mode there is no gameover check, so after returning back there should be a gameover test
                 actual_appstate.gameover_check();
            } else {
                return;
            }
            
            render_board();
            render_game_status();
        });
        //* INPUT FIELDS
        //e board size INPUT
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

            //update mines input field (actual value and max value) when changing the game board size input value
            mines_input_update();
        });
        //e number of mines INPUT
        const numberof_mines_dom = document.querySelector("#numberof_mines");
        numberof_mines_dom.addEventListener("input", () => {
            //number of mines min/max input validation
            const actual_value = parseInt(numberof_mines_dom.value);
            const min = parseInt(numberof_mines_dom.min);
            const max = parseInt(numberof_mines_dom.max);

            if (numberof_mines_dom.value !== "" && actual_value < min || actual_value > max) {
                numberof_mines_dom.value = Math.min(Math.max(actual_value, min), max);
            }

            //disallow non-number characters
            numberof_mines_dom.value = numberof_mines_dom.value.replace("/[^0-9]/g", "");
        });

        const game_board_dom = document.querySelector("div#game_board");
        //event delegation for game board cells
        //LEFT CLICK
        game_board_dom.addEventListener("click", (event) => {
            if (event.target.classList.contains("game_board_cell")) {

                if (!(actual_appstate.actual_status === appstate.game_status.PLAYING
                    || actual_appstate.actual_status === appstate.game_status.TEST_MODE)) {
                    return;
                }

                //get the coordinates of this cell
                let {coord_i, coord_j} = get_coords(event.target);

                //place mines after first click
                if (!actual_appstate.first_click_happened) {
                    actual_appstate.place_mines(coord_i, coord_j);
                }

                //reveal this cell or/and flood fill (reveal cells recursively) 
                actual_appstate.reveal(coord_i, coord_j);

                //re draw the new app state
                render_board();
                render_game_status();
            }
        });
        //RIGHT CLICK
        game_board_dom.addEventListener("contextmenu", (event) => {
            if (event.target.classList.contains("game_board_cell")) {
                event.preventDefault();
                if (!actual_appstate.first_click_happened) {
                    return;
                }
                if (actual_appstate.actual_status !== appstate.game_status.PLAYING) {
                    return;
                }

                let {coord_i, coord_j} = get_coords(event.target);

                actual_appstate.toggle_flag(coord_i, coord_j);

                render_board();
            }
        });

        //* FIRST GAME
        mines_input_update();
        new_game();
    }

    //this executes when the browser is started for the first time
    //browser_load_init();
    broswer_load_init_dom();
    
    
});
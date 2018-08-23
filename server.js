const Board = require('./board')
const BoardWatcher = require('./boardwatcher')
const Database = require('./database')
const config = require('./config')

let db = new Database(config.database.username, 
    config.database.password, 
    config.database.host, 
    config.database.name, 
    config.database.port)

let boards = []
config.boards.forEach((boardName) => {
    let board = new Board(boardName, db)
    boards.push(board)
})

let boardWatcher = new BoardWatcher(boards)
boardWatcher.start()

process.on('unhandledRejection', err => {
    console.log(err);
});
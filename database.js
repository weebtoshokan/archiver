const mysql = require('mysql2')
const util = require('util')
const HashMap = require('hashmap')


class Database {
    constructor(user, password, host, database, port=3306) {
        this.user = user
        this.password = password
        this.host = host
        this.port = port
        this.database = database
        this.boardQueries = new HashMap();
        this.initDatabase()
    }

    initDatabase() {
        this.pool = mysql.createPool({
            host: this.host,
            user: this.user,
            port: this.port,
            database: this.database,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        })
    }

    setupBoard(board) {
        if(!this.boardQueries.has(board)) {
            let queryObject = {}

            queryObject.insert = util.format(
                "INSERT INTO \"%s\"" +
                "  (poster_ip, num, subnum, thread_num, op, timestamp, preview_orig, preview_w, preview_h, " +
                "  media_filename, media_w, media_h, media_size, media_hash, media_orig, spoiler, deleted, " +
                "  capcode, email, name, trip, title, comment, delpass, sticky, locked, poster_hash, poster_country, exif) " +
                "    SELECT ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,? FROM DUAL " +
                "    WHERE NOT EXISTS (SELECT 1 FROM \"%s\" WHERE num = ? AND subnum = ?)" +
                "      AND NOT EXISTS (SELECT 1 FROM \"%s_deleted\" WHERE num = ? AND subnum = ?)", board)

            this.boardQueries.set(board, queryObject)
        } else {
            throw new Error("Duplicate board initialized. Check your configs!")
        }
    }

    getBoard(board) {
        if(!this.boardQueries.has(board))
            throw new Error('Board queries were not initialized!')

        return this.board.get(board)
    }

    insertThread(board, thread) {
        
    }
}

module.exports = Database;
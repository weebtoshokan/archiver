const mysql = require('mysql2')
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

            queryObject.insert = mysql.format(
                'INSERT INTO ?? (poster_ip, num, subnum, thread_num, op, timestamp, preview_orig, preview_w, preview_h, media_filename, ' +
                'media_w, media_h, media_size, media_hash, media_orig, spoiler, deleted, capcode, email, name, trip, title, comment, delpass, ' +
                'sticky, locked, poster_hash, poster_country, exif) SELECT ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,? FROM DUAL ' +
                'WHERE NOT EXISTS (SELECT 1 FROM ?? WHERE num = ? AND subnum = ?) AND NOT EXISTS (SELECT 1 FROM ?? WHERE num = ? AND subnum = ?)',
            [board, board, board + "_deleted"])

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

    formatPostQuery() {
        return []
    }

    insertThread(board, thread) {
        let queryObject = this.getBoard(board)

        this.pool.getConnection().then((conn) => {
            conn.prepare(queryObject.insert).then((err, stmt) => {
                if(err)
                    throw new Error('Statement preparation failure.')

                conn.beginTransaction()
                .then((err) => {
                    if(err)
                        throw new Error('Transaction initialization failure.')
                    
                    let queries = []
                    thread.posts.forEach((post) => {
                        let q = stmt.execute(this.formatPostQuery(post))
                        queries.push(q)
                    })

                    return Promise.all(queries)
                })
                .then(() => {
                    return conn.commit()
                })
                .then(() => {
                    return stmt.close()
                })
                .catch((err) => {
                    console.log(err)
                    return conn.rollback()
                })
            })
        })
    }
}

module.exports = Database;
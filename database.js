const mysql = require('mysql2/promise')
const HashMap = require('hashmap')
const util = require('util')
const Entities = require('html-entities').AllHtmlEntities;
const local = require('./local')



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
            password: this.password,
            port: this.port,
            database: this.database,
            waitForConnections: true,
            connectionLimit: 1,
            queueLimit: 0,
            multipleStatements: true
        })
    }

    checkTables(queryObject) {
        this.pool.getConnection().then((conn) => {
            conn.execute(queryObject.checkTable)
            .then(([rows]) => {
                if(rows.length < 999) {
                    return local.readFile('sql/boards.sql')
                    .then((data) => conn.query(
                        data.toString().replace(/%%BOARD%%/g, queryObject.board.getName())
                        .replace(/%%CHARSET%%/g, 'utf8mb4')
                    ))
                    .then(() => local.readFile('sql/common.sql'))
                    .then((data) => conn.query(data.toString()))
                    .then(() => local.readFile('sql/triggers.sql'))
                    .then((data) => conn.query(
                        data.toString('utf8').replace(/%%BOARD%%/g, queryObject.board.getName())
                    ))
                }
            })
            .then(() => {
                return conn.release()
            })
            .catch((err) => {
                console.log(err)
                conn.release()
            })
        }).catch((err) => {
            console.log(err)
        })
    }

    setupBoard(board) {
        if(!this.boardQueries.has(board.getName())) {
            let queryObject = {}

            queryObject.board = board

            queryObject.insert = util.format(
                'INSERT INTO `%s` (poster_ip, num, subnum, thread_num, op, timestamp, preview_orig, preview_w, preview_h, media_filename, ' +
                'media_w, media_h, media_size, media_hash, media_orig, spoiler, deleted, capcode, email, name, trip, title, comment, delpass, ' +
                'sticky, locked, poster_hash, poster_country, exif) SELECT ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,? FROM DUAL ' +
                'WHERE NOT EXISTS (SELECT 1 FROM `%s` WHERE num = ? AND subnum = ?) AND NOT EXISTS (SELECT 1 FROM `%s` WHERE num = ? AND subnum = ?)',
                board.getName(), board.getName(), board.getName() + '_deleted')

            queryObject.markDeleted = util.format(
                'UPDATE `%s` SET deleted = ?, timestamp_expired = ? WHERE num = ? AND subnum = ?',
                board.getName())

            queryObject.selectMedia = util.format(
                'SELECT * FROM `%s_images` WHERE media_hash = ?',
                board.getName())

            queryObject.updateMedia = util.format(
                'UPDATE `%s_images` SET media = ? WHERE media_hash = ?', 
                board.getName());

            queryObject.updatePreviewOp = util.format(
                'UPDATE `%s_images` SET preview_op = ? WHERE media_hash = ?', 
                board.getName());

            queryObject.updatePreview = util.format(
                'UPDATE `%s_images` SET preview_reply = ? WHERE media_hash = ?', 
                board.getName());

            queryObject.checkTable = util.format('SHOW TABLES LIKE \'%s\'',
                board.getName());

            this.boardQueries.set(board.getName(), queryObject)

            this.checkTables(queryObject)
        } else {
            throw new Error("Duplicate board initialized. Check your configs!")
        }
    }

    getBoard(board) {
        if(!this.boardQueries.has(board))
            throw new Error('Board queries were not initialized!')

        return this.boardQueries.get(board)
    }

    cleanInput(str) {
        if(!str)
            return null

        const entities = new Entities()

        return entities.decode(str).trim()
    }

    formatPostQuery(post) {
        let p = []
        
        p.push(0)
        p.push(post.getNum())
        p.push(0)
        p.push(post.getReply() == 0 ? post.getNum() : post.getReply())
        p.push(post.getReply() == 0)
        p.push(post.getTime() - (4 * 60 * 60))
        p.push(post.getPreviewOrig())
        p.push(post.getPreviewW())
        p.push(post.getPreviewH())
        p.push(post.getMediaFileName())
        p.push(post.getMediaW())
        p.push(post.getMediaH())
        p.push(post.getSize())
        p.push(post.getHash())
        p.push(post.getMediaOrig())
        p.push(post.getSpoiler())
        p.push(false)
        p.push(post.getCapcode())
        p.push(null)
        p.push(this.cleanInput(post.getName()))
        p.push(post.getTrip())
        p.push(this.cleanInput(post.getSubject()))
        p.push(this.cleanComment(post.getComment()))
        p.push(null)
        p.push(post.getSticky())
        p.push(post.getClosed())
        p.push(post.getId())
        p.push(post.getCountry())
        p.push(null)
        p.push(post.getNum())
        p.push(0)
        p.push(post.getNum())
        p.push(0)

        return p
    }

    formatSelectMedia(post) {
        let q = []

        q.push(post.getHash())
        return q
    }

    cleanComment(str) {
        if(!str)
            return null

        str = str.replace(/<br>/g, "\n")
        str = str.replace(/<a[^>]*>(.*?)<\/a>/g, "$1")
        str = str.replace(/<span class=\"quote\">(.*?)<\/span>/g, "$1")
        str = str.replace(/<a[^>]*>(.*?)<\/a>/g, "$1")
        str = str.replace(/<s>/g, "[spoiler]")
        str = str.replace(/<\/s>/g, "[/spoiler]")
        str = str.replace(/<span class=\"(?:[^\"]*)?deadlink\">(.*?)<\/span>/g, "$1")

        str = str.replace(/<wbr>/g, "")
        str = str.replace(/<(?:b|strong)>([\s\S]*?)<\/(?:b|strong)>/g, "[b]$1[/b]")
        str = str.replace(/<br\s*\/?>/g, "\n")

        str = str.replace(/<span .*?>(.*?)<\/span>/g, "") // Catch all for weird styling

        return this.cleanInput(str)
    }

    insertThread(board, thread) {
        let queryObject = this.getBoard(board)

        this.insertPosts(board, thread.posts)
    }

    insertPosts(board, posts) {
        let queryObject = this.getBoard(board)

        this.pool.getConnection().then((conn) => {
            let queries = []
            
            posts.forEach((post, i) => {
                let q = conn.execute(queryObject.insert, this.formatPostQuery(post, i))

                q.then(() => {
                    return this._insertMedia(post, conn, queryObject)
                })

                queries.push(q)
            })
            
            Promise.all(queries)
            .then(() => {
                return conn.release()
            })
            .catch((err) => {
                console.log(err)
                conn.release()
            })
        }).catch((err) => {
            console.log(err)
        })
    }

    _insertMedia(post, conn, queryObject) {
        if(post.getMediaOrig() || post.getPreviewOrig()) {
            return conn.execute(queryObject.selectMedia, this.formatSelectMedia(post))
            .then(([rows]) => {
                if(rows[0].banned) {
                    return
                }

                if(post.getMediaOrig()) {
                    queryObject.board.saveMedia(post)
                }

                if(post.getPreviewOrig()) {
                    queryObject.board.saveMedia(post, true)
                }

                return this._updateMedia(conn, post, rows[0], queryObject)
            })
        }
    }

    _updateMedia(conn, post, row, queryObject) {
        let q = []

        if(!row.media) 
            q.push(conn.execute(queryObject.updateMedia, [post.getMediaOrig(), post.getHash()]))

        if(!row.preview_reply)
            q.push(conn.execute(queryObject.updatePreview, [post.getPreviewOrig(), post.getHash()]))

        if(!row.preview_op) 
            q.push(conn.execute(queryObject.updatePreviewOp, [post.getPreviewOrig(), post.getHash()]))

        if(q.length > 0)
            return Promise.all(q)
    }

    formatMarkDeleted(post) {
        let p = []

        p.push(true)
        p.push(+ new Date())
        p.push(post.no)
        p.push(0)

        return p
    }

    markDeletedPosts(board, posts) {
        let queryObject = this.getBoard(board)

        this.pool.getConnection().then((conn) => {
            let queries = []
            
            posts.forEach((post, i) => {
                let q = conn.execute(queryObject.markDeleted, this.formatMarkDeleted(post))
                queries.push(q)
            })

            Promise.all(queries)
            .then(() => {
                return conn.commit()
            })
            .then(() => {
                return conn.release()
            })
            .catch((err) => {
                console.log(err)
                conn.release()
            })
        }).catch((err) => {
            console.log(err)
        })
    }
}

module.exports = Database;
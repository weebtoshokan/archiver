const mysql = require('mysql2/promise')
const HashMap = require('hashmap')
const util = require('util')
const Entities = require('html-entities').AllHtmlEntities;



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
            queueLimit: 0
        })
    }

    setupBoard(board) {
        if(!this.boardQueries.has(board)) {
            let queryObject = {}

            queryObject.insert = util.format(
                'INSERT INTO `%s` (poster_ip, num, subnum, thread_num, op, timestamp, preview_orig, preview_w, preview_h, media_filename, ' +
                'media_w, media_h, media_size, media_hash, media_orig, spoiler, deleted, capcode, email, name, trip, title, comment, delpass, ' +
                'sticky, locked, poster_hash, poster_country, exif) SELECT ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,? FROM DUAL ' +
                'WHERE NOT EXISTS (SELECT 1 FROM `%s` WHERE num = ? AND subnum = ?) AND NOT EXISTS (SELECT 1 FROM `%s` WHERE num = ? AND subnum = ?)',
                board, board, board + '_deleted')

            queryObject.markDeleted = util.format(
                'UPDATE `%s` SET deleted = ?, timestamp_expired = ? WHERE num = ? AND subnum = ?',
                board)
          

            this.boardQueries.set(board, queryObject)
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
        
        p.push('')
        p.push(post.getNum())
        p.push(0)
        p.push(post.getNum() == 0 ? post.getNum() : post.getReply())
        p.push(post.getReply() == 0)
        p.push(post.getTime()) //asagi appears to be subtracting 4 hours from the timestamp, investigate
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
        p.push('')
        p.push(this.cleanInput(post.getName()))
        p.push(post.getTrip())
        p.push(this.cleanInput(post.getSubject()))
        p.push(this.cleanComment(post.getComment()))
        p.push('')
        p.push(post.getSticky())
        p.push(post.getClosed())
        p.push(post.getId())
        p.push(post.getCountry())
        p.push('')
        p.push(post.getNum())
        p.push(0)
        p.push(post.getNum())
        p.push(0)

        return p
    }

    cleanComment(str) {
        if(!str)
            return null

        str = str.replace(/<br>/g, "\n")
        str = str.replace(/<a[^>]*>(.*?)<\/a>/g, "$1")
        str = str.replace(/<span class=\"quote\">(.*?)<\/span>/g, "$1")
        return this.cleanInput(str)
    }

    insertThread(board, thread) {
        let queryObject = this.getBoard(board)

        this.pool.getConnection().then((conn) => {
            let queries = []
            
            thread.posts.forEach((post, i) => {
                let q = conn.execute(queryObject.insert, this.formatPostQuery(post, i))
                queries.push(q)
            })

            /* Transactions were causing lots of deadlocks, wasting resources. We ditch them in favor
            of speed. I'm not convinced transactionless thread entry is any more dangerous, either. 
            */

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
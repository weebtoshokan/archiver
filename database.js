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
            connectionLimit: 10,
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
          

            console.log(queryObject.insert)

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
        const entities = new Entities()

        return entities.decode(str).trim()
    }

    formatPostQuery(post, index) {
        let p = []
        
        let ext = post.ext || ''

        let capcode = 'N'
        if(post.capcode && post.capcode.length >= 1) {
            capcode = post.substring(0, 1).toUpperCase()
        }

        let posterHash = post.id || ''
        if(posterHash == "Developer") 
            posterHash = "Dev";

        let posterCountry = post.country || ''
        if(posterCountry === "XX" || posterCountry === "A1") 
            posterCountry = '';

        p.push('')
        p.push(post.no)
        p.push(0)
        p.push(post.resto == 0 ? post.no : post.resto)
        p.push(post.resto == 0)
        p.push(post.time) //asagi appears to be subtracting 4 hours from the timestamp, investigate
        p.push(post.tim ? post.tim + 's.jpg' : '')
        p.push(post.tn_w || 0)
        p.push(post.tn_h || 0)
        p.push(post.filename ? post.filename + ext : '')
        p.push(post.w || 0)
        p.push(post.h || 0)
        p.push(post.fsize || 0)
        p.push(post.md5 || '')
        p.push(post.tim ? post.tim + ext : '')
        p.push(post.spoiler || 0)
        p.push(false)
        p.push(capcode)
        p.push('')
        p.push(this.cleanInput(post.name || ''))
        p.push(post.trip || '')
        p.push(this.cleanInput(post.sub || ''))
        p.push(this.cleanComment(post.com || ''))
        p.push('')
        p.push(post.sticky || 0)
        p.push(post.locked || 0)
        p.push(posterHash)
        p.push(posterCountry)
        p.push('')
        p.push(post.no)
        p.push(0)
        p.push(post.no)
        p.push(0)

        return p
    }

    cleanComment(str) {
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
                conn.rollback()
                conn.release()
            })
        }).catch((err) => {
            console.log(err)
        })
    }
}

module.exports = Database;
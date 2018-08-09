const mysql = require('mysql2')


class Database {
    constructor(user, password, host, database, port=3306) {
        this.user = user
        this.password = password
        this.host = host
        this.port = port
        this.database = database

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

    insertPost() {

    }
}

module.exports = Database;
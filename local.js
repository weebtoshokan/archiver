const fs = require('fs')
const path = require('path')
const util = require('util')


let Local = {
    mkdir(dir) {
        //This code was designed by an egyptian but at least the rest is ok
        dir = path.normalize(dir)
        let dirs = dir.split(path.sep)
        let q = []
        for(let i = 0; i < dirs.length; i++) {
            let curPath = path.join(...dirs.slice(0, i+1))
            q.push(() => {
                return new Promise((resolve, reject) => {
                    fs.mkdir(curPath, (err) => {
                        if(err) {
                            switch(err.code) {
                                case 'ENOENT':
                                    reject();
                                    break;
                                case 'EEXIST':
                                    resolve()
                                    break;
                                case 'EACCES':
                                case 'EPERM':
                                    reject();
                                    break;
                            }
                        } else {
                            resolve();
                        }
                    })
                })
            })
        }

        return q.reduce((acc, cur) => {
            return acc.then(cur)
        }, q.shift()())
    },

    checkExists(file) {
        return new Promise((resolve, reject) => {
            fs.access(file, fs.constants.F_OK, (err) => {
                if(err) {
                    resolve(false)
                } else {
                    resolve(true)
                }
            })
        })
    },

    getFileDir(file) {
        let group1 = file.substring(0,4)
        let group2 = file.substring(4,6)

        let path = util.format('%s/%s/%s', group1, group2, file)
        return path
    },

    mvFile(oldFile, newFile) {
        return new Promise((resolve, reject) => {
            fs.rename(oldFile, newFile, (err) => {
                if(err) {
                    reject()
                } else {
                    resolve()
                }
            })
        })
    },

    readFile(file) {
        return new Promise((resolve, reject) => {
            fs.readFile(file, (err, data) => {
                if(err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }

}

module.exports = Local
const util = require('util')
const request = require('request')
const network = require('./network')
const HashMap = require('hashmap')
const Thread = require('./thread')

class Board {
	constructor(name, database) {
		this.name = name;
		this.database = database;
		database.setupBoard(name)
		this.threads = new HashMap();
	}
	
	getAllThreadsLink() {
		return util.format("https://a.4cdn.org/%s/threads.json", this.name)
	}
	
	getThreadLink(threadID) {
		return util.format("https://a.4cdn.org/%s/thread/%s.json", this.name, threadID)
	}
	
	setLastModified(date) {
		this.lastModified = date
	}
	
	getLastModified() {
		return this.lastModified
	}

	getThreads() {
		return this.threads
	}
	
	requestAllThreads() {
		let opt = {
			url: this.getAllThreadsLink(),
			localAddress: network.getNextAddress(),
			headers: {
				
			}
		}
		
		if(this.getLastModified())
			opt.headers['If-Modified-Since'] = this.getLastModified()
		
		return new Promise((resolve, reject) => {
			request.get(opt, (error, response, body) => {
				if(error) {
					reject(error)
				} else {
					resolve([response, body])
				}
			})
		}).then(([response, body]) => {
			if(response.headers['last-modified'])
				this.setLastModified(response.headers['last-modified'])

			let threadListObject = {}
			threadListObject.statusCode = response.statusCode
			threadListObject.noUpdate = false
			
			if(response.statusCode == 200) {
				threadListObject.list = JSON.parse(response.body)
			} else if(response.statusCode == 304) {
				threadListObject.noUpdate = true
			} else {
				throw new Error("HTTP Request failed. Status code " + response.statusCode)
			}

			return threadListObject
		}).then((obj) => {
			let list = []
			obj.list.forEach((threadList) => {
				threadList['threads'].forEach((thread) => {
					thread.page = threadList.page
					Object.setPrototypeOf(thread, Thread.prototype)
					list.push(thread)
				})
			})
			obj.list = list
			return obj
		}).catch((err) => {
			console.log(err)
		})
	}

	requestThread(thread) {
		let opt = {
			url: this.getThreadLink(thread.getNum()),
			localAddress: network.getNextAddress(),
			headers: {

			}
		}

		if(thread.getLastMod())
			opt.headers['If-Modified-Since'] = this.getLastMod()

		return new Promise((resolve, reject) => {
			request.get(opt, (error, response, body) => {
				if(error) {
					reject(error)
				} else {
					resolve([response, body])
				}
			})
		}).then(([response, body]) => {
			if(response.headers['last-modified'])
				thread.setLastMod(response.headers['last-modified'])
			
			let responseObject = {
				code: response.statusCode
			}
			if(response.statusCode == 200) {
				let threadObject = JSON.parse(response.body)
				responseObject.posts = threadObject.posts
			} else if( !(response.statusCode == 304 || response.statusCode == 404) ) {
				throw new Error("HTTP Request failed. Status code " + response.statusCode)
			}
			return responseObject;
		}).catch((err) => {
			console.log(err)
		})
	}

	setupThread(thread) {
		if(!this.threads.has(thread.no)) {
			this.threads.set(thread.no, thread)
		} else {
			throw new Error(util.format("Duplicate thread %s in board %s", thread.no, this.name))
		}
	}

	insertThread(thread) {
		if(!this.threads.has(thread.no))
			throw new Error(util.format("Thread %s in board %s inserted but not setup.". thread.no, this.name))

		this.database.insertThread(this.name, thread)
	}

	markDeleted(thread, forced) {
		if(!this.threads.has(thread.no))
			throw new Error(util.format("Thread %s in board %s double free. ". thread.no, this.name))

		if(forced) {
			this.database.markDeletedThread(this.name, thread)
		}

		this.threads.remove(thread.no)
	}
}

module.exports = Board;
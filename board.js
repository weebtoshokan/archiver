const util = require('util')
const request = require('request')
const network = require('./network')
const HashMap = require('hashmap')
const Thread = require('./thread')

class Board {
	constructor(name, database) {
		this.name = name;
		this.database = database;
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
			
			if(response.statusCode == 200) {
				return JSON.parse(response.body)
			} else if(response.statusCode == 304) {
				return []
			} else {
				throw new Error("HTTP Request failed. Status code " + response.statusCode)
			}
		}).then((obj) => {
			let list = []
			obj.forEach((threadList) => {
				threadList['threads'].forEach((thread) => {
					thread.page = threadList.page
					Object.setPrototypeOf(thread, Thread.prototype)
					list.push(thread)
				})
			})
			return list
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

	insertThread(thread) {
		
	}
}

module.exports = Board;
const util = require('util')
const request = require('request')
const network = require('./network')
const HashMap = require('hashmap')
const Thread = require('./thread')
const Post = require('./post')
const local = require('./local')
const path = require('path')
const fs = require('fs')
const Bottleneck = require('bottleneck')

const queue = new Bottleneck({
    maxConcurrent: 40,
    minTime: 200
});

class Board {
	constructor(name, database) {
		this.name = name;
		this.database = database;
		database.setupBoard(this)
		this.threads = new HashMap();
	}

	getName() {
		return this.name
	}
	
	getAllThreadsLink() {
		return util.format("https://a.4cdn.org/%s/threads.json", this.name)
	}
	
	getThreadLink(threadID) {
		return util.format("https://a.4cdn.org/%s/thread/%s.json", this.name, threadID)
	}

	getMediaLink(file) {
		return util.format("https://i.4cdn.org/%s/%s", this.name, file)
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
			threadListObject.list = []
			
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
			opt.headers['If-Modified-Since'] = thread.getLastMod()

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
				responseObject.posts = threadObject.posts.map((post) => new Post(post))
			} else if(response.statusCode == 304 || response.statusCode == 404) {
				responseObject.noPosts = true
			} else {
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
			this.database.markDeletedPosts(this.name, thread.getPosts())
		}

		this.threads.remove(thread.no)
	}

	diffPost(lhs, rhs) {
		return false
	}

	updateThread(oldThread) {
		let oldThreadMap = new HashMap()
		let newPosts = []
		let updatedPosts = []
		let deletedPosts = []

		oldThread.getPosts().forEach((post) => {
			oldThreadMap.set(post.getNum(), post)
		})

		this.requestThread(oldThread)
		.then((newThread) => {
			if(newThread.noPosts) {
				console.log('[Debug] Thread had no posts!')
				console.log(newThread.code)
				return
			}

			newThread.posts.forEach((post) => {
				if(oldThreadMap.has(post.getNum())) {
					if(this.diffPost(post, oldThreadMap.get(post.getNum())))
						updatedPosts.append(post)
					
					oldThreadMap.remove(post.getNum())
				} else {
					newPosts.push(post)
				}
			})

			oldThreadMap.forEach((deletedPost) => {
				deletedPosts.append(deletedPost)
			})
			console.log(newPosts)
			this.database.markDeletedPosts(this.name, deletedPosts)
			this.database.insertPosts(this.name, newPosts)
			//this.database.updatePosts(this.name, updatedPosts)
		})
	}

	async saveMedia(post, preview) {
		let name = preview ? post.getPreviewOrig() : post.getMediaOrig()
		let link = this.getMediaLink(name)
		let folder = preview ? "thumb" : "image"
		let imgPath = local.getFileDir(name)

		let file = path.join('tempConfig', 'boards', this.name, folder, imgPath)
		let tmpFile = path.join('tempConfig', 'boards', this.name, 'tmp', name)
		let exists = await local.checkExists(file)

		if(exists)
			return;

		await local.mkdir(path.dirname(tmpFile))

		await queue.schedule(() => {
			return new Promise((resolve, reject) => {
				let stream = fs.createWriteStream(tmpFile, {encoding:'binary', flag:'w'})
				request.get(link)
				.on('error', (err) => {
					console.log(err)
					reject()
				})
				.on('response', (response) => {
					if(response.statusCode == 404) {
						//Not found
						console.log(response.statusCode)
						this.abort()
					} else if(response.statusCode != 200) {
						//Error, requeue?
						console.log(response.statusCode)
						this.abort()
					}
				})
				.pipe(stream)
				.on('error', (err) => {
					console.log(err)
					reject()
				}).on('finish', () => {
					resolve()
				})
			})
		})

		await local.mkdir(path.dirname(file))

		await local.mvFile(tmpFile, file)
	}
}

module.exports = Board;
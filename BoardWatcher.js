const HashMap = require('hashmap')
const config = require('./config')

class BoardWatcher {
	constructor(arr) {
		this.boards = arr
	}
	
	poll() {
		this.boards.forEach((board) => {
			board.requestAllThreads()
			.then((obj) => {
				this.processThreads(board, obj)
			})
		})
		
		
		setTimeout(()=> this.poll(), config.ratelimit.indexDelay)
	}
	
	start() {
		this.poll()
	}

	processThreads(board, threadListObject) {
		if(threadListObject.noUpdate)
			return

		let oldThreads = board.getThreads()

		let threadMap = new HashMap()
		let threadList = threadListObject.list

		threadList.forEach((val, key) => {
			threadMap.set(val.no, val)
		})

		oldThreads.forEach((oldThread) => {
			let newThread = threadMap.get(oldThread.no)

			if(newThread) {
				if(newThread.getModified() !== oldThread.getModified() && oldThread.getLastReq() < newThread.getModified()) {
					board.updateThread(oldThread)
				}

				oldThread.setModified(newThread.getModified())
				oldThread.setPage(newThread.getPage())
				threadMap.remove(oldThread.no)
			} else {
				// Thread was deleted
				let forced = oldThread.getPage() < config.misc.fallThreshold;
				board.markDeleted(oldThread, forced)
			}
		})

		threadMap.forEach((newThread) => {
			// New Thread
			board.setupThread(newThread)
			board.requestThread(newThread).then((threadRequest) => {
				if(threadRequest.statusCode == 404) {
					//We missed it?
					board.markDeleted(newThread)
					return
				}

				newThread.setPosts(threadRequest.posts)
				board.insertThread(newThread)
			})
			
		})
	}
}

module.exports = BoardWatcher
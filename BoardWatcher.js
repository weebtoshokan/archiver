const HashMap = require('hashmap')

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
		
		
		setTimeout(()=> this.poll(), 10000)
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

		oldThreads.forEach((val) => {
			let newThread = threadMap.get(val.no)

			if(newThread) {
				if(newThread.getModified() !== val.getModified()) {
					// Thread updated
				}

				val.setModified(newThread.getModified())
				val.setPage(newThread.getPage())
				threadMap.remove(val.no)
			} else {
				// Thread was deleted
				let forced = val.getPage() < 10;
				board.markDeleted(val, forced)
			}
		})

		threadMap.forEach((val) => {
			// New Thread
			board.setupThread(val)
			board.requestThread(val).then((threadRequest) => {
				if(threadRequest.statusCode == 404) {
					//We missed it?
					return
				}

				val.setPosts(threadRequest.posts)
				board.insertThread(val)
			})
			
		})
	}
}

module.exports = BoardWatcher
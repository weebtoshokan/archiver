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
			let exists = threadMap.has(val.no)
			if(exists && threadMap.get(val.no).last_modified !== val.last_modified) {
				// Thread updated
			}
			
			if(!exists) {
				// Thread was deleted
				let forced = val.getPage() < 10;
				board.markDeleted(thread, forced)
			}

			if(exists)
				threadMap.remove(val.no)
		})

		threadMap.forEach((val) => {
			// New Thread
			board.setupThread(val)
			board.requestThread(val).then((threadRequest) => {
				if(threadRequest.statusCode == 404) {
					//We missed it?
					return
				}

				val.posts = threadRequest.posts
				board.insertThread(val)
			})
			
		})
	}
}

module.exports = BoardWatcher
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
		
		
		setTimeout(()=> this.poll(), 1000)
	}
	
	start() {
		this.poll()
	}

	processThreads(board, threadList) {
		let oldThreads = board.getThreads()

		let threadMap = new HashMap()

		threadList.forEach((val, key) => {
			threadMap.set(val.no, val)
		})

		oldThreads.forEach((val) => {
			let exists = threadMap.has(val.no)
			if(exists && threadMap.get(val.no).last_modified !== val.last_modified) {
				// Thread updated
				threadMap.remove(val.no)
			}
			
			if(!exists) {
				// Thread was deleted
				let forced = val.getPage() < 10;

				threadMap.remove(val.no)
			}
		})

		threadMap.forEach((val) => {
			// New Thread
			board.requestThread(val).then((obj) => {

			})
			
		})
	}
	
}

module.exports = BoardWatcher
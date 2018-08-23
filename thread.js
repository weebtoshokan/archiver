class Thread {
	constructor(thread) {
		this.posts = []
		this.lastRequest = 0
		
		for(let key in thread) {
            this[key] = thread[key]
        }
	}

	getLastReq() {
		return this.lastRequest
	}

	ping() {
		this.lastRequest = Math.round(+new Date()/1000)
	}

	setPosts(posts) {
		this.posts = posts
	}

	getPosts() {
		return this.posts
	}

	getModified() {
		return this.last_modified
	}

	setModified(modified) {
		this.last_modified = modified
	}

	getPage() {
		return this.page
	}

	setPage(page) {
		this.page = page
	}

	setLastMod(mod) {
		this.lastMod = mod
	}

	getLastMod() {
		return this.lastMod
	}

	getNum() {
		return this.no
	}
}

module.exports = Thread
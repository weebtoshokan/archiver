class Thread {
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
}

module.exports = Thread
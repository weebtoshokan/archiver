const config = require('./config')

let curAddress = 0
let len = config.address.list.length

let Network = {
	getNextAddress() {
		if(!config.address.rotate)
			return null

		let ret = config.address.list[curAddress]
		curAddress = ++curAddress % len
		return ret
	}
}

module.exports = Network
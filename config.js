let config = {}

config.database = {}
config.proxy = {}
config.ratelimit = {}
config.path = {}
config.misc = {}

config.database.host = '127.0.0.1'
config.database.port = 3306
config.database.username = 'test'
config.database.password = 'test'
config.database.name = 'test'

config.proxy.rotate = false // Enable this to rotate through a list of ip addresses for requests
config.proxy.list = 'proxy.txt' // Proxy list

config.ratelimit.concurrentImageRequests = 50 // Number of image requests that can be running at once
config.ratelimit.concurrentThreadRequests = 20 // Number of thread requests that can be runnign at once
config.ratelimit.imageDelay = 200 // Delay between image requests, in ms
config.ratelimit.threadDelay = 1000 // Delay between thread requests, in ms
config.ratelimit.indexDelay = 10000 // Delay between thread index requests, in ms

config.path.saveDir = 'tempConfig' // Where images are saved

config.misc.fallThreshold = 8 // If a thread disappears before this page, it is considered deleted
config.misc.archiveImages = true // Should we archive images?
config.misc.archiveThumbs = true // Should we archive thumbs?

// Boards to archive
config.boards = [
	'tg'
]

module.exports = config
const vm = require('vm')
const util = require('util')
const requests = require('request')
const url = require('url')
const fs = require('fs')

let jar = requests.jar()

class CFSolver {
    constructor() {
        this.cf_useragent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/68.0.3440.106 Safari/537.36'
    }

    isChallenge(response) {
        
        if(response.statusCode != 503)
            return false

        if(!response.headers['server'] || !response.headers['server'].startsWith('cloudflare'))
            return false
            
        if(!response.body || !response.body.includes('jschl_vc') || !response.body.includes('jschl_answer'))
            return false

        return true
    }

    sendChallengeRes(response) {
        if(!this.isChallenge(response))
            return

        return this.sendChallenge(response.request.uri.href, response.body)
    }
	
	sendChallenge(res) {
        let urlText = res.request.uri
        let body = res.body

        if(!this.isChallenge(res))
            return Promise.resolve({})

        let info = url.parse(urlText)
        let endpoint = util.format("%s//%s/cdn-cgi/l/chk_jschl", info.protocol, info.host)
        
        let vc = body.match(/name="jschl_vc" value="(\w+)"/)[1]
        let pass = body.match(/name="pass" value="(.+?)"/)[1]
        let answer = this.solveChallenge(body, info.host)
        
        return new Promise((resolve, reject) => {
            setTimeout(() => resolve(), 8000)
        }).then(() => new Promise((resolve, reject) => {
            let opt = {
                url: endpoint,
                headers: {
                    'User-Agent': this.cf_useragent,
                    'Accept': '*/*',
                    'referer': urlText
                },
                followRedirect: false,
                qs: {
                    'jschl_answer':answer,
                    'jschl_vc':vc,
                    'pass':pass
                },
                jar: jar
            }

            requests.get(opt, (err, res, body) => {
                if(err) {
                    reject(err)
                } else {
                    resolve(res)
                }
            })
        })).then((res) => {
            if(res.statusCode == 503 || !res.headers['set-cookie'])
                return new Promise((resolve, reject) => {
                    let opt = {
                        url: urlText,
                        headers: {
                            'Accept': '*/*',
                            'User-Agent': this.cf_useragent
                        },
                        jar: jar
                    }
                    requests.get(opt, (err, res, body) => {
                        if(err) {
                            reject();
                            return;
                        }
                        resolve(res)
                    })
                }).then((res) => this.sendChallenge(urlText, res.body))
            return res
        })
	}

    solveChallenge(body, domain) {
        let error = "CF Parse error. Did cloudflare update their intercept page?"
        let js = body.match(/setTimeout\(function\(\){\s+(var s,t,o,p,b,r,e,a,k,i,n,g,f.+?\r?\n[\s\S]+?a\.value =.+?)\r?\n/)

        if(!js || !js[1])
            throw Error(error)

        js = js[1]

        js = js.replace(/a\.value = (.+ \+ t\.length).+/, "$1")
        js = js.replace(/\s{3,}[a-z](?: = |\.).+/g, "")
        js = js.replace("t.length", domain.length.toString())
        js = js.replace(/[\n\\']/g, "")

        if(!js.includes('toFixed'))
            throw Error(error)

        let output = parseFloat(vm.runInNewContext(js, {}, {timeout:5000}))

        return output
    }
}

module.exports = CFSolver
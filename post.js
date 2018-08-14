class Post {
    constructor(obj) {
        this.no = 0
        this.resto = 0
        this.time = 0
        this.tim = 0
        this.tn_w = 0
        this.tn_h = 0
        this.filename = null
        this.w = 0
        this.h = 0
        this.fsize = 0
        this.md5 = null
        this.ext = null
        this.spoiler = 0
        this.capcode = null
        this.name = null
        this.sub = null
        this.com = null
        this.trip = null
        this.sticky = 0
        this.closed = 0
        this.archived = 0
        this.id = null
        this.country = null
        this.filedeleted = 0

        this.mediaFileName = null
        this.mediaOrig = null
        this.previewOrig = null

        for(let key in obj) {
            this[key] = obj[key]
        }

        if(this.getFileName() && this.getExt()) {
            this.mediaFileName = this.getFileName() + this.getExt()
            this.mediaOrig = this.getTim() + this.getExt()
            this.previewOrig = this.getTim() + "s.jpg"
        }

        if(this.getCountry() === "XX" || this.getCountry() === "A1")  {
            this.country = null
        }

        if(this.getId() === "Developer")
            this.id = "Dev"

        if(this.capcode && this.capcode.length >= 1) {
            this.capcode = this.capcode.substring(0, 1).toUpperCase()
        } else {
            this.capcode = 'N'
        }
    }

    getMediaFileName() {
        return this.mediaFileName
    }

    getMediaOrig() {
        return this.mediaOrig
    }

    getPreviewOrig() {
        return this.previewOrig
    }

    getNum() {
        return this.no
    }

    getReply() {
        return this.resto
    }

    getTime() {
        return this.time
    }

    getTim() {
        return this.tim
    }

    getPreviewW() {
        return this.tn_w
    }

    getPreviewH() {
        return this.tn_h
    }

    getMediaW() {
        return this.w
    }

    getMediaH() {
        return this.h
    }

    getSize() {
        return this.fsize
    }

    getFileName() {
        return this.filename
    }

    getHash() {
        return this.md5
    }

    getExt() {
        return this.ext
    }

    getSpoiler() {
        return this.spoiler
    }

    getClosed() {
        return this.closed
    }

    getArchived() {
        return this.archived
    }

    getCapcode() {
        return this.capcode
    }

    getName() {
        return this.name
    }

    getSubject() {
        return this.subject
    }

    getComment() {
        return this.com
    }

    getTrip() {
        return this.trip
    }

    getId() {
        return this.id
    }

    getCountry() {
        return this.country
    }

    getDeleted() {
        return this.filedeleted
    }
}

module.exports = Post
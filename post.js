class Post {
    constructor(obj) {
        this.no = 0
        this.resto = 0
        this.time = 0
        this.tim = 0
        this.tn_w = 0
        this.tn_h = 0
        this.filename = ''
        this.w = 0
        this.h = 0
        this.fsize = 0
        this.md5 = ''
        this.ext = ''
        this.spoiler = 0
        this.capcode = ''
        this.name = ''
        this.sub = ''
        this.com = ''
        this.trip = ''
        this.sticky = 0
        this.closed = 0
        this.archived = 0
        this.id = ''
        this.country = ''
        this.filedeleted = 0

        for(let key in obj) {
            this[key] = obj[key]
        }
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
class Parser {
    constructor() {
        this.ASTRoot = null
        this.tokens = null
    }

    run(tokens) {
        this.tokens = tokens
        this.ASTRoot = new ASTNode()

        for (let i = 0, len = this.tokens.length; i < len; i++) {
            let node = this.parseToken(i)
        }

        return this.ASTRoot
    }

    parseToken(index) {
        let token = this.tokens[index]

        if (token.name === "number") {
            return new ASTNumberNode(token)
        } 
    }

    log() {
        console.log('')
        console.log('%cParser', 'font-size: 14px; background: #444; padding:2px 10px; color: #fff;')
        console.log(this.ASTRoot)
    }
}


class ASTNode {
    constructor(token) {
        this.token = token
    }
}

class ASTNumberNode extends ASTNode {
    constructor(token) {
        super(token)
    }
}

class ASTStringNode extends ASTNode {
    constructor(token) {
        super(token)
    }
}

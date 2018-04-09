class Lexer {
    constructor() {
        this.tokens = []
        this.TOKEN_LIST = [
            {
                name: 'add',
                regex: /\+/
            }, {
                name: 'substract',
                regex: /\-/
            }, {
                name: 'multiply',
                regex: /\*/
            }, {
                name: 'divide',
                regex: /\//
            }, {
                name: 'assign',
                regex: /=/
            }, {
                name: 'id',
                regex: /[a-z]+/
            }, {
                name: 'number',
                regex: /[0-9]+\.*[0-9]*/
            }
        ]
    }

    run(text) {
        let lines = text.split('\n')

        for (let line of lines) {
            let str = line.trim()

            let i = 0
            while(str.length) {
                let nextToken = this.nextTokenInString(str)
                this.tokens.push(nextToken)

                str = str.substring(nextToken.value.length)
                str = str.trim()

                if (++i > 1000) {
                    console.log('Unknown symbols: '+str)
                    throw new Error('Infinite loop')
                }
            }

            /*tokens.push({
                value: '-----------',
                name: 'newline'
            })*/
        }

        return this.tokens
    }

    nextTokenInString(str) {
        for (let token of this.TOKEN_LIST) {
            if (str.search(token.regex) === 0) {
                let tokenText = str.match(token.regex)[0]
                return {
                    value: tokenText,
                    name: token.name
                }
            }
        }
    }

    log() {
        console.log('%cLexer', 'font-size: 14px; background: #444; padding:2px 10px; color: #fff;')
        console.table(this.tokens, ['name', 'value'])
    }
}

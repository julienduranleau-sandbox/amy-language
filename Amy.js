class Amy {
    static compile(file) {
        let lexer = new Lexer()
        let parser = new Parser()
        let emitter = new Emitter()

        fetch(file).then(f=>f.text()).then(text => {
            let tokens = lexer.run(text)
            let ast = parser.run(tokens)
            let actionTree = emitter.run(ast)

            lexer.log()
            parser.log()
            emitter.log()
        })
    }
}

Amy.compile('samples/wip.amy')
